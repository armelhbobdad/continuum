/**
 * Platform Capability Detection
 * Detects runtime environment and available capabilities
 * AC1: Platform detection for local inference routing
 */

/** Supported platform types */
export type PlatformType = "desktop" | "web";

/** Platform capabilities for feature detection */
export type PlatformCapabilities = {
  /** Platform type: desktop (Tauri) or web (browser) */
  type: PlatformType;

  /** Whether local inference is available (Kalosm on desktop, WebLLM on web with WebGPU) */
  hasLocalInference: boolean;

  /** Whether WebGPU is available (for web-based inference) */
  hasWebGPU: boolean;

  /** Whether running in Tauri desktop environment */
  isTauri: boolean;

  /** Whether the platform can function offline */
  isOfflineCapable: boolean;
};

/**
 * Detect if running in Tauri desktop environment
 * Checks for Tauri internals injected by the desktop shell
 */
export function isDesktop(): boolean {
  if (typeof globalThis === "undefined") {
    return false;
  }

  // Tauri 2.x detection - cast to access runtime-injected properties
  const global = globalThis as unknown as {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };

  return (
    typeof global.__TAURI__ !== "undefined" ||
    typeof global.__TAURI_INTERNALS__ !== "undefined"
  );
}

/**
 * Check if WebGPU is available for web-based inference
 */
export function hasWebGPU(): boolean {
  if (typeof globalThis === "undefined") {
    return false;
  }
  if (typeof navigator === "undefined") {
    return false;
  }

  return "gpu" in navigator && navigator.gpu !== undefined;
}

/**
 * Check if local inference is available on this platform
 * Desktop: Always true (Kalosm)
 * Web: True if WebGPU available (for future WebLLM support)
 */
export function hasLocalInferenceCapability(): boolean {
  if (isDesktop()) {
    return true; // Desktop always has Kalosm
  }
  return hasWebGPU(); // Web needs WebGPU for WebLLM
}

/**
 * Get current platform capabilities
 * Returns a complete capability profile for the current runtime
 */
export function getPlatform(): PlatformCapabilities {
  const isTauri = isDesktop();
  const webGPU = hasWebGPU();

  return {
    type: isTauri ? "desktop" : "web",
    hasLocalInference: isTauri || webGPU,
    hasWebGPU: webGPU,
    isTauri,
    isOfflineCapable: isTauri, // Desktop can work fully offline
  };
}
