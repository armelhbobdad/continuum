"use client";

import { cva } from "class-variance-authority";
import type { ReactNode } from "react";
import { useConnectivityTransition } from "@/hooks/use-connectivity-transition";
import { cn } from "@/lib/utils";

const transitionVariants = cva("transition-all duration-300 ease-in-out", {
  variants: {
    state: {
      stable: "",
      transitioning:
        "opacity-95 ring-1 ring-amber-200/50 dark:ring-amber-800/50",
      recovering:
        "animate-pulse ring-1 ring-green-200/50 dark:ring-green-800/50",
    },
  },
  defaultVariants: {
    state: "stable",
  },
});

export interface ConnectivityTransitionProps {
  children: ReactNode;
  className?: string;
  /** Show visual indicator during transitions */
  showIndicator?: boolean;
}

/**
 * ConnectivityTransition
 *
 * Wraps content with visual feedback during connectivity transitions.
 * Provides subtle animation to indicate state changes without alarming users.
 *
 * Story 4.4: AC1, AC4
 */
export function ConnectivityTransition({
  children,
  className,
  showIndicator = true,
}: ConnectivityTransitionProps) {
  const { transitionState, isTransitioning } = useConnectivityTransition();

  return (
    <div
      aria-busy={isTransitioning}
      className={cn(
        showIndicator && transitionVariants({ state: transitionState }),
        className
      )}
      data-slot="connectivity-transition"
      data-state={transitionState}
      data-testid="connectivity-transition"
    >
      {children}
    </div>
  );
}
