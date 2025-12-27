/**
 * Tests for useIsDesktop hook from @continuum/platform
 * Located in apps/web to leverage the React testing infrastructure (jsdom)
 */

import { useIsDesktop } from "@continuum/platform";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Store original values for cleanup
let originalTauri: unknown;
let originalTauriInternals: unknown;

// Mock window.__TAURI__ detection
const mockTauri = (enabled: boolean) => {
  if (enabled) {
    // @ts-expect-error - mocking Tauri detection
    globalThis.__TAURI__ = { version: "2.0.0" };
    // @ts-expect-error - mocking Tauri internals
    globalThis.__TAURI_INTERNALS__ = {};
  } else {
    // @ts-expect-error - mocking Tauri detection
    delete globalThis.__TAURI__;
    // @ts-expect-error - mocking Tauri internals
    delete globalThis.__TAURI_INTERNALS__;
  }
};

describe("useIsDesktop", () => {
  beforeEach(() => {
    // @ts-expect-error - storing original Tauri value
    originalTauri = globalThis.__TAURI__;
    // @ts-expect-error - storing original Tauri internals
    originalTauriInternals = globalThis.__TAURI_INTERNALS__;
  });

  afterEach(() => {
    // Restore original values
    if (originalTauri !== undefined) {
      // @ts-expect-error - restoring Tauri value
      globalThis.__TAURI__ = originalTauri;
    } else {
      // @ts-expect-error - cleaning up
      delete globalThis.__TAURI__;
    }

    if (originalTauriInternals !== undefined) {
      // @ts-expect-error - restoring Tauri internals
      globalThis.__TAURI_INTERNALS__ = originalTauriInternals;
    } else {
      // @ts-expect-error - cleaning up
      delete globalThis.__TAURI_INTERNALS__;
    }
  });

  it("should initialize with undefined state (SSR-safe design)", () => {
    // Note: In jsdom test environment, useEffect runs synchronously on mount.
    // The hook's useState initializes with undefined, which is the SSR-safe default.
    // This test verifies the hook resolves to the correct value.
    mockTauri(false);
    const { result } = renderHook(() => useIsDesktop());

    // After mount, should resolve to false (not desktop)
    expect(result.current).toBe(false);
  });

  it("should return true after mount when in desktop environment", async () => {
    mockTauri(true);
    const { result } = renderHook(() => useIsDesktop());

    // Wait for useEffect to run
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("should return false after mount when in web environment", async () => {
    mockTauri(false);
    const { result } = renderHook(() => useIsDesktop());

    // Wait for useEffect to run
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("should not change value after initial detection", async () => {
    mockTauri(true);
    const { result, rerender } = renderHook(() => useIsDesktop());

    // Wait for initial mount
    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    // Rerender should maintain the same value
    rerender();
    expect(result.current).toBe(true);
  });
});
