"use client";

import type { ReactNode } from "react";
import { useConnectivity } from "@/hooks/use-connectivity";
import { useSyncOnReconnect } from "@/hooks/use-sync-on-reconnect";

export interface ConnectivityProviderProps {
  children: ReactNode;
}

/**
 * ConnectivityProvider
 *
 * Initializes connectivity monitoring at the application root.
 * Must be placed in provider hierarchy to ensure hooks are active.
 *
 * The hook handles SSR safely by checking typeof window before
 * subscribing to browser events. Defaults to optimistic online state.
 *
 * Story 4.1: AC1, AC3, AC4
 */
export function ConnectivityProvider({ children }: ConnectivityProviderProps) {
  // Initialize connectivity monitoring
  // Hook handles SSR safety internally (no-op during SSR)
  useConnectivity();

  // Story 4.5: AC5 - Initialize sync-on-reconnect functionality
  // Hook subscribes to connectivity transitions and auto-syncs when coming online
  useSyncOnReconnect();

  // Return children directly without wrapper element
  // This ensures minimal DOM impact and proper React tree structure
  return children;
}
