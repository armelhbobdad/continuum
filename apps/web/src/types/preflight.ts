/**
 * Pre-Flight Check Types
 *
 * Type definitions for the pre-flight readiness checklist system.
 * Used by check functions, usePreFlightChecks hook, and UI components.
 *
 * Story 4.3: Pre-Flight Readiness Checklist
 */

/** Status of an individual pre-flight check */
export type CheckStatus = "ready" | "warning" | "critical" | "checking";

/** Category of pre-flight check for grouping and display */
export type CheckCategory = "model" | "storage" | "ram" | "knowledge" | "gpu";

/** Action that can be taken to resolve a check issue */
export interface CheckAction {
  /** Button label displayed to user */
  label: string;
  /** Optional navigation href (mutually exclusive with onClick) */
  href?: string;
  /** Optional click handler (mutually exclusive with href) */
  onClick?: () => void | Promise<void>;
}

/**
 * Individual pre-flight check result
 *
 * Represents the status of a single readiness check with
 * optional action for remediation.
 */
export interface PreFlightCheck {
  /** Unique identifier for the check */
  id: string;
  /** Category for grouping */
  category: CheckCategory;
  /** Display name shown in UI */
  name: string;
  /** Current status */
  status: CheckStatus;
  /** Human-readable status message */
  message: string;
  /** Optional additional details */
  details?: string;
  /** Optional action to resolve issues */
  action?: CheckAction;
}

/**
 * Aggregated pre-flight check results
 *
 * Contains all check results and computed summary metrics.
 */
export interface PreFlightResult {
  /** All check results */
  checks: PreFlightCheck[];
  /** Overall status (worst of all checks) */
  overallStatus: "ready" | "warning" | "critical";
  /** Count of checks with ready status */
  readyCount: number;
  /** Total number of checks */
  totalCount: number;
}
