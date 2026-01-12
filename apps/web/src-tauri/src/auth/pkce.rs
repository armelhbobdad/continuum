//! PKCE (Proof Key for Code Exchange) implementation (Story 5.3, AC5)
//!
// Allow dead code - these are public API methods that will be used during integration
#![allow(dead_code)]
// Pedantic lints
#![allow(clippy::items_after_statements)]
//!
//! Implements RFC 7636 for secure OAuth 2.0 authorization code flow.
//! PKCE is required for public clients (desktop apps) to prevent
//! authorization code interception attacks.
//!
//! # Security
//!
//! - Uses cryptographically secure random bytes for code verifier
//! - SHA-256 hash for code challenge (S256 method)
//! - Code verifier is 32 bytes (43-44 base64url characters)
//!
//! # References
//!
//! - [RFC 7636 - PKCE](https://datatracker.ietf.org/doc/html/rfc7636)

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use getrandom::getrandom;
use sha2::{Digest, Sha256};

/// PKCE code verifier length in bytes (produces 43-44 base64url chars)
const CODE_VERIFIER_BYTES: usize = 32;

/// PKCE (Proof Key for Code Exchange) container
///
/// Holds the code verifier (secret) and code challenge (public)
/// for OAuth 2.0 PKCE flow.
#[derive(Debug, Clone)]
pub struct Pkce {
    /// Code verifier (43-128 characters, kept secret until token exchange)
    pub code_verifier: String,
    /// Code challenge (SHA256 hash, base64url encoded, sent with auth request)
    pub code_challenge: String,
}

impl Pkce {
    /// Generate new PKCE code verifier and challenge
    ///
    /// Creates a cryptographically random code verifier and computes
    /// its SHA-256 hash as the code challenge.
    ///
    /// # Returns
    ///
    /// A new `Pkce` instance with random verifier and corresponding challenge.
    pub fn generate() -> Self {
        let code_verifier = Self::generate_code_verifier();
        let code_challenge = Self::compute_code_challenge(&code_verifier);

        Self {
            code_verifier,
            code_challenge,
        }
    }

    /// Generate cryptographically random code verifier
    ///
    /// Creates a base64url-encoded string of random bytes using the OS CSPRNG.
    /// The result is 43 characters (from 32 bytes, no padding).
    ///
    /// # Panics
    ///
    /// Panics if the OS CSPRNG fails (extremely rare, indicates system failure).
    fn generate_code_verifier() -> String {
        let mut bytes = [0u8; CODE_VERIFIER_BYTES];
        // Use getrandom for cryptographically secure random bytes
        // This uses the OS CSPRNG (e.g., /dev/urandom, CryptGenRandom)
        getrandom(&mut bytes).expect("OS CSPRNG should be available");
        URL_SAFE_NO_PAD.encode(bytes)
    }

    /// Compute code challenge from verifier (SHA256 + base64url)
    ///
    /// # Arguments
    ///
    /// * `verifier` - The code verifier string
    ///
    /// # Returns
    ///
    /// Base64url-encoded SHA-256 hash of the verifier
    pub fn compute_code_challenge(verifier: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(verifier.as_bytes());
        let hash = hasher.finalize();
        URL_SAFE_NO_PAD.encode(hash)
    }

    /// Get the challenge method (always S256 for security)
    ///
    /// The "plain" method should never be used as it provides no security.
    pub const fn challenge_method() -> &'static str {
        "S256"
    }

    /// Verify that a code challenge matches a verifier
    ///
    /// Used during token exchange to validate the PKCE flow.
    ///
    /// # Arguments
    ///
    /// * `verifier` - The code verifier
    /// * `expected_challenge` - The challenge to verify against
    ///
    /// # Returns
    ///
    /// `true` if the verifier produces the expected challenge
    pub fn verify(verifier: &str, expected_challenge: &str) -> bool {
        let computed_challenge = Self::compute_code_challenge(verifier);
        computed_challenge == expected_challenge
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_code_verifier_length() {
        let pkce = Pkce::generate();
        // base64url of 32 bytes = 43 characters (no padding)
        assert!(
            pkce.code_verifier.len() >= 43,
            "Verifier too short: {} chars",
            pkce.code_verifier.len()
        );
        assert!(
            pkce.code_verifier.len() <= 128,
            "Verifier too long: {} chars",
            pkce.code_verifier.len()
        );
    }

    #[test]
    fn test_code_verifier_is_base64url() {
        let pkce = Pkce::generate();
        // base64url characters: A-Z, a-z, 0-9, -, _
        for c in pkce.code_verifier.chars() {
            assert!(
                c.is_ascii_alphanumeric() || c == '-' || c == '_',
                "Invalid character in verifier: '{c}'"
            );
        }
    }

    #[test]
    fn test_code_challenge_is_different_from_verifier() {
        let pkce = Pkce::generate();
        assert_ne!(
            pkce.code_verifier, pkce.code_challenge,
            "Challenge should be hash of verifier, not equal"
        );
    }

    #[test]
    fn test_code_challenge_length() {
        let pkce = Pkce::generate();
        // SHA-256 produces 32 bytes, base64url encoded = 43 characters
        assert_eq!(
            pkce.code_challenge.len(),
            43,
            "SHA-256 base64url should be 43 chars"
        );
    }

    #[test]
    fn test_challenge_method_is_s256() {
        assert_eq!(Pkce::challenge_method(), "S256");
    }

    #[test]
    fn test_each_generation_is_unique() {
        let pkce1 = Pkce::generate();
        let pkce2 = Pkce::generate();

        // CSPRNG ensures unique values without delay
        assert_ne!(
            pkce1.code_verifier, pkce2.code_verifier,
            "Each generation should produce unique verifier"
        );
        assert_ne!(
            pkce1.code_challenge, pkce2.code_challenge,
            "Each generation should produce unique challenge"
        );
    }

    #[test]
    fn test_verify_correct_verifier() {
        let pkce = Pkce::generate();
        assert!(
            Pkce::verify(&pkce.code_verifier, &pkce.code_challenge),
            "Verifier should match its own challenge"
        );
    }

    #[test]
    fn test_verify_wrong_verifier() {
        let pkce = Pkce::generate();
        assert!(
            !Pkce::verify("wrong_verifier", &pkce.code_challenge),
            "Wrong verifier should not match challenge"
        );
    }

    #[test]
    fn test_known_vector() {
        // Test with a known input to verify SHA-256 + base64url encoding
        let verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        let expected_challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

        let computed = Pkce::compute_code_challenge(verifier);
        assert_eq!(computed, expected_challenge);
    }

    #[test]
    fn test_code_challenge_is_deterministic() {
        let verifier = "test_verifier_12345";
        let challenge1 = Pkce::compute_code_challenge(verifier);
        let challenge2 = Pkce::compute_code_challenge(verifier);

        assert_eq!(
            challenge1, challenge2,
            "Same verifier should produce same challenge"
        );
    }
}
