/**
 * Model Store
 *
 * Zustand store for managing model selection and download state.
 * Uses persist middleware for downloaded models and selection.
 *
 * Story 2.2: Model Catalog & Cards
 * Story 2.4: Model Selection & Switching
 * Story 2.5: Model Integrity Verification
 * ADR-MODEL-002: Zustand with Persist for User Model Selections
 * ADR-VERIFY-004: Verification status persisted
 *
 * Persistence Boundary:
 * - downloadedModels: Persisted (user's installed models)
 * - selectedModelId: Persisted (last active model)
 * - verificationStatus: Persisted (user expects badges across restarts)
 * - pinnedVersions: Persisted (version pinning is intentional)
 * - availableModels: NOT persisted (fetched from registry)
 * - isLoading/error: NOT persisted (transient UI state)
 * - switchingTo/switchProgress: NOT persisted (transient switch state)
 */

import type { ModelMetadata, VerificationInfo } from "@continuum/inference";
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

/** Switch progress phases */
export type SwitchProgress = "unloading" | "loading" | null;

/** Model store state */
export type ModelState = {
  /** All available models from registry */
  availableModels: ModelMetadata[];
  /** User's downloaded model IDs */
  downloadedModels: string[];
  /** Currently selected model for inference */
  selectedModelId: string | null;
  /** Model we're currently switching to (memory-only) */
  switchingTo: string | null;
  /** Current switch progress phase (memory-only) */
  switchProgress: SwitchProgress;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;

  // Story 2.5: Verification state (persisted)
  /** Verification status for each model */
  verificationStatus: Record<string, VerificationInfo>;
  /** Pinned model versions (modelId -> version) */
  pinnedVersions: Record<string, string>;

  /** Load models from registry */
  loadModels: () => Promise<void>;
  /**
   * Set the selected model ID in state (sync operation).
   * NOTE: This only updates the selectedModelId in state. It does NOT load
   * the model via Tauri IPC. Use useModelSwitch().switchModel() to actually
   * load/unload models in the backend. This is by design for lazy loading -
   * model loading happens when the user sends their first message.
   *
   * @param modelId - Model ID to select
   */
  selectModel: (modelId: string) => void;
  /** Mark a model as downloaded */
  addDownloadedModel: (modelId: string) => void;
  /** Remove a downloaded model */
  removeDownloadedModel: (modelId: string) => void;
  /** Get full metadata for selected model */
  getSelectedModel: () => ModelMetadata | null;

  // Story 2.5: Verification actions
  /** Set verification status for a model */
  setVerificationStatus: (modelId: string, info: VerificationInfo) => void;
  /** Clear verification status for a model */
  clearVerificationStatus: (modelId: string) => void;
  /** Pin a model to a specific version */
  pinVersion: (modelId: string, version: string) => void;
  /** Unpin a model (allow auto-updates) */
  unpinVersion: (modelId: string) => void;
  /** Check if a model is pinned */
  isVersionPinned: (modelId: string) => boolean;
};

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
      switchingTo: null,
      switchProgress: null,
      isLoading: false,
      error: null,
      // Story 2.5: Verification state
      verificationStatus: {},
      pinnedVersions: {},

      // biome-ignore lint/suspicious/useAwait: Zustand store action pattern
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
          // Clear verification status for removed model
          verificationStatus: Object.fromEntries(
            Object.entries(state.verificationStatus).filter(
              ([id]) => id !== modelId
            )
          ),
          // Clear pinned version for removed model
          pinnedVersions: Object.fromEntries(
            Object.entries(state.pinnedVersions).filter(
              ([id]) => id !== modelId
            )
          ),
        }));
      },

      getSelectedModel: () => {
        const { selectedModelId } = get();
        if (!selectedModelId) {
          return null;
        }
        return getModelMetadata(selectedModelId) ?? null;
      },

      // Story 2.5: Verification actions
      setVerificationStatus: (modelId: string, info: VerificationInfo) => {
        set((state) => ({
          verificationStatus: {
            ...state.verificationStatus,
            [modelId]: info,
          },
        }));
      },

      clearVerificationStatus: (modelId: string) => {
        set((state) => ({
          verificationStatus: Object.fromEntries(
            Object.entries(state.verificationStatus).filter(
              ([id]) => id !== modelId
            )
          ),
        }));
      },

      pinVersion: (modelId: string, version: string) => {
        set((state) => ({
          pinnedVersions: {
            ...state.pinnedVersions,
            [modelId]: version,
          },
        }));
      },

      unpinVersion: (modelId: string) => {
        set((state) => ({
          pinnedVersions: Object.fromEntries(
            Object.entries(state.pinnedVersions).filter(
              ([id]) => id !== modelId
            )
          ),
        }));
      },

      isVersionPinned: (modelId: string) => modelId in get().pinnedVersions,
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist user data, not transient state
      // Story 2.4: switchingTo/switchProgress are NOT persisted
      // Story 2.5: verificationStatus and pinnedVersions ARE persisted
      partialize: (state) => ({
        downloadedModels: state.downloadedModels,
        selectedModelId: state.selectedModelId,
        verificationStatus: state.verificationStatus,
        pinnedVersions: state.pinnedVersions,
      }),
    }
  )
);

/** Model with recommendation */
export type ModelWithRecommendation = {
  model: ModelMetadata;
  recommendation: ModelRecommendation;
};

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
