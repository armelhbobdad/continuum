/**
 * Stores barrel export (Story 5.1)
 *
 * Central export point for Zustand stores.
 */

export type { ConnectivityState } from "./connectivity";
// Connectivity store (Story 4.1, 4.4, 4.5) - MEMORY ONLY
export { useConnectivityStore } from "./connectivity";
export type { CredentialStoreState } from "./credentials";
// Credential store (Story 5.1) - MEMORY ONLY
export { useCredentialStore } from "./credentials";
// Download store (Story 2.3) - MEMORY ONLY
export { useDownloadStore } from "./downloads";
// Hardware store (Story 2.1) - MEMORY ONLY
export { useHardwareStore } from "./hardware";
// Models store (Story 2.2) - MEMORY ONLY
export { useModelStore } from "./models";
// Privacy store (Story 1.2) - MEMORY ONLY
export { usePrivacyStore } from "./privacy";

// Session store (Story 1.7) - PERSISTED to localStorage
export { useSessionStore } from "./session";

// Sync queue store (Story 4.5) - MEMORY ONLY
export { useSyncQueueStore } from "./sync-queue";
