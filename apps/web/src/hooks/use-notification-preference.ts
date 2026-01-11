"use client";

import { useCallback, useSyncExternalStore } from "react";
import type {
  NotificationKey,
  NotificationPreferences,
} from "@/types/connectivity-transition";

const STORAGE_KEY = "continuum-notification-preferences";

const defaultPreferences: NotificationPreferences = {
  "mode-change-toast": false,
  "offline-indicator": false,
  "recovery-toast": false,
};

// In-memory cache for SSR safety
let cache: NotificationPreferences | null = null;

function getSnapshot(): NotificationPreferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  if (cache) {
    return cache;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefs = stored
      ? { ...defaultPreferences, ...JSON.parse(stored) }
      : defaultPreferences;
    cache = prefs;
    return prefs;
  } catch {
    return defaultPreferences;
  }
}

function getServerSnapshot(): NotificationPreferences {
  return defaultPreferences;
}

function subscribe(callback: () => void): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null; // Invalidate cache
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}

export interface UseNotificationPreferenceResult {
  /** Check if a notification type is suppressed */
  isSuppressed: (key: NotificationKey) => boolean;
  /** Set suppression for a notification type */
  setSuppressed: (key: NotificationKey, suppressed: boolean) => void;
  /** Get all preferences */
  preferences: NotificationPreferences;
  /** Reset all preferences to default */
  resetPreferences: () => void;
}

/**
 * useNotificationPreference
 *
 * Manages user notification suppression preferences with localStorage persistence.
 *
 * Story 4.4: AC5
 */
export function useNotificationPreference(): UseNotificationPreferenceResult {
  const preferences = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const isSuppressed = useCallback(
    (key: NotificationKey): boolean => {
      return preferences[key] ?? false;
    },
    [preferences]
  );

  const setSuppressed = useCallback(
    (key: NotificationKey, suppressed: boolean) => {
      const newPrefs = { ...getSnapshot(), [key]: suppressed };
      cache = newPrefs;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
      // Trigger storage event for other tabs and same-tab updates
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    },
    []
  );

  const resetPreferences = useCallback(() => {
    cache = defaultPreferences;
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }, []);

  return {
    isSuppressed,
    setSuppressed,
    preferences,
    resetPreferences,
  };
}
