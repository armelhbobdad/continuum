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
import { StubAdapter } from "@continuum/inference";
import { isDesktop } from "@continuum/platform";

/** Cached adapter instance (singleton) */
let cachedAdapter: InferenceAdapter | null = null;

/** Lazy-loaded KalosmAdapter to avoid importing @tauri-apps/api at module load time */
let KalosmAdapterClass: (new () => InferenceAdapter) | null = null;

async function getKalosmAdapter(): Promise<InferenceAdapter> {
  if (!KalosmAdapterClass) {
    // Dynamic import to avoid loading @tauri-apps/api during SSR/hydration
    const { KalosmAdapter } = await import("@continuum/inference");
    KalosmAdapterClass = KalosmAdapter;
  }
  return new KalosmAdapterClass();
}

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
    // Note: KalosmAdapter is loaded lazily on first use via getInferenceAdapterAsync
    // For sync access, return a proxy that will be replaced on first async call
    cachedAdapter = new StubAdapter(); // Temporary until async init
  } else {
    // Web: Use stub for now (WebLLM support in future epic)
    cachedAdapter = new StubAdapter();
  }

  return cachedAdapter;
}

/**
 * Get the inference adapter asynchronously (required for desktop to load Kalosm).
 * Call this before starting inference to ensure the correct adapter is loaded.
 */
export async function getInferenceAdapterAsync(): Promise<InferenceAdapter> {
  if (cachedAdapter && !(cachedAdapter instanceof StubAdapter && isDesktop())) {
    return cachedAdapter;
  }

  if (isDesktop()) {
    cachedAdapter = await getKalosmAdapter();
  } else {
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
  KalosmAdapterClass = null;
}
