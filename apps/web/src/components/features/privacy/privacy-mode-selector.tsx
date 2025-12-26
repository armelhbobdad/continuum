"use client";

/**
 * Privacy Mode Selector Component
 *
 * Dropdown menu for selecting privacy mode with three options:
 * - Local-only: "Your data never leaves this device"
 * - Hybrid: "Private by default, share when you choose"
 * - Cloud: "Maximum power, standard cloud privacy"
 *
 * Story 1.2: Privacy Gate Provider & Zustand Stores
 */
import { cva } from "class-variance-authority";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { PrivacyMode } from "@/stores/privacy";
import { usePrivacyStore } from "@/stores/privacy";
import { PrivacyIndicator } from "./privacy-indicator";

/**
 * Privacy mode options with labels and descriptions
 */
const PRIVACY_MODE_OPTIONS: Array<{
  value: PrivacyMode;
  label: string;
  description: string;
}> = [
  {
    value: "local-only",
    label: "Local-only",
    description: "Your data never leaves this device",
  },
  {
    value: "trusted-network",
    label: "Hybrid",
    description: "Private by default, share when you choose",
  },
  {
    value: "cloud-enhanced",
    label: "Cloud",
    description: "Maximum power, standard cloud privacy",
  },
];

/**
 * Dot indicator variants for mode options
 */
const optionDotVariants = cva("size-2 shrink-0 rounded-full", {
  variants: {
    mode: {
      "local-only": "bg-emerald-500",
      "trusted-network": "bg-sky-500",
      "cloud-enhanced": "bg-slate-500",
    },
  },
});

type PrivacyModeSelectorProps = {
  /** Additional CSS classes */
  className?: string;
};

/**
 * Privacy Mode Selector Component
 *
 * Provides a dropdown menu for selecting privacy mode.
 * Uses optimistic UI - mode change is instant.
 */
export function PrivacyModeSelector({ className }: PrivacyModeSelectorProps) {
  const mode = usePrivacyStore((state) => state.mode);
  const setMode = usePrivacyStore((state) => state.setMode);

  const handleModeChange = (newMode: string) => {
    // Optimistic UI - mode updates immediately
    setMode(newMode as PrivacyMode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("focus:outline-none", className)}
        data-slot="privacy-mode-selector-trigger"
      >
        <PrivacyIndicator as="span" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-72"
        data-slot="privacy-mode-selector-content"
      >
        <DropdownMenuGroup aria-label="Select privacy mode">
          <DropdownMenuLabel>Privacy Mode</DropdownMenuLabel>

          <DropdownMenuRadioGroup onValueChange={handleModeChange} value={mode}>
            {PRIVACY_MODE_OPTIONS.map((option) => (
              <DropdownMenuRadioItem
                className="flex flex-col items-start gap-0.5 py-3"
                data-slot={`privacy-mode-option-${option.value}`}
                key={option.value}
                value={option.value}
              >
                <div className="flex items-center gap-2">
                  <span className={optionDotVariants({ mode: option.value })} />
                  <span className="font-medium">{option.label}</span>
                </div>
                <span className="ml-4 text-muted-foreground text-xs">
                  {option.description}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { PRIVACY_MODE_OPTIONS };
