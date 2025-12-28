"use client";

/**
 * ModelSelector Component
 * Story 2.4: Model Selection & Switching
 *
 * Compact UI for selecting from downloaded models.
 * Uses CVA for visual states and integrates with hardware recommendations.
 *
 * AC1: Model List Display - shows downloaded models with selected highlight
 * AC2: Model Selection - click to select, triggers switch flow
 * AC4: Hardware Warning - shows warning dialog for demanding models
 *
 * ADR-MODEL-004: CVA variants for selection states
 */

import type { ModelMetadata } from "@continuum/inference";
import type { ModelRecommendation } from "@continuum/platform";
import { getModelRecommendation } from "@continuum/platform";
import { cva, type VariantProps } from "class-variance-authority";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useHardwareStore } from "@/stores/hardware";
import { useModelStore } from "@/stores/models";
import {
  HardwareWarningDialog,
  shouldShowHardwareWarning,
} from "./hardware-warning-dialog";

/**
 * CVA variants for ModelSelector option items.
 * ADR-MODEL-004: Visual states for selection
 */
const selectorOptionVariants = cva(
  // Base styles - all options
  "flex cursor-pointer items-center justify-between rounded-md border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      state: {
        default: "border-border bg-card hover:bg-accent",
        selected: "border-primary bg-primary/10 ring-1 ring-primary",
        warning: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
        disabled: "cursor-not-allowed border-muted bg-muted/50 opacity-50",
      },
    },
    defaultVariants: {
      state: "default",
    },
  }
);

/**
 * Badge styles for recommendation display
 */
const badgeVariants = cva("rounded-full px-2 py-0.5 font-medium text-xs", {
  variants: {
    recommendation: {
      recommended: "bg-green-500 text-white",
      "may-be-slow": "bg-yellow-500 text-black",
      "not-recommended": "bg-red-500 text-white",
    },
  },
  defaultVariants: {
    recommendation: "recommended",
  },
});

/** State for pending model selection (when warning dialog is shown) */
interface PendingSelection {
  model: ModelMetadata;
  recommendation: ModelRecommendation;
}

export interface ModelSelectorProps {
  /** Additional CSS classes */
  className?: string;
  /** Callback after model selection (optional) */
  onSelect?: (modelId: string) => void;
}

/**
 * ModelSelector Component
 *
 * Displays downloaded models for selection with hardware recommendations.
 * AC1: Model List Display with selected highlight
 * AC2: Click to select model
 * AC4: Hardware warning dialog for demanding models
 */
export function ModelSelector({ className, onSelect }: ModelSelectorProps) {
  const downloadedModels = useModelStore((s) => s.downloadedModels);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const availableModels = useModelStore((s) => s.availableModels);
  const selectModel = useModelStore((s) => s.selectModel);
  const capabilities = useHardwareStore((s) => s.capabilities);

  // State for hardware warning dialog (AC4)
  const [pendingSelection, setPendingSelection] =
    useState<PendingSelection | null>(null);

  // Get downloaded models with metadata
  const downloadedModelsWithMeta = availableModels.filter((m) =>
    downloadedModels.includes(m.id)
  );

  // Get recommendation for a model
  const getRecommendation = (model: ModelMetadata): ModelRecommendation => {
    if (!capabilities) return "may-be-slow";
    return getModelRecommendation(model.requirements, capabilities);
  };

  // Handle model selection with hardware warning check (AC4)
  const handleSelect = (model: ModelMetadata) => {
    if (model.id === selectedModelId) return; // Already selected

    const recommendation = getRecommendation(model);

    // Check if we should show hardware warning (AC4)
    if (
      capabilities &&
      shouldShowHardwareWarning(model, capabilities, recommendation)
    ) {
      // Show warning dialog instead of immediate selection
      setPendingSelection({ model, recommendation });
      return;
    }

    // No warning needed, proceed with selection
    confirmSelection(model.id);
  };

  // Confirm selection (called directly or after warning dialog)
  const confirmSelection = (modelId: string) => {
    selectModel(modelId);
    onSelect?.(modelId);
    setPendingSelection(null);
  };

  // Cancel pending selection (from warning dialog)
  const cancelSelection = () => {
    setPendingSelection(null);
  };

  // Get state for CVA variant
  const getOptionState = (
    modelId: string,
    recommendation: ModelRecommendation
  ): VariantProps<typeof selectorOptionVariants>["state"] => {
    if (modelId === selectedModelId) return "selected";
    if (recommendation === "not-recommended") return "warning";
    return "default";
  };

  // Recommendation labels
  const recommendationLabels: Record<ModelRecommendation, string> = {
    recommended: "Recommended",
    "may-be-slow": "May be slow",
    "not-recommended": "Not recommended",
  };

  // Get selected model name for aria-live announcement
  const selectedModel = downloadedModelsWithMeta.find(
    (m) => m.id === selectedModelId
  );

  if (downloadedModelsWithMeta.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed p-6 text-center text-muted-foreground",
          className
        )}
        data-testid="model-selector-empty"
      >
        <p>No models downloaded</p>
        <p className="mt-1 text-sm">
          Download a model from the catalog to get started.
        </p>
        {/* ARIA live region for status updates */}
        <div aria-live="polite" className="sr-only" role="status">
          No models available for selection
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)} data-testid="model-selector">
      {/* Listbox for model selection */}
      <div
        aria-label="Select a model"
        className="space-y-2"
        role="listbox"
        tabIndex={0}
      >
        {downloadedModelsWithMeta.map((model) => {
          const recommendation = getRecommendation(model);
          const isSelected = model.id === selectedModelId;
          const optionState = getOptionState(model.id, recommendation);

          return (
            <div
              aria-selected={isSelected}
              className={cn(selectorOptionVariants({ state: optionState }))}
              data-state={optionState}
              key={model.id}
              onClick={() => handleSelect(model)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(model);
                }
              }}
              role="option"
              tabIndex={0}
            >
              {/* Model info */}
              <div className="flex flex-col">
                <span className="font-medium">{model.name}</span>
                <span className="text-muted-foreground text-xs">
                  {formatMb(model.requirements.ramMb)} RAM •{" "}
                  {model.contextLength.toLocaleString()} tokens
                </span>
              </div>

              {/* Recommendation badge */}
              <span className={cn(badgeVariants({ recommendation }))}>
                {recommendationLabels[recommendation]}
              </span>
            </div>
          );
        })}
      </div>

      {/* ARIA live region for selection changes */}
      <div aria-live="polite" className="sr-only" role="status">
        {selectedModel
          ? `Selected model: ${selectedModel.name}`
          : "No model selected"}
      </div>

      {/* Hardware Warning Dialog (AC4) */}
      {pendingSelection && capabilities && (
        <HardwareWarningDialog
          hardware={capabilities}
          model={pendingSelection.model}
          onCancel={cancelSelection}
          onConfirm={() => confirmSelection(pendingSelection.model.id)}
          open={true}
          recommendation={pendingSelection.recommendation}
        />
      )}
    </div>
  );
}

/**
 * Format MB to human-readable string (GB if >= 1024)
 */
function formatMb(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}
