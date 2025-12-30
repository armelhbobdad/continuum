/**
 * Download Adapter for Model Downloads
 * Story 2.3: Model Download Manager
 *
 * Provides TypeScript wrappers around Tauri download commands.
 * Desktop: Uses Tauri commands for download management.
 * Web: Not supported (models must be pre-downloaded or streamed).
 *
 * ADR-DOWNLOAD-001: Memory-only download tracking
 * ADR-DOWNLOAD-002: Chunked downloads with resume capability
 * ADR-DOWNLOAD-003: Tauri event system for progress updates
 */

import type {
  DownloadProgress,
  StorageCheckResult,
} from "@continuum/inference";
import { isDesktop } from "./capabilities";

// ============================================================================
// Tauri API Access
// ============================================================================

/**
 * Get the Tauri invoke function from the global __TAURI__ object.
 * With `withGlobalTauri: true` in tauri.conf.json, the API is available globally.
 */
function getTauriInvoke(): <T>(
  cmd: string,
  args?: Record<string, unknown>
) => Promise<T> {
  const global = globalThis as unknown as {
    __TAURI__?: {
      core?: {
        invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
    };
  };

  if (!global.__TAURI__?.core?.invoke) {
    throw new Error("Tauri API not available");
  }

  return global.__TAURI__.core.invoke;
}

/**
 * Get the Tauri listen function from the global __TAURI__ object.
 */
function getTauriListen(): <T>(
  event: string,
  handler: (evt: { payload: T }) => void
) => Promise<() => void> {
  const global = globalThis as unknown as {
    __TAURI__?: {
      event?: {
        listen: <T>(
          event: string,
          handler: (evt: { payload: T }) => void
        ) => Promise<() => void>;
      };
    };
  };

  if (!global.__TAURI__?.event?.listen) {
    throw new Error("Tauri Event API not available");
  }

  return global.__TAURI__.event.listen;
}

// ============================================================================
// Types
// ============================================================================

/** Callback for download progress updates */
export type DownloadProgressCallback = (progress: DownloadProgress) => void;

/** Tauri event payload for download_progress event */
interface TauriDownloadProgressEvent {
  download_id: string;
  model_id: string;
  status: string;
  bytes_downloaded: number;
  total_bytes: number;
  speed_bps: number;
  eta_seconds: number;
}

/** Tauri storage check result */
interface TauriStorageCheckResult {
  has_space: boolean;
  available_mb: number;
  required_mb: number;
  shortfall_mb: number;
}

// ============================================================================
// Download Functions
// ============================================================================

/**
 * Start downloading a model and its tokenizer.
 *
 * @param modelId - The model identifier
 * @param url - The download URL for the GGUF model
 * @param tokenizerUrl - The download URL for the tokenizer.json
 * @param expectedHash - Optional SHA-256 hash for integrity verification (Story 2.5)
 * @returns Promise<string> - The download ID for tracking
 * @throws Error if not on desktop or if download fails to start
 */
// biome-ignore lint/suspicious/useAwait: Returns awaited promise from Tauri invoke
export async function startModelDownload(
  modelId: string,
  url: string,
  tokenizerUrl: string,
  expectedHash?: string
): Promise<string> {
  if (!isDesktop()) {
    throw new Error("Model downloads are only supported on desktop");
  }

  const invoke = getTauriInvoke();
  return invoke<string>("start_download", {
    modelId,
    url,
    tokenizerUrl,
    expectedHash: expectedHash ?? null,
  });
}

/**
 * Pause an active download.
 * The partial file is preserved for later resume.
 *
 * @param downloadId - The download ID to pause
 * @throws Error if download not found or already paused
 */
export async function pauseModelDownload(downloadId: string): Promise<void> {
  if (!isDesktop()) {
    throw new Error("Model downloads are only supported on desktop");
  }

  const invoke = getTauriInvoke();
  await invoke<void>("pause_download", { downloadId });
}

/**
 * Resume a paused download.
 * Continues from where the download left off using HTTP Range headers.
 *
 * @param downloadId - The download ID to resume
 * @throws Error if download not found or not paused
 */
export async function resumeModelDownload(downloadId: string): Promise<void> {
  if (!isDesktop()) {
    throw new Error("Model downloads are only supported on desktop");
  }

  const invoke = getTauriInvoke();
  await invoke<void>("resume_download", { downloadId });
}

/**
 * Cancel a download and clean up partial files.
 *
 * @param downloadId - The download ID to cancel
 * @throws Error if download not found
 */
export async function cancelModelDownload(downloadId: string): Promise<void> {
  if (!isDesktop()) {
    throw new Error("Model downloads are only supported on desktop");
  }

  const invoke = getTauriInvoke();
  await invoke<void>("cancel_download", { downloadId });
}

/**
 * Check if there's enough storage space for a download.
 * Should be called before starting a download (AC5).
 *
 * @param requiredMb - Required space in megabytes
 * @returns Promise<StorageCheckResult> - Storage availability info
 */
export async function checkStorageSpace(
  requiredMb: number
): Promise<StorageCheckResult> {
  if (!isDesktop()) {
    // Fallback for web - use navigator.storage.estimate()
    return checkWebStorageSpace(requiredMb);
  }

  const invoke = getTauriInvoke();
  const result = await invoke<TauriStorageCheckResult>("check_storage_space", {
    requiredMb,
  });

  return {
    hasSpace: result.has_space,
    availableMb: result.available_mb,
    requiredMb: result.required_mb,
    shortfallMb: result.shortfall_mb,
  };
}

/**
 * Get the file path for a downloaded model.
 *
 * @param modelId - The model identifier
 * @returns Promise<string | null> - Path to model file, or null if not downloaded
 */
// biome-ignore lint/suspicious/useAwait: Returns null early for non-desktop or awaited Tauri invoke
export async function getModelPath(modelId: string): Promise<string | null> {
  if (!isDesktop()) {
    return null;
  }

  const invoke = getTauriInvoke();
  return invoke<string | null>("get_model_path", { modelId });
}

/**
 * Get the size of a partial download if it exists.
 * Used to show "Resume" instead of "Download" in the UI.
 *
 * @param modelId - The model identifier
 * @returns Promise<number | null> - Bytes downloaded, or null if no partial file
 */
// biome-ignore lint/suspicious/useAwait: Returns null early for non-desktop or awaited Tauri invoke
export async function getPartialDownloadSize(
  modelId: string
): Promise<number | null> {
  if (!isDesktop()) {
    return null;
  }

  const invoke = getTauriInvoke();
  return invoke<number | null>("get_partial_download_size", { modelId });
}

/**
 * Delete a downloaded model.
 *
 * @param modelId - The model identifier to delete
 */
export async function deleteModel(modelId: string): Promise<void> {
  if (!isDesktop()) {
    throw new Error("Model deletion is only supported on desktop");
  }

  const invoke = getTauriInvoke();
  await invoke<void>("delete_model", { modelId });
}

// ============================================================================
// Event Subscription
// ============================================================================

/** Active event listener cleanup function */
type UnlistenFn = () => void;

/**
 * Subscribe to download progress events.
 * Progress events are emitted from the Rust backend via Tauri event system.
 *
 * @param callback - Function to call with progress updates
 * @returns Promise<UnlistenFn> - Function to unsubscribe from events
 */
export function subscribeToDownloadProgress(
  callback: DownloadProgressCallback
): Promise<UnlistenFn> {
  if (!isDesktop()) {
    // Return no-op for web
    return Promise.resolve(() => {
      // No-op unlisten function for non-desktop platforms
    });
  }

  const listen = getTauriListen();

  return listen<TauriDownloadProgressEvent>("download_progress", (event) => {
    const payload = event.payload;

    // Convert Tauri payload to TypeScript interface
    const progress: DownloadProgress = {
      downloadId: payload.download_id,
      modelId: payload.model_id,
      status: payload.status as DownloadProgress["status"],
      bytesDownloaded: payload.bytes_downloaded,
      totalBytes: payload.total_bytes,
      speedBps: payload.speed_bps,
      etaSeconds: payload.eta_seconds,
      startedAt: new Date(), // Approximate - Tauri doesn't send this
    };

    callback(progress);
  });
}

/** Corruption event data from Tauri */
export interface CorruptionEvent {
  modelId: string;
  expectedHash: string;
  actualHash: string;
  quarantinePath: string;
}

/** Callback for corruption events */
export type CorruptionEventCallback = (event: CorruptionEvent) => void;

/** Tauri corruption event payload */
interface TauriCorruptionEvent {
  model_id: string;
  expected_hash: string;
  actual_hash: string;
  quarantine_path: string;
}

/**
 * Subscribe to download corruption events.
 * Emitted when checksum verification fails (Story 2.5).
 *
 * @param callback - Function to call with corruption details
 * @returns Promise<UnlistenFn> - Function to unsubscribe from events
 */
export function subscribeToCorruptionEvents(
  callback: CorruptionEventCallback
): Promise<UnlistenFn> {
  if (!isDesktop()) {
    return Promise.resolve(() => {
      // No-op unlisten function for non-desktop platforms
    });
  }

  const listen = getTauriListen();

  return listen<TauriCorruptionEvent>("download_corrupted", (event) => {
    const payload = event.payload;

    callback({
      modelId: payload.model_id,
      expectedHash: payload.expected_hash,
      actualHash: payload.actual_hash,
      quarantinePath: payload.quarantine_path,
    });
  });
}

// ============================================================================
// Network Connectivity
// ============================================================================

/**
 * Subscribe to network connectivity changes.
 * Used for auto-resume on network recovery (AC4).
 *
 * @param callback - Function to call with online status
 * @returns UnlistenFn - Function to unsubscribe from events
 */
export function subscribeToNetworkStatus(
  callback: (online: boolean) => void
): UnlistenFn {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

/**
 * Check current network status.
 * Returns true during SSR (optimistic assumption).
 *
 * @returns boolean - True if online
 */
export function isOnline(): boolean {
  // SSR guard - assume online during server-side rendering
  if (typeof navigator === "undefined") {
    return true;
  }
  return navigator.onLine;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Check web storage space using navigator.storage.estimate().
 * Fallback for web platform. Returns sufficient space during SSR.
 */
async function checkWebStorageSpace(
  requiredMb: number
): Promise<StorageCheckResult> {
  // SSR guard - assume sufficient space during server-side rendering
  if (typeof navigator === "undefined") {
    return {
      hasSpace: true,
      availableMb: 10_240, // 10GB default
      requiredMb,
      shortfallMb: 0,
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const availableMb = Math.floor(
      ((estimate.quota ?? 0) - (estimate.usage ?? 0)) / 1024 / 1024
    );

    return {
      hasSpace: availableMb >= requiredMb,
      availableMb,
      requiredMb,
      shortfallMb: availableMb >= requiredMb ? 0 : requiredMb - availableMb,
    };
  } catch {
    // Secure context required - assume sufficient space
    return {
      hasSpace: true,
      availableMb: 0,
      requiredMb,
      shortfallMb: 0,
    };
  }
}
