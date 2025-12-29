"use client";

/**
 * VersionPinToggle Component
 * Story 2.5: Model Integrity Verification
 *
 * Toggle for pinning a model to a specific version.
 * When pinned, auto-updates skip this model.
 *
 * AC5: Version Pinning
 * - Enable version pinning (FR31)
 * - Auto-updates skip pinned models
 * - Notification when newer versions available
 */

import { cn } from "@/lib/utils";
import { useModelStore } from "@/stores/models";

export type VersionPinToggleProps = {
  /** Model ID to pin */
  modelId: string;
  /** Current model version */
  currentVersion: string;
  /** Whether a newer version is available */
  newerVersionAvailable?: boolean;
  /** The newer version if available */
  newerVersion?: string;
  /** Additional CSS classes */
  className?: string;
};

/**
 * VersionPinToggle Component
 *
 * Shows current pin status and allows toggling.
 * AC5: Shows lock icon when pinned, notifies of new versions.
 */
export function VersionPinToggle({
  modelId,
  currentVersion,
  newerVersionAvailable = false,
  newerVersion,
  className,
}: VersionPinToggleProps) {
  const isPinned = useModelStore((s) => s.isVersionPinned(modelId));
  const pinnedVersion = useModelStore((s) => s.pinnedVersions[modelId]);
  const pinVersion = useModelStore((s) => s.pinVersion);
  const unpinVersion = useModelStore((s) => s.unpinVersion);

  const handleToggle = () => {
    if (isPinned) {
      unpinVersion(modelId);
    } else {
      pinVersion(modelId, currentVersion);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* Pin Toggle */}
      <button
        aria-pressed={isPinned}
        className={cn(
          "inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors",
          isPinned
            ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
            : "border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
        )}
        onClick={handleToggle}
        type="button"
      >
        {/* Lock icon */}
        <span aria-hidden="true">
          {isPinned ? "\uD83D\uDD12" : "\uD83D\uDD13"}
        </span>
        <span>
          {isPinned ? `Pinned to v${pinnedVersion}` : "Pin this version"}
        </span>
      </button>

      {/* Newer version notification */}
      {Boolean(isPinned && newerVersionAvailable && newerVersion) && (
        <div
          className="flex items-center gap-2 rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs dark:border-yellow-600/30 dark:bg-yellow-900/20"
          role="alert"
        >
          <span aria-hidden="true" className="text-yellow-600">
            ℹ
          </span>
          <span className="text-yellow-800 dark:text-yellow-200">
            Version {newerVersion} is available.{" "}
            <button
              className="font-medium underline hover:no-underline"
              onClick={() => unpinVersion(modelId)}
              type="button"
            >
              Unpin to update
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * PinnedVersionBadge Component
 *
 * Small badge showing pinned status.
 * For use in compact spaces like model cards.
 */
export type PinnedVersionBadgeProps = {
  /** Model ID to check */
  modelId: string;
  /** Additional CSS classes */
  className?: string;
};

export function PinnedVersionBadge({
  modelId,
  className,
}: PinnedVersionBadgeProps) {
  const isPinned = useModelStore((s) => s.isVersionPinned(modelId));
  const pinnedVersion = useModelStore((s) => s.pinnedVersions[modelId]);

  if (!isPinned) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-400",
        className
      )}
      title={`Pinned to version ${pinnedVersion}`}
    >
      <span aria-hidden="true">\uD83D\uDD12</span>
      <span>v{pinnedVersion}</span>
    </span>
  );
}
