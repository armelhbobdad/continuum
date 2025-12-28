/**
 * Privacy Feature Components
 *
 * Story 1.2: Privacy Gate Provider & Zustand Stores
 * Story 1.6: Privacy Dashboard MVP
 */

// Network log (Story 1.6)
export { NetworkLog } from "./network-log";
// Dashboard (Story 1.6)
export { PrivacyDashboard } from "./privacy-dashboard";
// Provider (Story 1.2)
export { modeToSyncWhen, PrivacyGateProvider } from "./privacy-gate-provider";
// Health check (Story 1.6)
export type { HealthStatus } from "./privacy-health-check";
export {
  calculateHealthStatus,
  PrivacyHealthCheck,
} from "./privacy-health-check";
// Indicator (Story 1.2, updated in 1.6)
export {
  MODE_DESCRIPTIONS,
  MODE_LABELS,
  PrivacyIndicator,
  privacyIndicatorVariants,
} from "./privacy-indicator";
// Keyboard shortcuts (Story 1.2, updated in 1.6)
export { usePrivacyKeyboardShortcuts } from "./use-privacy-keyboard-shortcuts";
