/**
 * useContextHealth Hook
 *
 * Story 3.4: Context Health Indicators
 * Task 5: Hook to calculate context health for the active session.
 *
 * Reactively updates when:
 * - Active session changes
 * - Messages are added/updated
 * - Selected model changes
 *
 * AC: #1, #5 - Model-Specific Thresholds
 */
import { getModelMetadata } from "@continuum/inference";
import { useMemo } from "react";
import {
  type ContextHealth,
  calculateContextHealth,
} from "@/lib/context/context-health";
import {
  type ContextMetrics,
  countSessionTokens,
} from "@/lib/context/count-tokens";
import { useModelStore } from "@/stores/models";
import { useSessionStore } from "@/stores/session";

/**
 * Result returned by useContextHealth hook.
 */
export interface UseContextHealthResult {
  /** Calculated context health */
  health: ContextHealth | null;
  /** Raw metrics for debugging */
  metrics: ContextMetrics | null;
  /** Model's context window size */
  modelContextLength: number;
  /** True if loading model or session data */
  isLoading: boolean;
}

/**
 * Default context length if no model selected.
 * Uses conservative value (stablelm-zephyr) to be safe.
 */
const DEFAULT_CONTEXT_LENGTH = 2048;

/**
 * Hook to calculate context health for the active session.
 *
 * @returns Context health state including metrics and loading status
 */
export function useContextHealth(): UseContextHealthResult {
  // Get active session
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const sessions = useSessionStore((s) => s.sessions);
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId),
    [sessions, activeSessionId]
  );

  // Get selected model context length
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const modelContextLength = useMemo(() => {
    if (!selectedModelId) {
      return DEFAULT_CONTEXT_LENGTH;
    }
    const model = getModelMetadata(selectedModelId);
    return model?.contextLength ?? DEFAULT_CONTEXT_LENGTH;
  }, [selectedModelId]);

  // Calculate metrics and health
  const result = useMemo((): UseContextHealthResult => {
    if (!activeSession) {
      return {
        health: null,
        metrics: null,
        modelContextLength,
        isLoading: false,
      };
    }

    const metrics = countSessionTokens(activeSession);
    const health = calculateContextHealth(metrics, modelContextLength);

    return {
      health,
      metrics,
      modelContextLength,
      isLoading: false,
    };
  }, [activeSession, modelContextLength]);

  return result;
}
