"use client";

/**
 * ChatModelSelector Component
 * Story 2.4: Model Selection & Switching
 *
 * Compact dropdown for selecting models directly from the chat interface.
 * Allows users to switch between downloaded models without leaving the chat.
 *
 * AC1: Model List Display - shows downloaded models with current selection
 * AC2: Model Selection - click to select, triggers switch flow
 * AC4: Hardware Warning - shows warning dialog for demanding models
 */

import type { ModelMetadata } from "@continuum/inference";
import { getModelMetadata } from "@continuum/inference";
import type { ModelRecommendation } from "@continuum/platform";
import { getModelRecommendation } from "@continuum/platform";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useHardwareStore } from "@/stores/hardware";
import { useModelStore } from "@/stores/models";
import {
  HardwareWarningDialog,
  shouldShowHardwareWarning,
} from "../models/hardware-warning-dialog";

/** Recommendation badge colors */
const recommendationColors: Record<ModelRecommendation, string> = {
  recommended: "text-green-600 dark:text-green-400",
  "may-be-slow": "text-yellow-600 dark:text-yellow-400",
  "not-recommended": "text-red-600 dark:text-red-400",
};

/** Recommendation labels */
const recommendationLabels: Record<ModelRecommendation, string> = {
  recommended: "Recommended",
  "may-be-slow": "May be slow",
  "not-recommended": "Not recommended",
};

/** State for pending model selection (when warning dialog is shown) */
type PendingSelection = {
  model: ModelMetadata;
  recommendation: ModelRecommendation;
};

export type ChatModelSelectorProps = {
  /** Additional CSS classes */
  className?: string;
  /** Whether selection is disabled (e.g., during inference) */
  disabled?: boolean;
};

/**
 * ChatModelSelector Component
 *
 * Compact dropdown showing current model with ability to switch.
 * Integrates with model store and shows hardware recommendations.
 */
export function ChatModelSelector({
  className,
  disabled = false,
}: ChatModelSelectorProps) {
  const downloadedModels = useModelStore((s) => s.downloadedModels);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const availableModels = useModelStore((s) => s.availableModels);
  const selectModel = useModelStore((s) => s.selectModel);
  const loadModels = useModelStore((s) => s.loadModels);
  const capabilities = useHardwareStore((s) => s.capabilities);

  // State for hardware warning dialog (AC4)
  const [pendingSelection, setPendingSelection] =
    useState<PendingSelection | null>(null);

  // Load models on mount if not already loaded
  useEffect(() => {
    if (availableModels.length === 0) {
      loadModels();
    }
  }, [availableModels.length, loadModels]);

  // Get downloaded models with metadata
  const downloadedModelsWithMeta = availableModels.filter((m) =>
    downloadedModels.includes(m.id)
  );

  // Get current model name
  const currentModel = selectedModelId
    ? getModelMetadata(selectedModelId)
    : null;
  const currentModelName = currentModel?.name ?? "Select Model";

  // Get recommendation for a model
  const getRecommendation = (model: ModelMetadata): ModelRecommendation => {
    if (!capabilities) {
      return "may-be-slow";
    }
    return getModelRecommendation(model.requirements, capabilities);
  };

  // Handle model selection with hardware warning check (AC4)
  const handleSelect = (modelId: string) => {
    if (modelId === selectedModelId) {
      return; // Already selected
    }

    const model = availableModels.find((m) => m.id === modelId);
    if (!model) {
      return;
    }

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
    selectModel(modelId);
  };

  // Confirm selection (called after warning dialog)
  const confirmSelection = () => {
    if (pendingSelection) {
      selectModel(pendingSelection.model.id);
      setPendingSelection(null);
    }
  };

  // Cancel pending selection (from warning dialog)
  const cancelSelection = () => {
    setPendingSelection(null);
  };

  // No downloaded models - show placeholder
  if (downloadedModelsWithMeta.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 rounded-md border border-dashed px-3 py-1.5 text-muted-foreground text-sm",
          className
        )}
        data-testid="chat-model-selector-empty"
      >
        <span>No models downloaded</span>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex items-center gap-1 rounded-md border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          data-testid="chat-model-selector-trigger"
          disabled={disabled}
        >
          <span className="max-w-32 truncate font-medium">
            {currentModelName}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Select Model</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />

          <DropdownMenuRadioGroup
            onValueChange={handleSelect}
            value={selectedModelId ?? ""}
          >
            {downloadedModelsWithMeta.map((model) => {
              const recommendation = getRecommendation(model);
              const isSelected = model.id === selectedModelId;

              return (
                <DropdownMenuRadioItem
                  data-state={isSelected ? "selected" : undefined}
                  data-testid={`model-option-${model.id}`}
                  key={model.id}
                  value={model.id}
                >
                  <div className="flex w-full flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{model.name}</span>
                      <span
                        className={cn(
                          "text-xs",
                          recommendationColors[recommendation]
                        )}
                      >
                        {recommendationLabels[recommendation]}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {formatMb(model.requirements.ramMb)} RAM
                    </span>
                  </div>
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hardware Warning Dialog (AC4) */}
      {pendingSelection !== null && capabilities !== null && (
        <HardwareWarningDialog
          hardware={capabilities}
          model={pendingSelection.model}
          onCancel={cancelSelection}
          onConfirm={() => {
            if (pendingSelection) {
              confirmSelection();
            }
          }}
          open={true}
          recommendation={pendingSelection.recommendation}
        />
      )}
    </>
  );
}

/**
 * Format MB to human-readable string (GB if >= 1024)
 */
function formatMb(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}
