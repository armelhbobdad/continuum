/**
 * Inference Adapter Factory
 *
 * Returns the appropriate inference adapter based on platform capabilities.
 * AC1: Local Inference on Desktop - routes to Kalosm for Tauri environments
 *
 * ADR-INF-001: Inference Adapter Pattern
 * Desktop uses Kalosm (Rust), web can use WebLLM (future).
 * Adapter abstraction allows swapping implementations without changing UI code.
 */

import type { InferenceAdapter } from "@continuum/inference";
import { KalosmAdapter, StubAdapter } from "@continuum/inference";
import { isDesktop } from "@continuum/platform";

/** Cached adapter instance (singleton) */
let cachedAdapter: InferenceAdapter | null = null;

/**
 * Get the appropriate inference adapter for the current platform.
 *
 * - Desktop (Tauri): Returns KalosmAdapter for local Rust inference
 * - Web (Browser): Returns StubAdapter (future: WebLLM when WebGPU available)
 *
 * The adapter is cached as a singleton to maintain model loading state.
 *
 * @returns InferenceAdapter for the current platform
 */
export function getInferenceAdapter(): InferenceAdapter {
  if (cachedAdapter) {
    return cachedAdapter;
  }

  if (isDesktop()) {
    // Desktop: Use Kalosm via Tauri commands
    cachedAdapter = new KalosmAdapter();
  } else {
    // Web: Use stub for now (WebLLM support in future epic)
    // Future: Check hasLocalInferenceCapability() for WebGPU
    cachedAdapter = new StubAdapter();
  }

  return cachedAdapter;
}

/**
 * Reset the adapter cache.
 * Useful for testing or when platform changes (shouldn't happen in practice).
 */
export function resetAdapterCache(): void {
  cachedAdapter = null;
}
