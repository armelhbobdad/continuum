/**
 * useModelSwitch Hook
 * Story 2.4: Model Selection & Switching
 *
 * Handles async model switching with proper state transitions.
 * Integrates with Tauri backend for model loading/unloading.
 *
 * AC2: Model Selection - switch takes effect on next message
 * AC3: Mid-Conversation Switching - preserves previous messages
 *
 * ADR-MODEL-002: Always unload before loading new model
 */

import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";
import { useModelStore } from "@/stores/models";

/** Model switch result */
export interface ModelSwitchResult {
  success: boolean;
  error?: string;
}

/** Model switch state */
export interface ModelSwitchState {
  /** Whether a switch is in progress */
  isSwitching: boolean;
  /** Model being switched to */
  switchingTo: string | null;
  /** Current switch progress phase */
  switchProgress: "unloading" | "loading" | null;
  /** Last error message */
  error: string | null;
}

/**
 * useModelSwitch Hook
 *
 * Provides async model switching with progress tracking.
 * Task 4.1-4.6: Full model switch flow implementation.
 */
export function useModelSwitch() {
  const [state, setState] = useState<ModelSwitchState>({
    isSwitching: false,
    switchingTo: null,
    switchProgress: null,
    error: null,
  });

  // Get store actions
  const selectModel = useModelStore((s) => s.selectModel);
  const selectedModelId = useModelStore((s) => s.selectedModelId);

  /**
   * Switch to a new model.
   * Task 4.1-4.6 implementation.
   *
   * @param modelId - Model to switch to
   * @returns Promise<ModelSwitchResult>
   */
  const switchModel = useCallback(
    async (modelId: string): Promise<ModelSwitchResult> => {
      // Skip if already selected
      if (modelId === selectedModelId) {
        return { success: true };
      }

      const previousModelId = selectedModelId;

      try {
        // Task 4.1: Set switchingTo state and abort any active inference
        setState({
          isSwitching: true,
          switchingTo: modelId,
          switchProgress: "unloading",
          error: null,
        });

        // Task 4.1: Abort any active inference before switching
        await invoke("abort_inference").catch(() => {
          // Ignore abort errors - inference may not be running
        });

        // Task 4.2: Unload current model (NFR15: ≤30s)
        if (previousModelId) {
          await invoke("unload_model");
        }

        // Task 4.3: Load new model with tokenizer source from registry
        setState((prev) => ({ ...prev, switchProgress: "loading" }));
        const { getModelMetadata } = await import("@continuum/inference");
        const metadata = getModelMetadata(modelId);
        if (!metadata) {
          throw new Error(`Model '${modelId}' not found in registry.`);
        }
        await invoke("load_model", {
          modelId,
          tokenizerSource: metadata.tokenizerSource,
        });

        // Task 4.4: Success - update selection
        selectModel(modelId);
        setState({
          isSwitching: false,
          switchingTo: null,
          switchProgress: null,
          error: null,
        });

        return { success: true };
      } catch (error) {
        // Task 4.5: Error - revert to previous model
        const errorMessage =
          error instanceof Error ? error.message : "Model switch failed";

        // Try to reload previous model if available
        if (previousModelId) {
          try {
            const { getModelMetadata: getMeta } = await import(
              "@continuum/inference"
            );
            const prevMeta = getMeta(previousModelId);
            if (prevMeta) {
              await invoke("load_model", {
                modelId: previousModelId,
                tokenizerSource: prevMeta.tokenizerSource,
              });
            }
          } catch {
            // Failed to reload previous - leave in unloaded state
          }
        }

        setState({
          isSwitching: false,
          switchingTo: null,
          switchProgress: null,
          error: errorMessage,
        });

        return { success: false, error: errorMessage };
      }
    },
    [selectedModelId, selectModel]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    switchModel,
    clearError,
  };
}
