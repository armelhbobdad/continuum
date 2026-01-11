"use client";

import { useMemo } from "react";
import { useConnectivityStore } from "@/stores/connectivity";
import { useModelStore } from "@/stores/models";
import { usePrivacyStore } from "@/stores/privacy";

/** Features available offline with local model */
const OFFLINE_FEATURES = [
  "chat",
  "inference",
  "session-management",
  "session-history",
  "model-switching",
  "privacy-mode",
] as const;

/** Features that require cloud connectivity */
const CLOUD_ONLY_FEATURES = [
  "cloud-inference",
  "model-download",
  "knowledge-sync",
  "account-sync",
] as const;

export type OfflineFeature = (typeof OFFLINE_FEATURES)[number];
export type CloudOnlyFeature = (typeof CLOUD_ONLY_FEATURES)[number];

export interface UseOfflineCapabilityResult {
  /** Whether the app can work fully offline */
  canWorkOffline: boolean;
  /** Whether currently in offline mode */
  isOffline: boolean;
  /** List of features available offline */
  offlineFeatures: OfflineFeature[];
  /** List of features requiring cloud */
  cloudOnlyFeatures: CloudOnlyFeature[];
  /** Reason if cannot work offline */
  offlineLimitationReason: string | null;
  /** Whether a model is downloaded and ready */
  hasLocalModel: boolean;
}

/**
 * useOfflineCapability
 *
 * Provides information about what's available offline.
 * Used by components to adapt UI based on offline capabilities.
 *
 * Story 4.5: AC1, AC4
 */
export function useOfflineCapability(): UseOfflineCapabilityResult {
  const isOnline = useConnectivityStore((s) => s.isOnline);
  const airplaneMode = usePrivacyStore((s) => s.airplaneMode);
  const downloadedModels = useModelStore((s) => s.downloadedModels);

  const isOffline = !isOnline || airplaneMode;
  const hasLocalModel = downloadedModels.length > 0;

  const canWorkOffline = hasLocalModel;
  const offlineLimitationReason = hasLocalModel
    ? null
    : "No AI model downloaded. Download a model to work offline.";

  return useMemo(
    () => ({
      canWorkOffline,
      isOffline,
      offlineFeatures: [...OFFLINE_FEATURES],
      cloudOnlyFeatures: [...CLOUD_ONLY_FEATURES],
      offlineLimitationReason,
      hasLocalModel,
    }),
    [canWorkOffline, isOffline, offlineLimitationReason, hasLocalModel]
  );
}
