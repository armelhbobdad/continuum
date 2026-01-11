/**
 * useStorageInfo Hook (Story 5.2)
 *
 * React hook for accessing credential storage tier information.
 * Fetches storage info from Rust backend on mount and provides
 * reactive state for UI display.
 *
 * # Story References
 * - Story 5.2: OS Keychain Integration
 * - AC6: Storage tier indicator in settings
 *
 * # Usage
 * ```tsx
 * const { storageInfo, isLoading, error, refetch } = useStorageInfo();
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <ErrorDisplay error={error} />;
 *
 * return <StorageTierIndicator info={storageInfo} />;
 * ```
 */

import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_STORAGE_INFO,
  isMemoryOnlyMode,
  type StorageInfo,
  type StorageTier,
} from "../types/credentials";

/**
 * Hook return type
 */
export interface UseStorageInfoResult {
  /** Current storage info */
  storageInfo: StorageInfo;
  /** Current storage tier (convenience accessor) */
  tier: StorageTier;
  /** Whether data is being loaded */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether credentials will persist across app restarts */
  persists: boolean;
  /** Whether storage is in memory-only fallback mode */
  isMemoryOnly: boolean;
  /** Manually refetch storage info */
  refetch: () => Promise<void>;
}

/**
 * Hook for accessing credential storage tier information (AC6)
 *
 * Fetches storage info from Rust backend via Tauri IPC.
 * Provides loading and error states for UI feedback.
 *
 * @returns Storage info state and utilities
 *
 * @example
 * ```tsx
 * function SettingsPanel() {
 *   const { storageInfo, isLoading, isMemoryOnly } = useStorageInfo();
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <div>
 *       <h3>Credential Storage: {storageInfo.display_name}</h3>
 *       {isMemoryOnly && <MemoryOnlyWarning />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useStorageInfo(): UseStorageInfoResult {
  const [storageInfo, setStorageInfo] =
    useState<StorageInfo>(DEFAULT_STORAGE_INFO);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStorageInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const info = await invoke<StorageInfo>("get_storage_info");
      setStorageInfo(info);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      // Keep default storage info on error (safe fallback)
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStorageInfo();
  }, [fetchStorageInfo]);

  return {
    storageInfo,
    tier: storageInfo.tier,
    isLoading,
    error,
    persists: storageInfo.persists_on_restart,
    isMemoryOnly: isMemoryOnlyMode(storageInfo.tier),
    refetch: fetchStorageInfo,
  };
}

/**
 * Hook for getting just the storage tier (lightweight alternative)
 *
 * Use this when you only need the tier without full StorageInfo.
 *
 * @example
 * ```tsx
 * const { tier, isMemoryOnly } = useStorageTier();
 * ```
 */
export function useStorageTier(): {
  tier: StorageTier;
  isLoading: boolean;
  error: string | null;
  isMemoryOnly: boolean;
  refetch: () => Promise<void>;
} {
  const [tier, setTier] = useState<StorageTier>("MemoryOnly");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTier = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const storageTier = await invoke<StorageTier>("get_storage_tier");
      setTier(storageTier);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTier();
  }, [fetchTier]);

  return {
    tier,
    isLoading,
    error,
    isMemoryOnly: isMemoryOnlyMode(tier),
    refetch: fetchTier,
  };
}

export default useStorageInfo;
