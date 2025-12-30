/**
 * Stub Adapter for unsupported platforms
 *
 * Provides a no-op implementation of InferenceAdapter for platforms
 * that don't support local inference (e.g., web without WebGPU).
 * Future: Replace with WebLLM adapter when WebGPU is available.
 */

import {
  createInferenceError,
  type InferenceAdapter,
  type InferenceCapabilities,
  type InferenceRequest,
  type InferenceStatus,
  type InferenceToken,
} from "../types";

/**
 * StubAdapter - Fallback for unsupported platforms
 *
 * Throws errors for operations that require local inference.
 * Used when neither Kalosm (desktop) nor WebLLM (web) is available.
 */
export class StubAdapter implements InferenceAdapter {
  private readonly status: InferenceStatus = "unloaded";

  /**
   * Generate throws error - local inference not available
   */
  // biome-ignore lint/correctness/useYield: Stub throws before yielding
  // biome-ignore lint/suspicious/useAwait: Stub throws immediately
  async *generate(_request: InferenceRequest): AsyncIterable<InferenceToken> {
    throw createInferenceError("MODEL_NOT_FOUND", {
      reason: "Local inference not available on this platform",
    });
  }

  /**
   * Abort is a no-op on stub
   */
  async abort(): Promise<void> {
    // No-op - nothing to abort
  }

  /**
   * Model is never loaded on stub
   */
  // biome-ignore lint/suspicious/useAwait: Stub returns immediately
  async isModelLoaded(): Promise<boolean> {
    return false;
  }

  /**
   * Load throws error - no model available
   */
  // biome-ignore lint/suspicious/useAwait: Stub throws immediately
  async loadModel(): Promise<void> {
    throw createInferenceError("MODEL_NOT_FOUND", {
      reason: "Local inference not available on this platform",
    });
  }

  /**
   * Stub capabilities - nothing supported
   */
  getCapabilities(): InferenceCapabilities {
    return {
      supportsStreaming: false,
      supportsAbort: false,
      maxContextLength: 0,
      modelName: "None",
    };
  }

  /**
   * Always unloaded
   */
  getStatus(): InferenceStatus {
    return this.status;
  }
}
