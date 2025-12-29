//! Unit tests for verification module (Story 2.5)

// Tests use expect/unwrap for clarity - panics are desired on failure
#![allow(clippy::expect_used)]
#![allow(clippy::unwrap_used)]
// Test file sizes use lossy casts which is fine for assertions
#![allow(clippy::cast_precision_loss)]
#![allow(clippy::cast_possible_truncation)]
#![allow(clippy::cast_sign_loss)]

use super::*;
use std::io::Write;
use tempfile::NamedTempFile;

/// Known SHA-256 test vectors for verification
/// SHA-256("test") = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
const TEST_CONTENT: &str = "test";
const TEST_CONTENT_HASH: &str = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

/// SHA-256("") = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
const EMPTY_CONTENT_HASH: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

#[test]
fn test_compute_checksum_known_vector() {
    // Create a temp file with known content
    let mut file = NamedTempFile::new().expect("Failed to create temp file");
    file.write_all(TEST_CONTENT.as_bytes())
        .expect("Failed to write to temp file");
    file.flush().expect("Failed to flush temp file");

    let result = compute_checksum(file.path());
    assert!(result.is_ok(), "Checksum computation should succeed");

    let hash = result.unwrap();
    assert_eq!(
        hash, TEST_CONTENT_HASH,
        "Computed hash should match known SHA-256 of 'test'"
    );
}

#[test]
fn test_compute_checksum_empty_file() {
    let file = NamedTempFile::new().expect("Failed to create temp file");
    // Don't write anything - empty file

    let result = compute_checksum(file.path());
    assert!(result.is_ok(), "Checksum of empty file should succeed");

    let hash = result.unwrap();
    assert_eq!(
        hash, EMPTY_CONTENT_HASH,
        "Computed hash should match known SHA-256 of empty string"
    );
}

#[test]
fn test_compute_checksum_file_not_found() {
    let result = compute_checksum(std::path::Path::new("/nonexistent/path/to/file.gguf"));

    assert!(result.is_err(), "Should fail for nonexistent file");
    let error = result.unwrap_err();
    assert_eq!(error.kind, "file_not_found");
}

#[test]
fn test_verify_integrity_pass() {
    let mut file = NamedTempFile::new().expect("Failed to create temp file");
    file.write_all(TEST_CONTENT.as_bytes())
        .expect("Failed to write to temp file");
    file.flush().expect("Failed to flush temp file");

    let result = verify_integrity(file.path(), TEST_CONTENT_HASH);
    assert!(result.is_ok(), "Verification should succeed");

    let verification = result.unwrap();
    assert!(verification.verified, "Verification should pass");
    assert_eq!(verification.computed_hash, TEST_CONTENT_HASH);
    assert_eq!(verification.expected_hash, TEST_CONTENT_HASH);
    assert_eq!(verification.file_size, 4); // "test" is 4 bytes
}

#[test]
fn test_verify_integrity_fail_mismatch() {
    let mut file = NamedTempFile::new().expect("Failed to create temp file");
    file.write_all(b"different content")
        .expect("Failed to write to temp file");
    file.flush().expect("Failed to flush temp file");

    let result = verify_integrity(file.path(), TEST_CONTENT_HASH);
    assert!(result.is_ok(), "Verification should complete (not error)");

    let verification = result.unwrap();
    assert!(
        !verification.verified,
        "Verification should fail due to mismatch"
    );
    assert_ne!(verification.computed_hash, TEST_CONTENT_HASH);
}

#[test]
fn test_verify_integrity_case_insensitive() {
    let mut file = NamedTempFile::new().expect("Failed to create temp file");
    file.write_all(TEST_CONTENT.as_bytes())
        .expect("Failed to write to temp file");
    file.flush().expect("Failed to flush temp file");

    // Test with uppercase hash
    let uppercase_hash = TEST_CONTENT_HASH.to_uppercase();
    let result = verify_integrity(file.path(), &uppercase_hash);

    assert!(result.is_ok(), "Verification should succeed");
    let verification = result.unwrap();
    assert!(
        verification.verified,
        "Verification should pass with case-insensitive comparison"
    );
}

#[test]
fn test_verify_integrity_file_not_found() {
    let result = verify_integrity(
        std::path::Path::new("/nonexistent/path/to/file.gguf"),
        TEST_CONTENT_HASH,
    );

    assert!(result.is_err(), "Should fail for nonexistent file");
    let error = result.unwrap_err();
    assert_eq!(error.kind, "file_not_found");
}

#[test]
fn test_verification_result_serialization() {
    let result = VerificationResult {
        verified: true,
        computed_hash: TEST_CONTENT_HASH.to_string(),
        expected_hash: TEST_CONTENT_HASH.to_string(),
        file_size: 1024,
    };

    let json = serde_json::to_string(&result).expect("Should serialize");
    assert!(json.contains("\"verified\":true"));
    assert!(json.contains(&format!("\"computed_hash\":\"{TEST_CONTENT_HASH}\"")));
}

#[test]
fn test_verification_error_serialization() {
    let error = VerificationError::file_not_found(std::path::Path::new("/test/path"));

    let json = serde_json::to_string(&error).expect("Should serialize");
    assert!(json.contains("\"kind\":\"file_not_found\""));
    assert!(json.contains("File not found"));
}

// Quarantine filename parsing tests
mod quarantine_tests {
    use super::super::commands::parse_quarantine_filename;

    #[test]
    fn test_parse_simple_model_id() {
        // Simple model ID without underscores: phi-3-mini_20251229_103000.gguf
        let result = parse_quarantine_filename("phi-3-mini_20251229_103000.gguf");
        assert!(result.is_some());
        let (model_id, timestamp) = result.unwrap();
        assert_eq!(model_id, "phi-3-mini");
        assert_eq!(timestamp, "20251229_103000");
    }

    #[test]
    fn test_parse_model_id_with_underscores() {
        // Model ID with underscores: my_model_name_20251229_103000.gguf
        let result = parse_quarantine_filename("my_model_name_20251229_103000.gguf");
        assert!(result.is_some());
        let (model_id, timestamp) = result.unwrap();
        assert_eq!(model_id, "my_model_name");
        assert_eq!(timestamp, "20251229_103000");
    }

    #[test]
    fn test_parse_without_gguf_suffix() {
        // Without .gguf suffix (already stripped by file_stem)
        let result = parse_quarantine_filename("phi-3-mini_20251229_103000");
        assert!(result.is_some());
        let (model_id, timestamp) = result.unwrap();
        assert_eq!(model_id, "phi-3-mini");
        assert_eq!(timestamp, "20251229_103000");
    }

    #[test]
    fn test_parse_single_underscore() {
        // Edge case: single underscore
        let result = parse_quarantine_filename("model_20251229.gguf");
        assert!(result.is_some());
        let (model_id, timestamp) = result.unwrap();
        assert_eq!(model_id, "model");
        assert_eq!(timestamp, "20251229");
    }

    #[test]
    fn test_parse_no_underscore() {
        // Edge case: no underscore
        let result = parse_quarantine_filename("modelname.gguf");
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_empty_string() {
        // Edge case: empty string
        let result = parse_quarantine_filename("");
        assert!(result.is_none());
    }
}

// Integration test for full verification flow
mod integration_tests {
    use super::*;
    use std::io::Write;
    use tempfile::TempDir;

    /// Integration test: full verification flow
    /// Task 11.7: Tests the complete verification workflow
    #[test]
    fn test_full_verification_flow() {
        // 1. Create a temp file with known content
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let model_path = temp_dir.path().join("model.gguf");

        let content = b"This is a test model file content for verification";
        let mut file = std::fs::File::create(&model_path).expect("Failed to create file");
        file.write_all(content).expect("Failed to write content");
        file.sync_all().expect("Failed to sync file");

        // 2. Compute checksum
        let checksum = compute_checksum(&model_path).expect("Checksum computation failed");

        // Verify checksum is 64 hex characters (SHA-256)
        assert_eq!(checksum.len(), 64);
        assert!(checksum.chars().all(|c| c.is_ascii_hexdigit()));

        // 3. Verify with correct hash
        let result = verify_integrity(&model_path, &checksum).expect("Verification failed");
        assert!(
            result.verified,
            "Verification should pass with correct hash"
        );
        assert_eq!(result.computed_hash, result.expected_hash);

        // 4. Verify with incorrect hash
        let wrong_hash = "0".repeat(64);
        let result =
            verify_integrity(&model_path, &wrong_hash).expect("Verification should complete");
        assert!(!result.verified, "Verification should fail with wrong hash");
        assert_ne!(result.computed_hash, result.expected_hash);

        // 5. Verify file size is reported correctly
        assert_eq!(result.file_size, content.len() as u64);
    }

    #[test]
    fn test_verification_with_progress() {
        // Create a larger file to trigger progress events
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let model_path = temp_dir.path().join("large_model.gguf");

        // Create a 1MB file
        let size = 1024 * 1024;
        let content: Vec<u8> = (0..size).map(|i| (i % 256) as u8).collect();

        std::fs::write(&model_path, &content).expect("Failed to write file");

        // Compute checksum
        let checksum = compute_checksum(&model_path).expect("Checksum failed");

        // Verify without progress (should work)
        let result = verify_integrity(&model_path, &checksum).expect("Verification failed");
        assert!(result.verified);
        assert_eq!(result.file_size, size as u64);
    }
}
