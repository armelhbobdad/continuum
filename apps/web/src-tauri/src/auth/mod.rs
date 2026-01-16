//! OAuth Authentication module (Story 5.3)
//!
//! Provides OAuth authentication flow with 3-tier fallback:
//! 1. Deep Link: `continuum://callback` (fastest, preferred)
//! 2. Local Server: `http://localhost:{port}/callback` (fallback)
//! 3. Manual Entry: User copies authorization code (universal fallback)
//!
//! # Security Architecture
//!
//! - PKCE (Proof Key for Code Exchange) required for all flows
//! - State parameter validation prevents CSRF attacks (ADR-CRED-2)
//! - Tokens stored via Credential Bridge (Story 5.1) - never in WebView
//! - Deep link callbacks processed within 2 seconds (NFR-CRED-4)
//! - Fallback timeout: 30 seconds (NFR-CRED-5)
//!
//! # Story References
//! - Story 5.3: OAuth Authentication Flow
//!   - AC1: Deep link callback flow
//!   - AC2: Local server fallback
//!   - AC3: Manual code entry fallback
//!   - AC4: Progress indicators
//!   - AC5: Token storage via Credential Bridge
//!   - AC6: Error handling and retry

// Module declarations
pub mod commands;
pub mod deep_link;
pub mod local_server;
pub mod oauth;
pub mod pkce;
pub mod state;
pub mod types;

// Re-export public types for IPC serialization
#[allow(unused_imports)]
pub use deep_link::{DeepLinkHandler, DEEP_LINK_TIMEOUT_MS};
#[allow(unused_imports)]
pub use local_server::{LocalOAuthServer, LOCAL_SERVER_TIMEOUT_MS};
#[allow(unused_imports)]
pub use oauth::OAuthFlowManager;
#[allow(unused_imports)]
pub use pkce::Pkce;
#[allow(unused_imports)]
pub use state::OAuthManagedState;
#[allow(unused_imports)]
pub use types::{
    OAuthCallbackData, OAuthConfig, OAuthError, OAuthProgress, OAuthState, TokenResponse,
};

// Re-export commands with wildcard to include Tauri-generated __cmd__ symbols
#[allow(clippy::wildcard_imports)]
pub use commands::*;
