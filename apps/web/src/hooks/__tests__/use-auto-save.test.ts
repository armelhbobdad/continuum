/**
 * Auto-Save Hook Tests
 *
 * Tests for auto-save functionality that triggers session persistence.
 * Story 1.7: AC #1 (minimal data loss), AC #3 (non-blocking auto-save)
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useSessionStore } from "@/stores/session";

describe("useAutoSave Hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Reset session store state
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
      lastSavedAt: null,
      isDirty: false,
      wasRecovered: false,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe("Manual Save (Task 2.1)", () => {
    it("provides save function that clears dirty flag", async () => {
      // Make store dirty
      useSessionStore.setState({ isDirty: true });

      const { result } = renderHook(() => useAutoSave());

      expect(useSessionStore.getState().isDirty).toBe(true);

      act(() => {
        result.current.save();
      });

      // Advance past debounce time
      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(useSessionStore.getState().isDirty).toBe(false);
    });

    it("debounces rapid save calls (Task 2.3)", async () => {
      useSessionStore.setState({ isDirty: true });
      const clearDirtySpy = vi.spyOn(useSessionStore.getState(), "clearDirty");

      const { result } = renderHook(() => useAutoSave());

      // Call save multiple times rapidly
      act(() => {
        result.current.save();
        result.current.save();
        result.current.save();
      });

      // Advance to just before debounce completes
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // clearDirty should not be called yet
      expect(clearDirtySpy).not.toHaveBeenCalled();

      // Advance past debounce time
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Now it should be called - but only once
      expect(clearDirtySpy).toHaveBeenCalledTimes(1);
    });

    it("reports isDirty state", () => {
      useSessionStore.setState({ isDirty: false });
      const { result, rerender } = renderHook(() => useAutoSave());

      expect(result.current.isDirty).toBe(false);

      act(() => {
        useSessionStore.setState({ isDirty: true });
      });

      rerender();
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe("Interval Auto-Save (Task 2.2)", () => {
    it("triggers save every 30 seconds when dirty", () => {
      useSessionStore.setState({ isDirty: true });

      renderHook(() => useAutoSave());

      const initialLastSavedAt = useSessionStore.getState().lastSavedAt;

      // Advance 30 seconds
      act(() => {
        vi.advanceTimersByTime(30_000);
      });

      const afterIntervalLastSavedAt = useSessionStore.getState().lastSavedAt;

      // Should have saved (lastSavedAt updated)
      expect(afterIntervalLastSavedAt).not.toBe(initialLastSavedAt);
      expect(useSessionStore.getState().isDirty).toBe(false);
    });

    it("does not save when not dirty", () => {
      useSessionStore.setState({ isDirty: false, lastSavedAt: null });

      renderHook(() => useAutoSave());

      // Advance 30 seconds
      act(() => {
        vi.advanceTimersByTime(30_000);
      });

      // Should not have saved (lastSavedAt still null)
      expect(useSessionStore.getState().lastSavedAt).toBe(null);
    });

    it("cleans up interval on unmount", () => {
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      const { unmount } = renderHook(() => useAutoSave());

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe("Page Unload Save (Task 2.2)", () => {
    it("saves on beforeunload when dirty", () => {
      useSessionStore.setState({ isDirty: true, lastSavedAt: null });

      renderHook(() => useAutoSave());

      // Simulate beforeunload event
      const event = new Event("beforeunload");
      act(() => {
        window.dispatchEvent(event);
      });

      // Should have cleared dirty flag
      expect(useSessionStore.getState().isDirty).toBe(false);
      expect(useSessionStore.getState().lastSavedAt).not.toBe(null);
    });

    it("does not save on beforeunload when not dirty", () => {
      useSessionStore.setState({ isDirty: false, lastSavedAt: null });

      renderHook(() => useAutoSave());

      // Simulate beforeunload event
      const event = new Event("beforeunload");
      act(() => {
        window.dispatchEvent(event);
      });

      // lastSavedAt should still be null
      expect(useSessionStore.getState().lastSavedAt).toBe(null);
    });

    it("removes beforeunload listener on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() => useAutoSave());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function)
      );
    });
  });

  describe("Save Triggers (Task 2.2)", () => {
    it("provides triggerSave function for explicit save points", () => {
      useSessionStore.setState({ isDirty: true, lastSavedAt: null });

      const { result } = renderHook(() => useAutoSave());

      // triggerSave should be provided
      expect(typeof result.current.triggerSave).toBe("function");

      // Calling triggerSave should clear dirty immediately (bypass debounce)
      act(() => {
        result.current.triggerSave();
      });

      expect(useSessionStore.getState().isDirty).toBe(false);
      expect(useSessionStore.getState().lastSavedAt).not.toBe(null);
    });

    it("triggerSave does nothing when not dirty", () => {
      useSessionStore.setState({ isDirty: false, lastSavedAt: null });

      const { result } = renderHook(() => useAutoSave());

      act(() => {
        result.current.triggerSave();
      });

      // lastSavedAt should still be null (no save occurred)
      expect(useSessionStore.getState().lastSavedAt).toBe(null);
    });
  });

  describe("Performance (NFR-STATE-3)", () => {
    it("save operation is non-blocking", async () => {
      useSessionStore.setState({ isDirty: true });

      const { result } = renderHook(() => useAutoSave());

      // save() should return immediately (non-blocking)
      const start = performance.now();
      result.current.save();
      const duration = performance.now() - start;

      // Should complete in under 1ms (non-blocking)
      expect(duration).toBeLessThan(1);
    });
  });

  describe("Integration with Session Store", () => {
    it("lastSavedAt timestamp is updated after save", () => {
      useSessionStore.setState({ isDirty: true, lastSavedAt: null });

      const { result } = renderHook(() => useAutoSave());

      const beforeSave = Date.now();

      act(() => {
        result.current.triggerSave();
      });

      const { lastSavedAt } = useSessionStore.getState();
      expect(lastSavedAt).not.toBe(null);
      expect(lastSavedAt).toBeGreaterThanOrEqual(beforeSave);
    });
  });
});
