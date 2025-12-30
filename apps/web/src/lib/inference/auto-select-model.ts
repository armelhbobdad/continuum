/**
 * Auto-Select Model Logic
 * Story 2.4: Model Selection & Switching
 *
 * Automatically selects the best model based on hardware capabilities.
 * AC5: Auto-Selection - system auto-selects recommended model for hardware.
 *
 * Task 7.1: Create auto-select-model.ts
 * Task 7.2: Pick best match from downloaded models
 * Task 7.3: Use hardware capabilities to rank models (prefer "recommended" tier)
 * Task 7.4: Handle no downloaded models case
 * Task 7.5: Store auto-selected model as user preference
 */

import type { ModelMetadata } from "@continuum/inference";
import type {
  HardwareCapabilities,
  ModelRecommendation,
} from "@continuum/platform";
import { getModelRecommendation } from "@continuum/platform";

/** Result of auto-selection attempt */
export interface AutoSelectResult {
  /** Whether auto-selection succeeded */
  success: boolean;
  /** Selected model ID (if successful) */
  modelId: string | null;
  /** Reason if selection failed */
  reason?: AutoSelectFailureReason;
  /** The selected model metadata (if successful) */
  model?: ModelMetadata;
  /** The recommendation level of the selected model */
  recommendation?: ModelRecommendation;
}

/** Reasons why auto-selection might fail */
export type AutoSelectFailureReason =
  | "no-downloaded-models"
  | "no-compatible-models"
  | "hardware-not-detected";

/** Model with its recommendation for sorting */
interface RankedModel {
  model: ModelMetadata;
  recommendation: ModelRecommendation;
  /** Score for sorting (higher = better) */
  score: number;
}

/** Score values for recommendation levels */
const RECOMMENDATION_SCORES: Record<ModelRecommendation, number> = {
  recommended: 100,
  "may-be-slow": 50,
  "not-recommended": 0,
};

/**
 * Auto-select the best model from downloaded models based on hardware.
 *
 * Selection priority:
 * 1. "recommended" tier models (sorted by RAM requirement - prefer smaller)
 * 2. "may-be-slow" tier models (sorted by RAM requirement - prefer smaller)
 * 3. "not-recommended" tier models (last resort)
 *
 * Task 7.2-7.3: Pick best match using hardware capabilities
 *
 * @param downloadedModels - IDs of downloaded models
 * @param availableModels - All model metadata
 * @param hardware - Detected hardware capabilities (null if not detected)
 * @returns AutoSelectResult with selected model or failure reason
 */
export function autoSelectModel(
  downloadedModels: string[],
  availableModels: ModelMetadata[],
  hardware: HardwareCapabilities | null
): AutoSelectResult {
  // Task 7.4: Handle no downloaded models
  if (downloadedModels.length === 0) {
    return {
      success: false,
      modelId: null,
      reason: "no-downloaded-models",
    };
  }

  // Get metadata for downloaded models only
  const downloadedModelsWithMeta = availableModels.filter((m) =>
    downloadedModels.includes(m.id)
  );

  if (downloadedModelsWithMeta.length === 0) {
    return {
      success: false,
      modelId: null,
      reason: "no-downloaded-models",
    };
  }

  // If hardware not detected, use conservative defaults
  // Still allow selection but with "may-be-slow" as default recommendation
  if (!hardware) {
    // Fall back to smallest model by RAM requirement
    const sortedByRam = [...downloadedModelsWithMeta].sort(
      (a, b) => a.requirements.ramMb - b.requirements.ramMb
    );
    const selected = sortedByRam[0];
    return {
      success: true,
      modelId: selected.id,
      model: selected,
      recommendation: "may-be-slow",
    };
  }

  // Rank all downloaded models by recommendation and RAM efficiency
  const rankedModels: RankedModel[] = downloadedModelsWithMeta.map((model) => {
    const recommendation = getModelRecommendation(model.requirements, hardware);
    const baseScore = RECOMMENDATION_SCORES[recommendation];

    // Within same recommendation tier, prefer smaller models (more efficient)
    // Normalize RAM to a 0-99 bonus (smaller = higher bonus)
    const maxRam = Math.max(
      ...downloadedModelsWithMeta.map((m) => m.requirements.ramMb)
    );
    const ramEfficiencyBonus = Math.floor(
      ((maxRam - model.requirements.ramMb) / maxRam) * 99
    );

    return {
      model,
      recommendation,
      score: baseScore + ramEfficiencyBonus,
    };
  });

  // Sort by score (highest first)
  rankedModels.sort((a, b) => b.score - a.score);

  // Check if all models are not-recommended
  const allNotRecommended = rankedModels.every(
    (r) => r.recommendation === "not-recommended"
  );

  if (allNotRecommended) {
    // Still select one, but indicate it's not ideal
    const selected = rankedModels[0];
    return {
      success: true,
      modelId: selected.model.id,
      model: selected.model,
      recommendation: selected.recommendation,
    };
  }

  // Select the best ranked model
  const selected = rankedModels[0];
  return {
    success: true,
    modelId: selected.model.id,
    model: selected.model,
    recommendation: selected.recommendation,
  };
}

/**
 * Check if auto-selection is needed.
 * Returns true if:
 * - No model is currently selected
 * - Selected model is not in downloaded models
 *
 * @param selectedModelId - Currently selected model ID (null if none)
 * @param downloadedModels - IDs of downloaded models
 * @returns boolean - Whether auto-selection is needed
 */
export function needsAutoSelection(
  selectedModelId: string | null,
  downloadedModels: string[]
): boolean {
  // No model selected
  if (!selectedModelId) {
    return true;
  }

  // Selected model not in downloaded models (was deleted?)
  if (!downloadedModels.includes(selectedModelId)) {
    return true;
  }

  return false;
}

/**
 * Get a message to display when auto-selection fails.
 *
 * @param reason - Failure reason from auto-selection
 * @returns User-friendly message
 */
export function getAutoSelectFailureMessage(
  reason: AutoSelectFailureReason
): string {
  switch (reason) {
    case "no-downloaded-models":
      return "No models downloaded. Please download a model from the catalog to get started.";
    case "no-compatible-models":
      return "No compatible models found for your hardware. Try downloading a smaller model.";
    case "hardware-not-detected":
      return "Unable to detect hardware capabilities. Please select a model manually.";
    default:
      return "Unable to auto-select a model. Please select one manually.";
  }
}
