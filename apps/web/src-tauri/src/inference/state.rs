//! Model state management for inference
//!
//! Manages model lifecycle and generation state across Tauri commands.
//! Reference: stack-knowledge/kalosm/language-model/docs/chat.md

use kalosm::language::Llama;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Model status for UI state management
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ModelStatus {
    /// No model loaded
    Unloaded,
    /// Model is being loaded
    Loading,
    /// Model is loaded and ready
    Loaded,
    /// Model is generating
    Generating,
    /// Error occurred
    Error,
}

/// Inference state managed by Tauri
/// Uses Arc<RwLock> for safe concurrent access across async commands
pub struct InferenceState {
    /// The loaded model instance
    pub model: RwLock<Option<Llama>>,
    /// Flag to signal abort to the generation loop
    pub abort_flag: RwLock<bool>,
    /// Current model status
    pub status: RwLock<ModelStatus>,
}

impl Default for InferenceState {
    fn default() -> Self {
        Self {
            model: RwLock::new(None),
            abort_flag: RwLock::new(false),
            status: RwLock::new(ModelStatus::Unloaded),
        }
    }
}

impl InferenceState {
    /// Create a new inference state wrapped in Arc for Tauri state management
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    /// Check if model is loaded
    pub async fn is_loaded(&self) -> bool {
        self.model.read().await.is_some()
    }

    /// Set abort flag to true
    pub async fn request_abort(&self) {
        *self.abort_flag.write().await = true;
    }

    /// Check if abort was requested
    pub async fn is_abort_requested(&self) -> bool {
        *self.abort_flag.read().await
    }

    /// Reset abort flag
    pub async fn reset_abort(&self) {
        *self.abort_flag.write().await = false;
    }

    /// Update status
    pub async fn set_status(&self, status: ModelStatus) {
        *self.status.write().await = status;
    }

    /// Get current status
    pub async fn get_status(&self) -> ModelStatus {
        self.status.read().await.clone()
    }
}
