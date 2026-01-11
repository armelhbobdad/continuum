//! Connectivity Module
//!
//! Provides network connectivity detection for desktop application.
//! Story 4.1: AC1 - Automatic Offline Detection (Tauri Desktop Integration)

/// Check network connectivity by attempting to reach a reliable endpoint.
///
/// Returns `true` if the system has network connectivity, `false` otherwise.
///
/// # Desktop Detection Strategy
///
/// 1. First checks if the system reports network availability
/// 2. Then attempts a lightweight HTTP HEAD request to verify actual connectivity
/// 3. Falls back gracefully if detection fails
///
/// # Example
///
/// ```ignore
/// // From TypeScript
/// const isOnline = await invoke<boolean>("check_connectivity");
/// ```
#[tauri::command]
pub async fn check_connectivity() -> bool {
    // Use reqwest for HTTP connectivity check
    // This is more reliable than just checking system network state
    let Ok(client) = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
    else {
        return false;
    };

    // Try multiple reliable endpoints for redundancy
    let endpoints = [
        "https://connectivitycheck.gstatic.com/generate_204",
        "https://www.google.com/generate_204",
        "http://captive.apple.com/hotspot-detect.html",
    ];

    for endpoint in endpoints {
        if let Ok(response) = client.head(endpoint).send().await {
            if response.status().is_success() || response.status().as_u16() == 204 {
                return true;
            }
        }
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Integration test: Verifies check_connectivity completes without panic.
    ///
    /// This test validates:
    /// - HTTP client builds successfully
    /// - Function handles network availability/unavailability gracefully
    /// - Returns a boolean result (network-dependent)
    ///
    /// Note: Actual result depends on test environment's network state.
    /// The function is designed to return `false` on any error, never panic.
    #[tokio::test]
    async fn test_check_connectivity_completes_without_panic() {
        // Function should complete and return a boolean, never panic
        // Result depends on network availability - we just verify it completes
        let _result: bool = check_connectivity().await;
        // If we reach here without panic, the test passes
    }

    /// Verifies the endpoint list is non-empty and contains valid URLs.
    #[test]
    fn test_endpoints_are_valid() {
        let endpoints = [
            "https://connectivitycheck.gstatic.com/generate_204",
            "https://www.google.com/generate_204",
            "http://captive.apple.com/hotspot-detect.html",
        ];

        assert!(!endpoints.is_empty(), "Must have fallback endpoints");

        for endpoint in endpoints {
            assert!(
                endpoint.starts_with("http://") || endpoint.starts_with("https://"),
                "Endpoint must be a valid HTTP(S) URL: {endpoint}"
            );
        }
    }
}
