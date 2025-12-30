/**
 * Download Types Package
 * Defines interfaces and types for model download management.
 *
 * Story 2.3: Model Download Manager
 * ADR-DOWNLOAD-001: Memory-only download tracking (ADR-PRIVACY-004 compliance)
 */

/**
 * Download status states
 * Used to track the current state of a model download.
 *
 * Story 2.5 additions: verifying, verified, corrupted
 */
export type DownloadStatus =
  | "queued"
  | "downloading"
  | "paused"
  | "verifying" // Story 2.5: hash verification in progress
  | "verified" // Story 2.5: hash verification succeeded
  | "corrupted" // Story 2.5: hash verification failed
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Download error codes for categorization
 * Mapped to user-friendly messages and retry behavior
 */
export type DownloadErrorCode =
  | "NETWORK_ERROR"
  | "STORAGE_FULL"
  | "CHECKSUM_MISMATCH"
  | "CANCELLED"
  | "UNKNOWN";

/**
 * Download error with user-friendly messaging
 * Per project-context.md: UserError pattern with userMessage and technicalDetails
 */
export interface DownloadError {
  /** Error code for categorization */
  code: DownloadErrorCode;
  /** Human-readable error message */
  message: string;
  /** Whether the download can be retried */
  retryable: boolean;
}

/**
 * Download progress information
 * Emitted from Rust backend via Tauri event system (ADR-DOWNLOAD-003)
 */
export interface DownloadProgress {
  /** Unique download identifier */
  downloadId: string;
  /** Model being downloaded */
  modelId: string;
  /** Current status */
  status: DownloadStatus;
  /** Bytes downloaded so far */
  bytesDownloaded: number;
  /** Total file size in bytes */
  totalBytes: number;
  /** Current download speed in bytes per second */
  speedBps: number;
  /** Estimated time remaining in seconds */
  etaSeconds: number;
  /** Timestamp when download started */
  startedAt: Date;
  /** Error info if status is 'failed' */
  error?: DownloadError;
}

/**
 * Storage space check result
 * Used for pre-download validation (AC5)
 */
export interface StorageCheckResult {
  /** Whether there's enough space */
  hasSpace: boolean;
  /** Available space in MB */
  availableMb: number;
  /** Required space in MB */
  requiredMb: number;
  /** Shortfall in MB (0 if hasSpace is true) */
  shortfallMb: number;
}

/**
 * Download request parameters
 * Used to initiate a new model download
 */
export interface DownloadRequest {
  /** Model ID to download */
  modelId: string;
  /** Download URL */
  url: string;
  /** Expected file size in bytes (for progress calculation) */
  expectedSizeBytes?: number;
  /** Expected checksum for verification (Story 2.5 integration) */
  expectedChecksum?: string;
}

/**
 * Error message mapping for user-friendly display
 * AC3: User-friendly error messages with recovery suggestions
 */
export const DOWNLOAD_ERROR_MESSAGES: Record<
  DownloadErrorCode,
  { userMessage: string; recoveryHint: string; retryable: boolean }
> = {
  NETWORK_ERROR: {
    userMessage: "Network connection lost. Download paused.",
    recoveryHint: "Check your internet connection and try again.",
    retryable: true,
  },
  STORAGE_FULL: {
    userMessage: "Not enough storage space for this model.",
    recoveryHint: "Free up disk space or choose a smaller model.",
    retryable: false,
  },
  CHECKSUM_MISMATCH: {
    userMessage: "Downloaded file appears corrupted.",
    recoveryHint: "The download will be restarted from scratch.",
    retryable: true,
  },
  CANCELLED: {
    userMessage: "Download was cancelled.",
    recoveryHint: "You can restart the download anytime.",
    retryable: true,
  },
  UNKNOWN: {
    userMessage: "Something went wrong with the download.",
    recoveryHint: "Please try again. If this persists, check the logs.",
    retryable: true,
  },
};

/**
 * Create a typed download error with user-friendly message
 */
export function createDownloadError(
  code: DownloadErrorCode,
  customMessage?: string
): DownloadError {
  const info = DOWNLOAD_ERROR_MESSAGES[code];
  return {
    code,
    message: customMessage ?? info.userMessage,
    retryable: info.retryable,
  };
}

/**
 * Calculate download progress percentage
 * Returns 0-100 integer, clamped to valid range
 */
export function calculateProgressPercent(progress: DownloadProgress): number {
  if (progress.totalBytes === 0) {
    return 0;
  }
  const percent = Math.round(
    (progress.bytesDownloaded / progress.totalBytes) * 100
  );
  return Math.max(0, Math.min(100, percent));
}

/**
 * Format bytes to human-readable string
 * e.g., 1536 -> "1.5 KB", 1073741824 -> "1.00 GB"
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * Format download speed to human-readable string
 * e.g., 1048576 -> "1.0 MB/s"
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) {
    return `${bytesPerSecond} B/s`;
  }
  if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  }
  return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`;
}

/**
 * Format ETA to human-readable string
 * e.g., 90 -> "1m", 3700 -> "1h 1m"
 */
export function formatEta(seconds: number): string {
  if (seconds <= 0) {
    return "calculating...";
  }
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}
