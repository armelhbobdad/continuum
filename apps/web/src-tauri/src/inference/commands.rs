//! Tauri commands for inference operations
//!
//! Implements Tauri commands that expose Kalosm inference to the frontend.
//! Reference: stack-knowledge/kalosm/language-model/docs/completion.md
//!
//! Story 2.4: Updated to load models from local downloads directory
//! using FileSource::Local instead of hardcoded Llama::phi_3().

use super::state::{InferenceState, ModelStatus};
use crate::downloads::DownloadState;
use futures_util::StreamExt;
use kalosm::language::{FileSource, Llama, LlamaSource, TextCompletionModelExt};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

/// Token payload for streaming events
#[derive(Clone, serde::Serialize)]
pub struct TokenPayload {
    pub text: String,
}

/// Error codes for user-friendly messages
/// Mapped to INFERENCE_ERROR_MESSAGES in TypeScript
/// Note: All variants required to match TypeScript API contract
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[allow(dead_code)] // Variants used for API contract with TypeScript
pub enum InferenceErrorCode {
    ModelNotFound,
    OomError,
    InferenceTimeout,
    GenerationAborted,
    ModelLoadFailed,
    UnknownError,
}

/// Structured error response with user-friendly message
#[derive(Debug, Clone, serde::Serialize)]
pub struct InferenceError {
    pub code: InferenceErrorCode,
    pub message: String,
    pub details: Option<String>,
}

impl InferenceError {
    pub fn model_load_failed(details: &str) -> Self {
        Self {
            code: InferenceErrorCode::ModelLoadFailed,
            message: "Couldn't load the model. Please restart and try again.".to_string(),
            details: Some(details.to_string()),
        }
    }

    pub fn model_not_loaded() -> Self {
        Self {
            code: InferenceErrorCode::ModelNotFound,
            message: "Model not loaded. Please wait for it to load first.".to_string(),
            details: None,
        }
    }

    pub fn model_not_found(model_id: &str) -> Self {
        Self {
            code: InferenceErrorCode::ModelNotFound,
            message: format!("Model '{model_id}' not found. Please download it first."),
            details: Some(format!("Model file not found for ID: {model_id}")),
        }
    }

    pub fn oom_error(details: &str) -> Self {
        Self {
            code: InferenceErrorCode::OomError,
            message: "Not enough memory for this model. Try a smaller model.".to_string(),
            details: Some(details.to_string()),
        }
    }

    #[allow(dead_code)]
    pub fn generation_aborted() -> Self {
        Self {
            code: InferenceErrorCode::GenerationAborted,
            message: "Generation stopped.".to_string(),
            details: None,
        }
    }

    #[allow(dead_code)] // Reserved for future error handling paths
    pub fn unknown_error(details: &str) -> Self {
        Self {
            code: InferenceErrorCode::UnknownError,
            message: "Something went wrong. Please try again.".to_string(),
            details: Some(details.to_string()),
        }
    }
}

/// Load model from local downloads directory
/// Story 2.4: Updated to load downloaded models using FileSource::Local
/// AC3: Model loads within 10 seconds
///
/// # Arguments
/// * `model_id` - The model identifier (e.g., "phi-3-mini")
///
/// File structure:
/// ```
/// models/{model_id}/
///   model.gguf       <- main model weights
///   tokenizer.json   <- tokenizer for the model
/// ```
/// Both files are downloaded together by the download manager (Story 2.3).
#[tauri::command]
pub async fn load_model(
    state: State<'_, Arc<InferenceState>>,
    download_state: State<'_, DownloadState>,
    model_id: String,
) -> Result<(), InferenceError> {
    // Unload any existing model first (ADR-MODEL-002)
    {
        let mut model_guard = state.model.write().await;
        if model_guard.is_some() {
            *model_guard = None;
            log::info!("Unloaded previous model before loading new one");
        }
    }

    state.set_status(ModelStatus::Loading).await;

    // Resolve model directory path
    let model_dir = download_state.models_dir().join(&model_id);

    // Resolve model file path (Task 1.3)
    let model_path = model_dir.join("model.gguf");

    // Verify model exists before loading (Task 1.6)
    if !model_path.exists() {
        state.set_status(ModelStatus::Error).await;
        log::error!("Model file not found: {}", model_path.display());
        return Err(InferenceError::model_not_found(&model_id));
    }

    // Resolve tokenizer path (downloaded alongside model by Story 2.3)
    let tokenizer_path = model_dir.join("tokenizer.json");

    // Verify tokenizer exists
    if !tokenizer_path.exists() {
        state.set_status(ModelStatus::Error).await;
        log::error!("Tokenizer file not found: {}", tokenizer_path.display());
        return Err(InferenceError::model_load_failed(&format!(
            "Tokenizer not found for {model_id}. Please re-download the model."
        )));
    }

    log::info!("Loading model from: {}", model_path.display());
    log::info!("Loading tokenizer from: {}", tokenizer_path.display());

    // Load model from local path using FileSource::Local
    // Both model and tokenizer are local files managed by the app
    let source = LlamaSource::new(FileSource::Local(model_path.clone()))
        .with_tokenizer(FileSource::Local(tokenizer_path.clone()));

    match Llama::builder().with_source(source).build().await {
        Ok(model) => {
            let mut model_guard = state.model.write().await;
            *model_guard = Some(model);
            state.set_status(ModelStatus::Loaded).await;
            log::info!("Model loaded successfully: {model_id}");
            Ok(())
        },
        Err(e) => {
            state.set_status(ModelStatus::Error).await;
            let error_msg = e.to_string();
            log::error!("Failed to load model {model_id}: {error_msg}");

            // Check for OOM errors
            if error_msg.contains("memory") || error_msg.contains("OOM") {
                Err(InferenceError::oom_error(&error_msg))
            } else {
                Err(InferenceError::model_load_failed(&error_msg))
            }
        },
    }
}

/// Generate text with streaming via Tauri events
/// AC2: First token within 2 seconds (warm)
/// AC5: Generation rate >= 10 tokens/second
///
/// Reference: stack-knowledge/kalosm/language-model/docs/completion.md
#[tauri::command]
pub async fn generate(
    app: AppHandle,
    state: State<'_, Arc<InferenceState>>,
    prompt: String,
    _max_tokens: Option<usize>,
) -> Result<(), InferenceError> {
    // Reset abort flag
    state.reset_abort().await;
    state.set_status(ModelStatus::Generating).await;

    // Get model - need to hold the lock for the entire generation
    let model_guard = state.model.read().await;
    let Some(model) = model_guard.as_ref() else {
        state.set_status(ModelStatus::Unloaded).await;
        return Err(InferenceError::model_not_loaded());
    };

    // Use .complete(prompt) which returns a stream
    // Iterate with while let Some(token) = stream.next().await
    // The stream yields String tokens directly
    let mut stream = model.complete(&prompt);

    while let Some(token) = stream.next().await {
        // Check abort flag before emitting each token
        if state.is_abort_requested().await {
            log::info!("Generation aborted");
            app.emit("inference:complete", ()).ok();
            state.set_status(ModelStatus::Loaded).await;
            return Ok(());
        }

        // Emit token to frontend via Tauri event
        let payload = TokenPayload { text: token };
        if let Err(e) = app.emit("inference:token", payload) {
            log::error!("Failed to emit token: {e}");
        }
    }

    app.emit("inference:complete", ()).ok();
    state.set_status(ModelStatus::Loaded).await;
    log::info!("Generation completed");
    Ok(())
}

/// Abort ongoing generation by setting flag (checked in generate loop)
/// AC4: Inference stops immediately on abort
#[tauri::command]
pub async fn abort_inference(state: State<'_, Arc<InferenceState>>) -> Result<(), InferenceError> {
    state.request_abort().await;
    log::info!("Abort requested");
    Ok(())
}

/// Check if model is loaded
/// Uses is_loaded() to verify status accuracy
#[tauri::command]
pub async fn get_model_status(
    state: State<'_, Arc<InferenceState>>,
) -> Result<ModelStatus, InferenceError> {
    let status = state.get_status().await;

    // Verify status matches actual model state
    // Status could get out of sync if model was dropped unexpectedly
    match (&status, state.is_loaded().await) {
        (ModelStatus::Loaded | ModelStatus::Generating, false) => {
            // Status says loaded but model is gone - correct it
            state.set_status(ModelStatus::Unloaded).await;
            Ok(ModelStatus::Unloaded)
        },
        _ => Ok(status),
    }
}

/// Unload model and release resources
/// AC4: GPU/RAM released within 30 seconds
#[tauri::command]
pub async fn unload_model(state: State<'_, Arc<InferenceState>>) -> Result<(), InferenceError> {
    let mut model_guard = state.model.write().await;
    *model_guard = None;
    state.set_status(ModelStatus::Unloaded).await;
    log::info!("Model unloaded");
    Ok(())
}
