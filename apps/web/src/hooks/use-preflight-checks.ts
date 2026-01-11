/**
 * usePreFlightChecks Hook
 *
 * Hook for managing pre-flight check execution and state.
 * Runs all checks in parallel on mount.
 *
 * Story 4.3: AC1, AC5
 */
"use client";

import { useCallback, useEffect, useState } from "react";

import { calculateOverallStatus, runAllChecks } from "@/lib/preflight/checks";
import type { PreFlightCheck } from "@/types/preflight";

export interface UsePreFlightChecksResult {
  checks: PreFlightCheck[];
  isLoading: boolean;
  error: Error | null;
  overallStatus: "ready" | "warning" | "critical";
  runChecks: () => Promise<void>;
  rerunCheck: (checkId: string) => Promise<void>;
}

/**
 * usePreFlightChecks
 *
 * Hook for managing pre-flight check execution and state.
 * Runs all checks in parallel on mount.
 */
export function usePreFlightChecks(): UsePreFlightChecksResult {
  const [checks, setChecks] = useState<PreFlightCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const runChecks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Set all checks to "checking" state first
      setChecks((prev) =>
        prev.map((c) => ({ ...c, status: "checking" as const }))
      );

      const results = await runAllChecks();
      setChecks(results);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to run checks"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rerunCheck = useCallback(
    async (checkId: string) => {
      // Mark specific check as checking
      setChecks((prev) =>
        prev.map((c) =>
          c.id === checkId ? { ...c, status: "checking" as const } : c
        )
      );

      // Re-run all checks (simpler than individual check logic)
      await runChecks();
    },
    [runChecks]
  );

  // Run checks on mount
  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const overallStatus = calculateOverallStatus(checks);

  return {
    checks,
    isLoading,
    error,
    overallStatus,
    runChecks,
    rerunCheck,
  };
}
