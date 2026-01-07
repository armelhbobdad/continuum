"use client";

/**
 * Privacy Gate Provider
 *
 * Central privacy enforcement component that:
 * - Provides privacy mode and jazzKey via render props
 * - Blocks network requests in local-only mode
 * - Controls Jazz sync behavior based on privacy mode
 * - Logs all network attempts for Privacy Dashboard (Story 1.6)
 *
 * Story 1.2: Privacy Gate Provider & Zustand Stores
 * Story 1.6: Privacy Dashboard MVP
 */
import { type ReactNode, useEffect } from "react";
import type { NetworkRequestType, PrivacyMode } from "@/stores/privacy";
import { usePrivacyStore } from "@/stores/privacy";

/**
 * Render props type for PrivacyGateProvider children
 */
interface PrivacyGateRenderProps {
  /** Current privacy mode */
  mode: PrivacyMode;
  /** Key for JazzProvider remount */
  jazzKey: string;
}

interface PrivacyGateProviderProps {
  /** Render prop function receiving privacy state */
  children: (props: PrivacyGateRenderProps) => ReactNode;
}

/**
 * Maps privacy mode to Jazz sync configuration.
 * TODO: Replace stub with actual Jazz sync.when values in Story 6.x
 *
 * Future mapping:
 * - 'local-only'      → 'never'           (no sync)
 * - 'trusted-network' → 'whenOnline'      (sync on trusted network)
 * - 'cloud-enhanced'  → 'always'          (full cloud sync)
 */
export const modeToSyncWhen = (_mode: PrivacyMode): "never" => {
  // Stub: Always return 'never' until Jazz integration (Story 6.x)
  return "never";
};

/**
 * Extract URL string from various input types
 */
const getUrlString = (input: RequestInfo | URL): string => {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  if (input instanceof Request) {
    return input.url;
  }
  return String(input);
};

/**
 * Check if a URL is same-origin (allowed in local-only mode)
 */
const isSameOrigin = (url: string): boolean => {
  // Handle relative URLs (they're always same-origin)
  if (url.startsWith("/")) {
    return true;
  }

  // Handle absolute URLs
  try {
    const urlObj = new URL(url);
    // In browser context, compare with window.location.origin
    if (typeof window !== "undefined") {
      return urlObj.origin === window.location.origin;
    }
    // In SSR, be conservative and block
    return false;
  } catch {
    // If URL parsing fails, treat as relative (same-origin)
    return true;
  }
};

/**
 * Create a blocking error for network requests in local-only or airplane mode
 */
const createBlockingError = (
  type: string,
  url: string,
  reason: string
): Error =>
  new Error(
    `${type} blocked: ${reason}. ` +
      `External requests to "${url}" are not allowed. ` +
      `Switch to "trusted-network" or "cloud-enhanced" mode to enable network access.`
  );

/**
 * Log a network attempt to the privacy store
 */
const logAttempt = (
  logNetworkAttempt: ReturnType<
    typeof usePrivacyStore.getState
  >["logNetworkAttempt"],
  type: NetworkRequestType,
  url: string,
  blocked: boolean,
  reason?: string
): void => {
  logNetworkAttempt({ type, url, blocked, reason });
};

/**
 * Privacy Gate Provider Component
 *
 * Wraps the application to enforce privacy mode restrictions.
 * Uses render props pattern to provide mode and jazzKey to children.
 */
export function PrivacyGateProvider({ children }: PrivacyGateProviderProps) {
  const { mode, jazzKey, airplaneMode, logNetworkAttempt } = usePrivacyStore();

  // Determine if network should be blocked (airplane mode OR local-only mode)
  const shouldBlock = airplaneMode || mode === "local-only";
  const blockingReason = airplaneMode
    ? "Airplane Mode active"
    : 'Privacy mode is set to "local-only"';

  // Network blocking effect for local-only mode or airplane mode
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === "undefined") {
      return;
    }

    // Store original references
    const originalFetch = window.fetch;
    const OriginalXHR = window.XMLHttpRequest;
    const OriginalWebSocket = window.WebSocket;
    const OriginalEventSource = window.EventSource;

    if (shouldBlock) {
      // Override fetch to block external requests
      window.fetch = (input, init): Promise<Response> => {
        const url = getUrlString(input);

        // Allow same-origin requests (Next.js API routes, etc.)
        if (isSameOrigin(url)) {
          return originalFetch(input, init);
        }

        // Log and block external requests
        logAttempt(logNetworkAttempt, "fetch", url, true, blockingReason);
        return Promise.reject(
          createBlockingError("Network request", url, blockingReason)
        );
      };

      // Override XMLHttpRequest to block external requests
      window.XMLHttpRequest = class BlockedXHR extends OriginalXHR {
        private _blockedUrl: string | null = null;

        open(
          method: string,
          url: string | URL,
          async?: boolean,
          username?: string | null,
          password?: string | null
        ): void {
          const urlString = url.toString();
          if (!isSameOrigin(urlString)) {
            this._blockedUrl = urlString;
          }
          // Call original with proper argument handling
          if (async === undefined) {
            super.open(method, url);
          } else {
            super.open(method, url, async, username, password);
          }
        }

        send(body?: Document | XMLHttpRequestBodyInit | null): void {
          if (this._blockedUrl) {
            // Log and block
            logAttempt(
              logNetworkAttempt,
              "xhr",
              this._blockedUrl,
              true,
              blockingReason
            );
            // Simulate network error
            setTimeout(() => {
              this.dispatchEvent(new Event("error"));
            }, 0);
            throw createBlockingError(
              "XMLHttpRequest",
              this._blockedUrl,
              blockingReason
            );
          }
          super.send(body);
        }
      } as typeof XMLHttpRequest;

      // Override WebSocket to block all connections (WebSocket is always external)
      window.WebSocket = class BlockedWebSocket {
        constructor(url: string | URL) {
          const urlString = url.toString();
          logAttempt(
            logNetworkAttempt,
            "websocket",
            urlString,
            true,
            blockingReason
          );
          throw createBlockingError("WebSocket", urlString, blockingReason);
        }
      } as typeof WebSocket;

      // Override EventSource to block external connections
      window.EventSource = class BlockedEventSource {
        constructor(url: string | URL) {
          const urlString = url.toString();
          logAttempt(
            logNetworkAttempt,
            "eventsource",
            urlString,
            true,
            blockingReason
          );
          if (!isSameOrigin(urlString)) {
            throw createBlockingError("EventSource", urlString, blockingReason);
          }
          // For same-origin, we'd need to return the original - but EventSource
          // is typically used for external streaming, so block all for safety
          throw createBlockingError("EventSource", urlString, blockingReason);
        }
      } as typeof EventSource;

      // Return cleanup function
      return () => {
        window.fetch = originalFetch;
        window.XMLHttpRequest = OriginalXHR;
        window.WebSocket = OriginalWebSocket;
        window.EventSource = OriginalEventSource;
      };
    }

    // For other modes, restore originals if they were overridden
    window.fetch = originalFetch;
    window.XMLHttpRequest = OriginalXHR;
    window.WebSocket = OriginalWebSocket;
    window.EventSource = OriginalEventSource;

    return () => {
      window.fetch = originalFetch;
      window.XMLHttpRequest = OriginalXHR;
      window.WebSocket = OriginalWebSocket;
      window.EventSource = OriginalEventSource;
    };
  }, [shouldBlock, blockingReason, logNetworkAttempt]);

  return <>{children({ mode, jazzKey })}</>;
}
