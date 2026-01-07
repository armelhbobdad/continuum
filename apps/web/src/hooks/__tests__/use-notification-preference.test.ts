import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "continuum-notification-preferences";

/**
 * useNotificationPreference Hook Tests
 *
 * Story 4.4: AC5
 * Tests for notification suppression preferences with localStorage persistence.
 */
describe("useNotificationPreference", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns default values when localStorage is empty", async () => {
    const { useNotificationPreference } = await import(
      "../use-notification-preference"
    );
    const { result } = renderHook(() => useNotificationPreference());

    expect(result.current.preferences["mode-change-toast"]).toBe(false);
    expect(result.current.preferences["offline-indicator"]).toBe(false);
    expect(result.current.preferences["recovery-toast"]).toBe(false);
  });

  it("reads preference from localStorage", async () => {
    // Pre-populate localStorage
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ "mode-change-toast": true })
    );

    const { useNotificationPreference } = await import(
      "../use-notification-preference"
    );
    const { result } = renderHook(() => useNotificationPreference());

    expect(result.current.preferences["mode-change-toast"]).toBe(true);
    expect(result.current.isSuppressed("mode-change-toast")).toBe(true);
  });

  it("setSuppressed updates localStorage", async () => {
    const { useNotificationPreference } = await import(
      "../use-notification-preference"
    );
    const { result } = renderHook(() => useNotificationPreference());

    expect(result.current.isSuppressed("mode-change-toast")).toBe(false);

    act(() => {
      result.current.setSuppressed("mode-change-toast", true);
    });

    expect(result.current.isSuppressed("mode-change-toast")).toBe(true);

    // Verify localStorage was updated
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored["mode-change-toast"]).toBe(true);
  });

  it("isSuppressed returns correct value for different keys", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        "mode-change-toast": true,
        "offline-indicator": false,
        "recovery-toast": true,
      })
    );

    const { useNotificationPreference } = await import(
      "../use-notification-preference"
    );
    const { result } = renderHook(() => useNotificationPreference());

    expect(result.current.isSuppressed("mode-change-toast")).toBe(true);
    expect(result.current.isSuppressed("offline-indicator")).toBe(false);
    expect(result.current.isSuppressed("recovery-toast")).toBe(true);
  });

  it("resetPreferences clears all preferences", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        "mode-change-toast": true,
        "recovery-toast": true,
      })
    );

    const { useNotificationPreference } = await import(
      "../use-notification-preference"
    );
    const { result } = renderHook(() => useNotificationPreference());

    expect(result.current.isSuppressed("mode-change-toast")).toBe(true);

    act(() => {
      result.current.resetPreferences();
    });

    expect(result.current.isSuppressed("mode-change-toast")).toBe(false);
    expect(result.current.isSuppressed("recovery-toast")).toBe(false);

    // Verify localStorage was cleared
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("handles invalid JSON in localStorage gracefully", async () => {
    localStorage.setItem(STORAGE_KEY, "invalid-json");

    const { useNotificationPreference } = await import(
      "../use-notification-preference"
    );
    const { result } = renderHook(() => useNotificationPreference());

    // Should return defaults without throwing
    expect(result.current.preferences["mode-change-toast"]).toBe(false);
  });
});
