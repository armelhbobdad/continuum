"use client";

/**
 * Application Providers
 *
 * Provider hierarchy follows project-context.md requirements:
 * ThemeProvider → QueryClientProvider → PrivacyGateProvider → (JazzProvider in Story 6.x)
 *
 * Story 1.2: Privacy Gate Provider & Zustand Stores
 * Story 1.6: Privacy Dashboard MVP
 */
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PrivacyDashboard } from "@/components/features/privacy/privacy-dashboard";
import { PrivacyGateProvider } from "@/components/features/privacy/privacy-gate-provider";
import { usePrivacyKeyboardShortcuts } from "@/components/features/privacy/use-privacy-keyboard-shortcuts";
import { queryClient } from "@/utils/trpc";
import { ErrorBoundary } from "./error-boundary";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

/**
 * Internal component to enable keyboard shortcuts
 * (must be inside provider tree to access store)
 */
function PrivacyKeyboardShortcuts(): null {
  usePrivacyKeyboardShortcuts();
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
      >
        <QueryClientProvider client={queryClient}>
          <PrivacyGateProvider>
            {({ mode: _mode, jazzKey: _jazzKey }) => (
              <>
                {/* Enable keyboard shortcuts for privacy mode switching and dashboard toggle */}
                <PrivacyKeyboardShortcuts />
                {/* Privacy Dashboard overlay (Story 1.6) */}
                <PrivacyDashboard />
                {/*
                JazzProvider will be added here in Story 6.x:
                <JazzProvider key={_jazzKey} syncWhen={modeToSyncWhen(_mode)}>
                  {children}
                </JazzProvider>

                For now, _mode and _jazzKey are available but not used until Jazz integration.
              */}
                {children}
              </>
            )}
          </PrivacyGateProvider>
          <ReactQueryDevtools />
        </QueryClientProvider>
        <Toaster richColors />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
