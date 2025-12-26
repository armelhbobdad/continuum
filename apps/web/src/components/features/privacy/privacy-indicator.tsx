"use client";

/**
 * Privacy Indicator Component
 *
 * Displays the current privacy mode with mode-specific styling.
 * Clicking opens the Privacy Mode Selector.
 *
 * Visual language (from UX spec):
 * - local-only: emerald, solid border
 * - trusted-network: sky, dashed border
 * - cloud-enhanced: slate, no border
 *
 * Story 1.2: Privacy Gate Provider & Zustand Stores
 */
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { PrivacyMode } from "@/stores/privacy";
import { usePrivacyStore } from "@/stores/privacy";

/**
 * Privacy mode labels for display
 */
const MODE_LABELS: Record<PrivacyMode, string> = {
  "local-only": "Local-only",
  "trusted-network": "Hybrid",
  "cloud-enhanced": "Cloud",
};

/**
 * Privacy mode descriptions for screen readers
 */
const MODE_DESCRIPTIONS: Record<PrivacyMode, string> = {
  "local-only": "Your data never leaves this device",
  "trusted-network": "Private by default, share when you choose",
  "cloud-enhanced": "Maximum power, standard cloud privacy",
};

/**
 * CVA variants for privacy indicator styling
 */
const privacyIndicatorVariants = cva(
  [
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-xs",
    "cursor-pointer select-none transition-all",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  ],
  {
    variants: {
      mode: {
        "local-only": [
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          "border border-emerald-500 border-solid",
          "hover:bg-emerald-500/20",
        ],
        "trusted-network": [
          "bg-sky-500/10 text-sky-700 dark:text-sky-400",
          "border border-sky-500 border-dashed",
          "hover:bg-sky-500/20",
        ],
        "cloud-enhanced": [
          "bg-slate-500/10 text-slate-700 dark:text-slate-400",
          "border-none",
          "hover:bg-slate-500/20",
        ],
      },
    },
    defaultVariants: {
      mode: "local-only",
    },
  }
);

/**
 * Dot indicator variants for mode visualization
 */
const dotVariants = cva("size-2 rounded-full", {
  variants: {
    mode: {
      "local-only": "bg-emerald-500",
      "trusted-network": "bg-sky-500",
      "cloud-enhanced": "bg-slate-500",
    },
  },
  defaultVariants: {
    mode: "local-only",
  },
});

interface PrivacyIndicatorProps
  extends VariantProps<typeof privacyIndicatorVariants> {
  /** Click handler to open mode selector */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Render as a different element (e.g., 'span' when inside a button) */
  as?: "button" | "span" | "div";
}

/**
 * Privacy Indicator Component
 *
 * Shows current privacy mode with visual styling.
 * Accessible via keyboard (Enter/Space to activate).
 */
export function PrivacyIndicator({
  onClick,
  className,
  as: Component = "button",
}: PrivacyIndicatorProps) {
  const mode = usePrivacyStore((state) => state.mode);
  const label = MODE_LABELS[mode];
  const description = MODE_DESCRIPTIONS[mode];

  // Only add button-specific props when rendering as button
  const buttonProps = Component === "button" ? { type: "button" as const } : {};

  return (
    <Component
      aria-label={`Privacy mode: ${label}. ${description}`}
      aria-live="polite"
      className={cn(privacyIndicatorVariants({ mode }), className)}
      data-slot="privacy-indicator"
      onClick={onClick}
      role="status"
      {...buttonProps}
    >
      <span aria-hidden="true" className={dotVariants({ mode })} />
      <span>{label}</span>
    </Component>
  );
}

export { privacyIndicatorVariants, MODE_LABELS, MODE_DESCRIPTIONS };
