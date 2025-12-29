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
type PrivacyGateRenderProps = {
  /** Current privacy mode */
  mode: PrivacyMode;
  /** Key for JazzProvider remount */
  jazzKey: string;
};

type PrivacyGateProviderProps = {
  /** Render prop function receiving privacy state */
  children: (props: PrivacyGateRenderProps) => ReactNode;
};

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
 * Create a blocking error for network requests in local-only mode
 */
const createBlockingError = (type: string, url: string): Error =>
  new Error(
    `${type} blocked: Privacy mode is set to "local-only". ` +
      `External requests to "${url}" are not allowed. ` +
      `Switch to "trusted-network" or "cloud-enhanced" mode to enable network access.`
  );

/**
 * Log a network attempt to the privacy store
 */
// biome-ignore lint/nursery/useMaxParams: Helper function for logging with all required context
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
  const { mode, jazzKey, logNetworkAttempt } = usePrivacyStore();

  // Network blocking effect for local-only mode
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

    if (mode === "local-only") {
      // Override fetch to block external requests
      window.fetch = (input, init): Promise<Response> => {
        const url = getUrlString(input);

        // Allow same-origin requests (Next.js API routes, etc.)
        if (isSameOrigin(url)) {
          return originalFetch(input, init);
        }

        // Log and block external requests in local-only mode
        const reason = 'Privacy mode is set to "local-only"';
        logAttempt(logNetworkAttempt, "fetch", url, true, reason);
        return Promise.reject(createBlockingError("Network request", url));
      };

      // Override XMLHttpRequest to block external requests
      window.XMLHttpRequest = class BlockedXHR extends OriginalXHR {
        private _blockedUrl: string | null = null;

        // biome-ignore lint/nursery/useMaxParams: XMLHttpRequest.open() is a Web API with fixed signature
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
            const reason = 'Privacy mode is set to "local-only"';
            logAttempt(
              logNetworkAttempt,
              "xhr",
              this._blockedUrl,
              true,
              reason
            );
            // Simulate network error
            setTimeout(() => {
              this.dispatchEvent(new Event("error"));
            }, 0);
            throw createBlockingError("XMLHttpRequest", this._blockedUrl);
          }
          super.send(body);
        }
      } as typeof XMLHttpRequest;

      // Override WebSocket to block all connections (WebSocket is always external)
      window.WebSocket = class BlockedWebSocket {
        constructor(url: string | URL) {
          const urlString = url.toString();
          const reason = 'Privacy mode is set to "local-only"';
          logAttempt(logNetworkAttempt, "websocket", urlString, true, reason);
          throw createBlockingError("WebSocket", urlString);
        }
      } as typeof WebSocket;

      // Override EventSource to block external connections
      window.EventSource = class BlockedEventSource {
        constructor(url: string | URL) {
          const urlString = url.toString();
          const reason = 'Privacy mode is set to "local-only"';
          logAttempt(logNetworkAttempt, "eventsource", urlString, true, reason);
          if (!isSameOrigin(urlString)) {
            throw createBlockingError("EventSource", urlString);
          }
          // For same-origin, we'd need to return the original - but EventSource
          // is typically used for external streaming, so block all for safety
          throw createBlockingError("EventSource", urlString);
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
  }, [mode, logNetworkAttempt]);

  return <>{children({ mode, jazzKey })}</>;
}
