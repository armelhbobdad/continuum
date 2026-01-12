"use client";

import { cva } from "class-variance-authority";
import { useState } from "react";
import { toast } from "sonner";
import { useNotificationPreference } from "@/hooks/use-notification-preference";
import { cn } from "@/lib/utils";
import type {
  NotificationPreferences,
  TransitionEvent,
} from "@/types/connectivity-transition";

const STORAGE_KEY = "continuum-notification-preferences";

/**
 * Check if notification is suppressed (non-hook version for imperative use)
 */
function checkSuppressed(key: keyof NotificationPreferences): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return false;
    }
    const prefs = JSON.parse(stored) as NotificationPreferences;
    return prefs[key] ?? false;
  } catch {
    return false;
  }
}

const toastVariants = cva(
  "rounded-lg border p-4 shadow-lg transition-all duration-300",
  {
    variants: {
      variant: {
        offline:
          "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
        recovery:
          "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
        graceful:
          "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
      },
    },
    defaultVariants: {
      variant: "offline",
    },
  }
);

export interface ModeChangeToastProps {
  event: TransitionEvent;
  onDismiss?: () => void;
  className?: string;
}

function getToastContent(event: TransitionEvent): {
  title: string;
  message: string;
  variant: "offline" | "recovery" | "graceful";
} {
  const { previousState, newState, type } = event;

  // Recovery: was offline, now online
  if (!previousState.isOnline && newState.isOnline) {
    return {
      title: "Back online",
      message: "Connection restored, syncing now...",
      variant: "recovery",
    };
  }

  // Forced offline: connectivity change to offline
  if (type === "connectivity-change" && !newState.isOnline) {
    return {
      title: "Connectivity changed",
      message: "Operating in offline mode. Your data is safe.",
      variant: "offline",
    };
  }

  // Graceful mode change while online
  if (type === "mode-change" && newState.isOnline) {
    return {
      title: "Switched to offline mode",
      message: "You can continue working offline.",
      variant: "graceful",
    };
  }

  // Default offline message
  return {
    title: "Connectivity changed",
    message: "Operating in offline mode.",
    variant: "offline",
  };
}

/**
 * ModeChangeToast
 *
 * Displays contextual toast notifications for connectivity transitions.
 * Supports user preference to suppress future notifications.
 *
 * Story 4.4: AC4, AC5
 */
export function ModeChangeToast({
  event,
  onDismiss,
  className,
}: ModeChangeToastProps) {
  const { isSuppressed, setSuppressed } = useNotificationPreference();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Don't render if user has suppressed this notification type
  if (isSuppressed("mode-change-toast")) {
    return null;
  }

  const { title, message, variant } = getToastContent(event);

  const handleDismiss = () => {
    if (dontShowAgain) {
      setSuppressed("mode-change-toast", true);
    }
    onDismiss?.();
  };

  return (
    <div
      aria-live="polite"
      className={cn(toastVariants({ variant }), className)}
      data-slot="mode-change-toast"
      data-testid="mode-change-toast"
      role="alert"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm opacity-90">{message}</p>
        </div>
        <button
          aria-label="Dismiss"
          className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5"
          onClick={handleDismiss}
          type="button"
        >
          <span aria-hidden="true" className="text-lg">
            ×
          </span>
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          checked={dontShowAgain}
          className="h-4 w-4 rounded border-current"
          id="dont-show-again"
          onChange={(e) => setDontShowAgain(e.target.checked)}
          type="checkbox"
        />
        <label className="text-sm" htmlFor="dont-show-again">
          Don't show again
        </label>
      </div>
    </div>
  );
}

/**
 * showModeChangeToast
 *
 * Imperative toast helper for showing mode change notifications via Sonner.
 * Respects user suppression preferences stored in localStorage.
 *
 * Story 4.4: AC4, AC5
 */
export function showModeChangeToast(event: TransitionEvent): void {
  // Check suppression without React hooks (imperative context)
  if (checkSuppressed("mode-change-toast")) {
    return;
  }

  const { title, message, variant } = getToastContent(event);

  const getToastMethod = () => {
    if (variant === "recovery") {
      return toast.success;
    }
    if (variant === "graceful") {
      return toast.info;
    }
    return toast.warning;
  };
  const toastMethod = getToastMethod();

  toastMethod(title, {
    description: message,
    duration: 5000,
  });
}
