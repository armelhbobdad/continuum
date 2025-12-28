/**
 * Model Store
 *
 * Zustand store for managing model selection and download state.
 * Uses persist middleware for downloaded models and selection.
 *
 * Story 2.2: Model Catalog & Cards
 * ADR-MODEL-002: Zustand with Persist for User Model Selections
 *
 * Persistence Boundary:
 * - downloadedModels: Persisted (user's installed models)
 * - selectedModelId: Persisted (last active model)
 * - availableModels: NOT persisted (fetched from registry)
 * - isLoading/error: NOT persisted (transient UI state)
 */

import type { ModelMetadata } from "@continuum/inference";
import { getModelMetadata, listModels } from "@continuum/inference";
import {
  getModelRecommendation,
  type ModelRecommendation,
} from "@continuum/platform";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useHardwareStore } from "./hardware";

/** Storage key for model data */
const STORAGE_KEY = "continuum-models";

/** Model store state */
export interface ModelState {
  /** All available models from registry */
  availableModels: ModelMetadata[];
  /** User's downloaded model IDs */
  downloadedModels: string[];
  /** Currently selected model for inference */
  selectedModelId: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;

  /** Load models from registry */
  loadModels: () => Promise<void>;
  /** Select a model for inference */
  selectModel: (modelId: string) => void;
  /** Mark a model as downloaded */
  addDownloadedModel: (modelId: string) => void;
  /** Remove a downloaded model */
  removeDownloadedModel: (modelId: string) => void;
}

/**
 * Model store with persistence for downloaded models and selection.
 * ADR-MODEL-002: Persist user model selections across restarts
 */
export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      availableModels: [],
      downloadedModels: [],
      selectedModelId: null,
      isLoading: false,
      error: null,

      loadModels: async () => {
        set({ isLoading: true, error: null });
        try {
          const models = listModels();
          set({ availableModels: models, isLoading: false });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : "Failed to load models",
          });
        }
      },

      selectModel: (modelId: string) => {
        const model = getModelMetadata(modelId);
        if (model) {
          set({ selectedModelId: modelId });
        }
      },

      addDownloadedModel: (modelId: string) => {
        set((state) => ({
          downloadedModels: [...new Set([...state.downloadedModels, modelId])],
        }));
      },

      removeDownloadedModel: (modelId: string) => {
        set((state) => ({
          downloadedModels: state.downloadedModels.filter(
            (id) => id !== modelId
          ),
          // Clear selection if removed model was selected
          selectedModelId:
            state.selectedModelId === modelId ? null : state.selectedModelId,
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist user data, not transient state
      partialize: (state) => ({
        downloadedModels: state.downloadedModels,
        selectedModelId: state.selectedModelId,
      }),
    }
  )
);

/** Model with recommendation */
export interface ModelWithRecommendation {
  model: ModelMetadata;
  recommendation: ModelRecommendation;
}

/**
 * Selector hook: Get models sorted by recommendation.
 * Integrates with hardware store for live recommendations.
 *
 * AC3: Hardware-Based Recommendations
 */
export function useModelsWithRecommendations(): ModelWithRecommendation[] {
  const availableModels = useModelStore((s) => s.availableModels);
  const capabilities = useHardwareStore((s) => s.capabilities);

  if (!capabilities) {
    // No hardware detected yet - return default recommendation
    return availableModels.map((model) => ({
      model,
      recommendation: "may-be-slow" as const,
    }));
  }

  return availableModels
    .map((model) => ({
      model,
      recommendation: getModelRecommendation(model.requirements, capabilities),
    }))
    .sort((a, b) => {
      // Sort order: recommended > may-be-slow > not-recommended
      const order: Record<ModelRecommendation, number> = {
        recommended: 0,
        "may-be-slow": 1,
        "not-recommended": 2,
      };
      return order[a.recommendation] - order[b.recommendation];
    });
}
