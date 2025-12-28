"use client";

/**
 * Models Page Content
 *
 * Client component for model management page.
 * Story 2.2: Model Catalog & Cards
 *
 * Starts hardware polling and displays model catalog.
 */

import { useEffect } from "react";
import { ModelCatalog } from "@/components/features/models";
import { useHardwareStore } from "@/stores/hardware";

/**
 * Models page content with hardware polling integration.
 * Ensures hardware capabilities are detected for recommendations.
 */
export function ModelsPageContent() {
  const { startPolling, stopPolling } = useHardwareStore();

  // Start hardware polling on mount, stop on unmount
  useEffect(() => {
    startPolling();
    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-bold text-3xl">Model Management</h1>
        <p className="mt-2 text-muted-foreground">
          Browse available AI models and select one for local inference.
          Recommendations are based on your hardware capabilities.
        </p>
      </header>

      <ModelCatalog />
    </div>
  );
}
