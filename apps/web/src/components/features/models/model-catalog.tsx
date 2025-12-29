"use client";

/**
 * ModelCatalog Component
 * Story 2.2: Model Catalog & Cards
 *
 * Displays available models with hardware-based recommendations.
 * Integrates with hardware store for capability detection and
 * model store for selection state.
 *
 * AC1: Model Catalog Display
 * AC3: Hardware-Based Recommendations (FR27)
 */

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useHardwareStore } from "@/stores/hardware";
import { useModelStore, useModelsWithRecommendations } from "@/stores/models";
import { ModelCard } from "./model-card";

export type ModelCatalogProps = {
  /** Additional CSS classes */
  className?: string;
};

/**
 * ModelCatalog Component
 *
 * Lists available models sorted by hardware recommendation.
 * AC1: Catalog display with name, size, capabilities
 * AC3: Hardware-appropriate models highlighted, recommended first
 */
export function ModelCatalog({ className }: ModelCatalogProps) {
  const { isLoading: hardwareLoading, capabilities } = useHardwareStore();
  const {
    isLoading: modelsLoading,
    error,
    loadModels,
    availableModels,
  } = useModelStore();
  const selectModel = useModelStore((s) => s.selectModel);
  const modelsWithRecommendations = useModelsWithRecommendations();

  // Load models on mount (skip if already loaded)
  useEffect(() => {
    if (availableModels.length === 0) {
      loadModels();
    }
  }, [availableModels.length, loadModels]);

  // Only show skeleton on INITIAL load (no data yet)
  // Don't show skeleton during hardware polling refresh (already have data)
  const isInitialLoad =
    (hardwareLoading && !capabilities) ||
    (modelsLoading && availableModels.length === 0);

  if (isInitialLoad) {
    return <CatalogSkeleton className={className} />;
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          "rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400",
          className
        )}
        role="alert"
      >
        {error}
      </div>
    );
  }

  // Empty state (AC1)
  if (modelsWithRecommendations.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed p-8 text-center text-muted-foreground",
          className
        )}
      >
        No models available
      </div>
    );
  }

  // Model list (AC1, AC3)
  return (
    <div className={cn("space-y-4", className)}>
      <h2 className="font-semibold text-xl">Available Models</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modelsWithRecommendations.map(({ model, recommendation }) => (
          <ModelCard
            key={model.id}
            model={model}
            onSelect={selectModel}
            recommendation={recommendation}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for catalog
 * AC1: Loading state during initial hardware detection
 */
function CatalogSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)} data-testid="catalog-skeleton">
      <div className="h-7 w-48 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            className="h-64 animate-pulse rounded-lg border bg-muted"
            key={i}
          />
        ))}
      </div>
    </div>
  );
}
