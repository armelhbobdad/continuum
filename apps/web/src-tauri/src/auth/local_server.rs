//! Local OAuth Server for fallback authentication (Story 5.3, AC2)
//!
// Allow dead code - these are public API methods that will be used during integration
#![allow(dead_code)]
// Pedantic lints for intentional code patterns
#![allow(clippy::needless_continue)]
#![allow(clippy::option_if_let_else)]
#![allow(clippy::unused_peekable)]
//!
//! Provides a local HTTP server for receiving OAuth callbacks when deep links
//! are unavailable. Binds to localhost only with an ephemeral port for security.
//!
//! # Security
//!
//! - Binds ONLY to 127.0.0.1 (localhost) - no external access
//! - Uses ephemeral port (OS assigns) to avoid port conflicts
//! - Serves minimal HTML response only
//! - 30-second timeout for callback (NFR-CRED-5)
//!
//! # Usage
//!
//! ```ignore
//! let server = LocalOAuthServer::new("expected_state");
//! let port = server.start().await?;
//! let redirect_uri = format!("http://localhost:{}/callback", port);
//! // ... redirect user to OAuth provider with redirect_uri
//! let callback_data = server.await_callback().await?;
//! server.stop().await;
//! ```

use super::types::{OAuthCallbackData, OAuthError};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use tokio::time::{timeout, Duration};

/// Local server callback timeout in milliseconds (30 seconds per NFR-CRED-5)
pub const LOCAL_SERVER_TIMEOUT_MS: u64 = 30_000;

/// Localhost address for binding
const LOCALHOST: &str = "127.0.0.1";

/// HTML response sent to browser after callback
const CALLBACK_RESPONSE_HTML: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In Complete</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e6e6e6;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        .checkmark {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: #10b981;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
        }
        .checkmark::after {
            content: '✓';
            font-size: 2rem;
            color: white;
        }
        h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
        p { margin: 0; opacity: 0.8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="checkmark"></div>
        <h1>Sign In Complete</h1>
        <p>You can close this window and return to Continuum.</p>
    </div>
</body>
</html>"#;

/// HTTP OK response header
const HTTP_OK_HEADER: &str =
    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nConnection: close\r\n\r\n";

/// HTTP Bad Request response
const HTTP_BAD_REQUEST: &str =
    "HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nBad Request";

/// Local OAuth server for receiving callbacks (AC2)
///
/// Provides HTTP server functionality for OAuth callback reception
/// when deep links are unavailable.
#[derive(Debug)]
pub struct LocalOAuthServer {
    /// Expected state for CSRF validation
    expected_state: String,
    /// The port the server is listening on (set after start)
    port: Arc<Mutex<Option<u16>>>,
    /// The TCP listener (kept alive to prevent port race condition)
    listener: Arc<Mutex<Option<TcpListener>>>,
    /// Shutdown signal
    shutdown: Arc<Mutex<bool>>,
}

impl LocalOAuthServer {
    /// Create a new local OAuth server
    ///
    /// # Arguments
    ///
    /// * `expected_state` - The state parameter for CSRF validation
    pub fn new(expected_state: impl Into<String>) -> Self {
        Self {
            expected_state: expected_state.into(),
            port: Arc::new(Mutex::new(None)),
            listener: Arc::new(Mutex::new(None)),
            shutdown: Arc::new(Mutex::new(false)),
        }
    }

    /// Start the local server and return the assigned port
    ///
    /// If `preferred_port` is provided, binds to that specific port.
    /// Otherwise, binds to localhost:0 to get an ephemeral port assigned by the OS.
    /// The listener is kept alive to prevent port race conditions.
    ///
    /// # Arguments
    ///
    /// * `preferred_port` - Optional specific port to bind to (for providers like Zoom
    ///   that require exact redirect URI with specific port)
    ///
    /// # Returns
    ///
    /// * `Ok(u16)` - The port number the server is listening on
    /// * `Err(OAuthError)` - If binding fails
    pub async fn start(&self, preferred_port: Option<u16>) -> Result<u16, OAuthError> {
        let bind_port = preferred_port.unwrap_or(0);
        let listener = TcpListener::bind(format!("{LOCALHOST}:{bind_port}"))
            .await
            .map_err(|e| OAuthError::InternalError {
                message: format!("Failed to bind local server to port {bind_port}: {e}"),
            })?;

        let port = listener
            .local_addr()
            .map_err(|e| OAuthError::InternalError {
                message: format!("Failed to get local address: {e}"),
            })?
            .port();

        *self.port.lock().await = Some(port);
        *self.listener.lock().await = Some(listener);
        *self.shutdown.lock().await = false;

        Ok(port)
    }

    /// Get the port the server is listening on
    pub async fn port(&self) -> Option<u16> {
        *self.port.lock().await
    }

    /// Wait for an OAuth callback with timeout
    ///
    /// Listens for HTTP requests on the bound port and extracts the
    /// authorization code and state from the query parameters.
    ///
    /// # Returns
    ///
    /// * `Ok(OAuthCallbackData)` - Parsed and validated callback data
    /// * `Err(OAuthError::LocalServerTimeout)` - If no callback received within timeout
    /// * `Err(OAuthError)` - Other errors (invalid state, etc.)
    pub async fn await_callback(&self) -> Result<OAuthCallbackData, OAuthError> {
        // Take ownership of the listener from storage
        let listener =
            self.listener
                .lock()
                .await
                .take()
                .ok_or_else(|| OAuthError::InternalError {
                    message: "Server not started".to_string(),
                })?;

        let timeout_duration = Duration::from_millis(LOCAL_SERVER_TIMEOUT_MS);
        let shutdown = Arc::clone(&self.shutdown);
        let expected_state = self.expected_state.clone();

        let result = timeout(timeout_duration, async {
            loop {
                // Check shutdown signal
                if *shutdown.lock().await {
                    return Err(OAuthError::Cancelled);
                }

                // Accept connection with a short timeout to check shutdown signal
                let accept_result =
                    tokio::time::timeout(Duration::from_secs(1), listener.accept()).await;

                match accept_result {
                    Ok(Ok((mut stream, _))) => {
                        let mut buffer = vec![0u8; 4096];
                        let n = stream.read(&mut buffer).await.unwrap_or(0);
                        let request = String::from_utf8_lossy(&buffer[..n]);

                        // Parse the request line
                        if let Some(callback_data) = parse_http_request(&request, &expected_state) {
                            // Send success response
                            let response = format!("{HTTP_OK_HEADER}{CALLBACK_RESPONSE_HTML}");
                            let _ = stream.write_all(response.as_bytes()).await;
                            let _ = stream.shutdown().await;
                            return callback_data;
                        }
                        // Not a valid callback request, send bad request response
                        let _ = stream.write_all(HTTP_BAD_REQUEST.as_bytes()).await;
                        let _ = stream.shutdown().await;
                    },
                    Ok(Err(_)) => {
                        // Accept error, continue
                        continue;
                    },
                    Err(_) => {
                        // Timeout on accept, check shutdown and continue
                        continue;
                    },
                }
            }
        })
        .await;

        match result {
            Ok(callback_result) => callback_result,
            Err(_) => Err(OAuthError::LocalServerTimeout),
        }
    }

    /// Stop the local server
    pub async fn stop(&self) {
        *self.shutdown.lock().await = true;
        *self.listener.lock().await = None;
        *self.port.lock().await = None;
    }

    /// Build the redirect URI for this server
    ///
    /// Google OAuth for desktop apps requires loopback redirect WITHOUT path.
    /// See: https://developers.google.com/identity/protocols/oauth2/native-app#redirect-uri_loopback
    ///
    /// # Returns
    ///
    /// * `Some(String)` - The redirect URI if server is started (e.g., `http://127.0.0.1:54321`)
    /// * `None` - If server is not started
    pub async fn redirect_uri(&self) -> Option<String> {
        self.port
            .lock()
            .await
            .map(|port| format!("http://{LOCALHOST}:{port}"))
    }
}

/// Parse an HTTP request and extract OAuth callback data
///
/// Google OAuth for desktop apps redirects to `http://127.0.0.1:port?code=...&state=...`
/// (root path, no /callback). We accept both root path and /callback for compatibility.
fn parse_http_request(
    request: &str,
    expected_state: &str,
) -> Option<Result<OAuthCallbackData, OAuthError>> {
    // Parse the first line (request line)
    let first_line = request.lines().next()?;
    let parts: Vec<&str> = first_line.split_whitespace().collect();

    if parts.len() < 2 || parts[0] != "GET" {
        return None;
    }

    let path = parts[1];

    // Accept root path (Google OAuth) or /callback path (backward compat)
    // Google redirects to http://127.0.0.1:port?code=...&state=... (root path)
    let is_root_with_query = path.starts_with("/?");
    let is_callback_path = path.starts_with("/callback");

    if !is_root_with_query && !is_callback_path {
        return None;
    }

    // Parse query string
    let query_start = path.find('?')?;
    let query_string = &path[query_start + 1..];

    let mut code = None;
    let mut state = None;
    let mut error = None;
    let mut error_description = None;

    for pair in query_string.split('&') {
        if let Some((key, value)) = pair.split_once('=') {
            let decoded_value = url_decode(value);
            match key {
                "code" => code = Some(decoded_value),
                "state" => state = Some(decoded_value),
                "error" => error = Some(decoded_value),
                "error_description" => error_description = Some(decoded_value),
                _ => {},
            }
        }
    }

    // Check for provider error
    if let Some(err) = error {
        return Some(Err(OAuthError::ProviderError {
            code: err,
            description: error_description.unwrap_or_default(),
        }));
    }

    // Require code and state
    let code = code?;
    let state = state?;

    // Validate state
    if state != expected_state {
        return Some(Err(OAuthError::InvalidState));
    }

    Some(Ok(OAuthCallbackData::new(code, state)))
}

/// Simple URL decoding for query parameters
fn url_decode(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '%' {
            let hex: String = chars.by_ref().take(2).collect();
            if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                result.push(byte as char);
            } else {
                result.push('%');
                result.push_str(&hex);
            }
        } else if c == '+' {
            result.push(' ');
        } else {
            result.push(c);
        }
    }

    result
}

#[cfg(test)]
#[allow(clippy::panic)]
mod tests {
    use super::*;

    #[test]
    fn test_url_decode() {
        assert_eq!(url_decode("hello%20world"), "hello world");
        assert_eq!(url_decode("hello+world"), "hello world");
        assert_eq!(url_decode("code%2Bvalue"), "code+value");
        assert_eq!(url_decode("plain"), "plain");
    }

    #[test]
    fn test_parse_http_request_valid_root_path() {
        // Google OAuth redirects to root path: http://127.0.0.1:port/?code=...&state=...
        let request = "GET /?code=auth123&state=state456 HTTP/1.1\r\nHost: localhost\r\n\r\n";
        let result = parse_http_request(request, "state456");

        match result {
            Some(Ok(data)) => {
                assert_eq!(data.code, "auth123");
                assert_eq!(data.state, "state456");
            },
            _ => panic!("Expected valid callback data"),
        }
    }

    #[test]
    fn test_parse_http_request_valid_callback_path() {
        // Also accept /callback path for backward compatibility
        let request =
            "GET /callback?code=auth123&state=state456 HTTP/1.1\r\nHost: localhost\r\n\r\n";
        let result = parse_http_request(request, "state456");

        match result {
            Some(Ok(data)) => {
                assert_eq!(data.code, "auth123");
                assert_eq!(data.state, "state456");
            },
            _ => panic!("Expected valid callback data"),
        }
    }

    #[test]
    fn test_parse_http_request_invalid_state() {
        let request = "GET /?code=auth123&state=wrong HTTP/1.1\r\nHost: localhost\r\n\r\n";
        let result = parse_http_request(request, "expected");

        match result {
            Some(Err(OAuthError::InvalidState)) => {},
            _ => panic!("Expected InvalidState error"),
        }
    }

    #[test]
    fn test_parse_http_request_provider_error() {
        let request = "GET /?error=access_denied&error_description=User%20denied HTTP/1.1\r\n\r\n";
        let result = parse_http_request(request, "state");

        match result {
            Some(Err(OAuthError::ProviderError { code, description })) => {
                assert_eq!(code, "access_denied");
                assert_eq!(description, "User denied");
            },
            _ => panic!("Expected ProviderError"),
        }
    }

    #[test]
    fn test_parse_http_request_missing_params() {
        let request = "GET /?code=auth123 HTTP/1.1\r\n\r\n";
        let result = parse_http_request(request, "state");
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_http_request_not_callback() {
        // Paths other than / or /callback should be rejected
        let request = "GET /other?code=auth123 HTTP/1.1\r\n\r\n";
        let result = parse_http_request(request, "state");
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_http_request_post_ignored() {
        let request = "POST /?code=auth123&state=state HTTP/1.1\r\n\r\n";
        let result = parse_http_request(request, "state");
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_local_server_creation() {
        let server = LocalOAuthServer::new("test_state");
        assert!(server.port().await.is_none());
    }

    #[tokio::test]
    async fn test_local_server_start_assigns_port() {
        let server = LocalOAuthServer::new("test_state");
        let port = server.start(None).await.expect("start should succeed");

        assert!(port > 0);
        assert_eq!(server.port().await, Some(port));

        server.stop().await;
        assert!(server.port().await.is_none());
    }

    #[tokio::test]
    async fn test_local_server_start_with_preferred_port() {
        let server = LocalOAuthServer::new("test_state");
        // Use a high port number to avoid conflicts
        let preferred = 18085;
        let port = server
            .start(Some(preferred))
            .await
            .expect("start should succeed");

        assert_eq!(port, preferred);
        assert_eq!(server.port().await, Some(preferred));

        server.stop().await;
    }

    #[tokio::test]
    async fn test_local_server_redirect_uri() {
        let server = LocalOAuthServer::new("test_state");

        // Before start, no redirect URI
        assert!(server.redirect_uri().await.is_none());

        let port = server.start(None).await.expect("start should succeed");
        let uri = server.redirect_uri().await.expect("should have URI");

        // Google requires path-less loopback redirect for desktop apps
        assert_eq!(uri, format!("http://127.0.0.1:{port}"));

        server.stop().await;
    }
}
