"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  AirplaneModeIndicator,
  AirplaneModeToggle,
  OfflineIndicator,
  PreFlightDialog,
  SyncStatusIndicator,
} from "./features/connectivity";
import { PrivacyModeSelector } from "./features/privacy/privacy-mode-selector";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [preflightResolver, setPreflightResolver] = useState<
    ((proceed: boolean) => void) | null
  >(null);

  const handleBeforeEnable = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      setPreflightResolver(() => resolve);
      setPreflightOpen(true);
    });
  }, []);

  const handlePreflightProceed = useCallback(() => {
    preflightResolver?.(true);
    setPreflightResolver(null);
  }, [preflightResolver]);

  const handlePreflightSkip = useCallback(() => {
    preflightResolver?.(true); // Skip still enables airplane mode
    setPreflightResolver(null);
  }, [preflightResolver]);

  const handlePreflightOpenChange = useCallback(
    (open: boolean) => {
      setPreflightOpen(open);
      if (!open && preflightResolver) {
        preflightResolver(false); // User closed dialog = cancel
        setPreflightResolver(null);
      }
    },
    [preflightResolver]
  );
  const links: Array<{ to: string; label: string }> = [
    { to: "/", label: "Home" },
    { to: "/chat", label: "Chat" },
    { to: "/models", label: "Models" },
    { to: "/dashboard", label: "Dashboard" },
  ];

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <div className="flex items-center gap-4">
          <PrivacyModeSelector />
          <nav className="flex gap-4 text-lg">
            {links.map(({ to, label }) => (
              <Link href={to as "/"} key={to}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {/* Story 4.1: AC2 - Offline Badge Display */}
          <OfflineIndicator />
          {/* Story 4.5: AC5 - Sync Status Indicator */}
          <SyncStatusIndicator />
          {/* Story 4.2: AC1 - Airplane Mode Indicator & Toggle */}
          <AirplaneModeIndicator />
          {/* Story 4.3: AC5 - Pre-Flight Dialog before Airplane Mode */}
          <AirplaneModeToggle onBeforeEnable={handleBeforeEnable} />
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      {/* Story 4.3: Pre-Flight Readiness Checklist Dialog */}
      <PreFlightDialog
        onOpenChange={handlePreflightOpenChange}
        onProceed={handlePreflightProceed}
        onSkip={handlePreflightSkip}
        open={preflightOpen}
      />
      <hr />
    </div>
  );
}
