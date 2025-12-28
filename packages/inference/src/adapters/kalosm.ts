/**
 * Kalosm Adapter for Desktop (Tauri)
 *
 * Bridges TypeScript frontend to Rust Kalosm inference via Tauri commands.
 * AC: All - Core adapter for local inference integration
 *
 * ADR-INF-002: Tauri IPC for Inference
 * Inference runs in Rust, invoked via Tauri commands, tokens streamed via events.
 */

import { invoke } from "@tauri-apps/api/core";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";
import type {
  InferenceAdapter,
  InferenceCapabilities,
  InferenceRequest,
  InferenceStatus,
  InferenceToken,
} from "../types";

/** Token event payload from Tauri */
interface TokenPayload {
  text: string;
}

/** Polling interval for token yield */
const TOKEN_POLL_INTERVAL_MS = 10;

/**
 * KalosmAdapter - Desktop inference via Tauri/Kalosm
 *
 * Implements InferenceAdapter for the desktop platform using:
 * - Tauri invoke() for RPC to Rust backend
 * - Tauri listen() for streaming token events
 */
export class KalosmAdapter implements InferenceAdapter {
  private status: InferenceStatus = "unloaded";
  private unlisteners: UnlistenFn[] = [];

  /**
   * Generate tokens from prompt. Returns async iterator for streaming.
   * AC2: Warm model latency - first token within 2 seconds
   * AC5: Generation rate >= 10 tokens/second
   */
  async *generate(request: InferenceRequest): AsyncIterable<InferenceToken> {
    const tokens: InferenceToken[] = [];
    let currentIndex = 0;
    let isComplete = false;
    let error: Error | null = null;

    // Set up event listeners before starting generation
    const tokenUnlisten = await listen<TokenPayload>(
      "inference:token",
      (event) => {
        tokens.push({ text: event.payload.text });
      }
    );
    this.unlisteners.push(tokenUnlisten);

    const completeUnlisten = await listen("inference:complete", () => {
      isComplete = true;
    });
    this.unlisteners.push(completeUnlisten);

    const errorUnlisten = await listen<string>("inference:error", (event) => {
      error = new Error(event.payload);
      isComplete = true;
    });
    this.unlisteners.push(errorUnlisten);

    // Start generation (fire and forget - events handle the response)
    invoke("generate", {
      prompt: request.prompt,
      maxTokens: request.maxTokens,
    }).catch((e) => {
      error = e instanceof Error ? e : new Error(String(e));
      isComplete = true;
    });

    this.status = "generating";

    // Yield tokens as they arrive
    try {
      while (!isComplete || currentIndex < tokens.length) {
        if (currentIndex < tokens.length) {
          const token = tokens[currentIndex];
          if (token) {
            yield token;
            currentIndex++;
          }
        } else if (!isComplete) {
          // Wait for more tokens
          await new Promise((r) => setTimeout(r, TOKEN_POLL_INTERVAL_MS));
        }

        if (error) {
          throw error;
        }
      }
    } finally {
      // Clean up listeners
      this.cleanup();
      this.status = "loaded";
    }
  }

  /**
   * Abort ongoing generation. Safe to call if not generating.
   * AC4: Inference stops immediately on abort
   */
  async abort(): Promise<void> {
    await invoke("abort_inference");
    this.cleanup();
    this.status = "loaded";
  }

  /**
   * Check if model is loaded and ready.
   * Used to determine if cold start is needed (AC3)
   */
  async isModelLoaded(): Promise<boolean> {
    const status = await invoke<string>("get_model_status");
    return status === "loaded";
  }

  /**
   * Load model if not already loaded.
   * AC3: Model loads within 10 seconds
   *
   * Story 2.4: Updated to accept modelId for loading downloaded models.
   * Uses FileSource::Local on Rust side to load from app_data_dir/models/{modelId}.gguf
   * Tokenizer is loaded from app_data_dir/models/{modelId}.tokenizer.json
   *
   * @param modelId - The model identifier (e.g., "phi-3-mini")
   * @throws Error if modelId not provided
   */
  async loadModel(modelId?: string): Promise<void> {
    if (!modelId) {
      throw new Error("Model ID required. Use auto-select or specify a model.");
    }

    this.status = "loading";
    await invoke("load_model", { modelId });
    this.status = "loaded";
  }

  /**
   * Unload current model to free GPU/RAM.
   * ADR-MODEL-002: Always unload before switching models.
   */
  async unloadModel(): Promise<void> {
    await invoke("unload_model");
    this.status = "unloaded";
  }

  /**
   * Get adapter capabilities for UI adaptation.
   * Enables feature detection for streaming, abort support, etc.
   */
  getCapabilities(): InferenceCapabilities {
    return {
      supportsStreaming: true,
      supportsAbort: true,
      maxContextLength: 4096, // Phi-3 default context
      modelName: "Phi-3",
    };
  }

  /**
   * Get current inference status for UI state management.
   * Uses locally cached status for synchronous access.
   */
  getStatus(): InferenceStatus {
    return this.status;
  }

  /**
   * Clean up event listeners
   */
  private cleanup(): void {
    for (const unlisten of this.unlisteners) {
      unlisten();
    }
    this.unlisteners = [];
  }
}
