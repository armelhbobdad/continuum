"use client";

/**
 * Network Log Component
 *
 * Displays network activity log with:
 * - Empty state with positive framing ("No network activity - your data stayed local")
 * - Table view for logged requests with timestamp, type, URL, and status
 * - Clear log action
 *
 * ADR-PRIVACY-004: Network log is memory-only, never persisted
 *
 * Story 1.6: Privacy Dashboard MVP
 */
import { Cancel01Icon, SecurityCheckIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import type { NetworkLogEntry } from "@/stores/privacy";
import { usePrivacyStore } from "@/stores/privacy";

export interface NetworkLogProps {
  className?: string;
}

/**
 * Format timestamp as relative time (e.g., "2s ago", "5m ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  // Handle future timestamps (clock skew edge case)
  if (diff < 0) {
    return "just now";
  }

  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Format request type for display
 */
function formatRequestType(type: NetworkLogEntry["type"]): string {
  const typeMap: Record<NetworkLogEntry["type"], string> = {
    fetch: "Fetch",
    xhr: "XHR",
    websocket: "WebSocket",
    eventsource: "SSE",
  };
  return typeMap[type];
}

/**
 * Truncate URL for display
 */
function truncateUrl(url: string, maxLength = 40): string {
  if (url.length <= maxLength) {
    return url;
  }
  return `${url.slice(0, maxLength - 3)}...`;
}

interface NetworkLogRowProps {
  entry: NetworkLogEntry;
}

/**
 * Single row in the network log table
 */
function NetworkLogRow({ entry }: NetworkLogRowProps) {
  return (
    <tr
      className="border-slate-100 border-b last:border-0 dark:border-slate-800"
      data-slot="network-log-row"
    >
      <td className="py-2 text-slate-500 tabular-nums dark:text-slate-400">
        {formatRelativeTime(entry.timestamp)}
      </td>
      <td className="py-2 font-mono text-xs">
        {formatRequestType(entry.type)}
      </td>
      <td
        className="max-w-[200px] truncate py-2 font-mono text-slate-600 text-xs dark:text-slate-300"
        title={entry.url}
      >
        {truncateUrl(entry.url)}
      </td>
      <td className="py-2">
        {entry.blocked ? (
          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 font-medium text-rose-700 text-xs dark:bg-rose-900/30 dark:text-rose-400">
            <HugeiconsIcon
              aria-hidden="true"
              className="h-3 w-3"
              icon={Cancel01Icon}
              size={12}
            />
            Blocked
          </span>
        ) : (
          <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700 text-xs dark:bg-emerald-900/30 dark:text-emerald-400">
            Allowed
          </span>
        )}
      </td>
    </tr>
  );
}

/**
 * Network Log Component
 *
 * Shows network activity or empty state with positive privacy framing.
 * Uses semantic table with ARIA labels for accessibility.
 */
export function NetworkLog({ className }: NetworkLogProps) {
  const { networkLog, clearNetworkLog } = usePrivacyStore();

  if (networkLog.length === 0) {
    return (
      <div
        aria-live="polite"
        className={cn(
          "flex flex-col items-center justify-center py-12 text-center",
          className
        )}
        data-slot="network-log"
        role="status"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <HugeiconsIcon
            aria-hidden="true"
            className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
            icon={SecurityCheckIcon}
            size={24}
          />
        </div>
        <h3 className="font-medium text-lg text-slate-900 dark:text-slate-100">
          No network activity
        </h3>
        <p className="mt-1 text-slate-500 text-sm dark:text-slate-400">
          Your data stayed local
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)} data-slot="network-log">
      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-sm dark:text-slate-400">
          {networkLog.length} request{networkLog.length !== 1 ? "s" : ""} logged
        </span>
        <button
          className="text-slate-500 text-sm transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          onClick={clearNetworkLog}
          type="button"
        >
          Clear log
        </button>
      </div>

      <div className="overflow-x-auto">
        <table
          aria-label="Network activity log"
          className="w-full text-sm"
          data-slot="network-log-table"
        >
          <thead>
            <tr className="border-slate-200 border-b dark:border-slate-700">
              <th
                className="pb-2 text-left font-medium text-slate-600 dark:text-slate-300"
                scope="col"
              >
                Time
              </th>
              <th
                className="pb-2 text-left font-medium text-slate-600 dark:text-slate-300"
                scope="col"
              >
                Type
              </th>
              <th
                className="pb-2 text-left font-medium text-slate-600 dark:text-slate-300"
                scope="col"
              >
                URL
              </th>
              <th
                className="pb-2 text-left font-medium text-slate-600 dark:text-slate-300"
                scope="col"
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {networkLog.map((entry) => (
              <NetworkLogRow entry={entry} key={entry.id} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
