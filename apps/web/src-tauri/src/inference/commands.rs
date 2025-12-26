//! Tauri commands for inference operations
//!
//! Implements Tauri commands that expose Kalosm inference to the frontend.
//! Reference: stack-knowledge/kalosm/language-model/docs/completion.md

use super::state::{InferenceState, ModelStatus};
use futures_util::StreamExt;
use kalosm::language::{Llama, TextCompletionModelExt};
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

/// Load model - use Llama::new_chat() for chat-optimized model
/// AC3: Model loads within 10 seconds
///
/// Reference: stack-knowledge/kalosm/kalosm/docs/language.md
#[tauri::command]
pub async fn load_model(
    state: State<'_, Arc<InferenceState>>,
    _model_name: String,
) -> Result<(), InferenceError> {
    // Check if already loaded
    if state.is_loaded().await {
        return Ok(());
    }

    state.set_status(ModelStatus::Loading).await;

    // Use Phi-3 for smaller, faster model (~2GB vs ~6GB for Llama 3)
    // Reference: stack-knowledge/kalosm/kalosm/examples/phi-3.rs
    match Llama::phi_3().await {
        Ok(model) => {
            let mut model_guard = state.model.write().await;
            *model_guard = Some(model);
            state.set_status(ModelStatus::Loaded).await;
            log::info!("Model loaded successfully");
            Ok(())
        }
        Err(e) => {
            state.set_status(ModelStatus::Error).await;
            let error_msg = e.to_string();
            log::error!("Failed to load model: {}", error_msg);

            // Check for OOM errors
            if error_msg.contains("memory") || error_msg.contains("OOM") {
                Err(InferenceError::oom_error(&error_msg))
            } else {
                Err(InferenceError::model_load_failed(&error_msg))
            }
        }
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
    let model = match model_guard.as_ref() {
        Some(m) => m,
        None => {
            state.set_status(ModelStatus::Unloaded).await;
            return Err(InferenceError::model_not_loaded());
        }
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
            log::error!("Failed to emit token: {}", e);
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
#[tauri::command]
pub async fn get_model_status(
    state: State<'_, Arc<InferenceState>>,
) -> Result<ModelStatus, InferenceError> {
    Ok(state.get_status().await)
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
