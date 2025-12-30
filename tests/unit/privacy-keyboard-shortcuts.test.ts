/**
 * Privacy Keyboard Shortcuts Tests
 *
 * Tests for keyboard shortcuts that switch privacy modes.
 * Story 1.2: AC #2 (Cmd+1/Cmd+2/Cmd+3)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRIVACY_SHORTCUTS } from "../../apps/web/src/components/features/privacy/use-privacy-keyboard-shortcuts";
import { usePrivacyStore } from "../../apps/web/src/stores/privacy";

// Mock React hooks for Node environment
vi.mock("react", () => ({
  useEffect: (fn: () => undefined | (() => void)) => {
    const cleanup = fn();
    return cleanup;
  },
}));

describe("Privacy Keyboard Shortcuts", () => {
  beforeEach(() => {
    // Reset store to initial state
    usePrivacyStore.setState({
      mode: "local-only",
      jazzKey: `jazz-local-only-${Date.now()}`,
    });
  });

  describe("PRIVACY_SHORTCUTS mapping", () => {
    it("maps key 1 to local-only mode", () => {
      expect(PRIVACY_SHORTCUTS["1"]).toBe("local-only");
    });

    it("maps key 2 to trusted-network mode", () => {
      expect(PRIVACY_SHORTCUTS["2"]).toBe("trusted-network");
    });

    it("maps key 3 to cloud-enhanced mode", () => {
      expect(PRIVACY_SHORTCUTS["3"]).toBe("cloud-enhanced");
    });
  });

  describe("Keyboard event handling", () => {
    it("changes mode to local-only when Cmd+1 is pressed", () => {
      // Set to a different mode first
      usePrivacyStore.setState({ mode: "cloud-enhanced" });

      // Simulate the keyboard event handling logic
      const event = {
        metaKey: true,
        ctrlKey: false,
        key: "1",
        preventDefault: vi.fn(),
      };

      const mode = PRIVACY_SHORTCUTS[event.key];
      if ((event.metaKey || event.ctrlKey) && mode) {
        usePrivacyStore.getState().setMode(mode);
      }

      expect(usePrivacyStore.getState().mode).toBe("local-only");
    });

    it("changes mode to trusted-network when Cmd+2 is pressed", () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
        key: "2",
        preventDefault: vi.fn(),
      };

      const mode = PRIVACY_SHORTCUTS[event.key];
      if ((event.metaKey || event.ctrlKey) && mode) {
        usePrivacyStore.getState().setMode(mode);
      }

      expect(usePrivacyStore.getState().mode).toBe("trusted-network");
    });

    it("changes mode to cloud-enhanced when Cmd+3 is pressed", () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
        key: "3",
        preventDefault: vi.fn(),
      };

      const mode = PRIVACY_SHORTCUTS[event.key];
      if ((event.metaKey || event.ctrlKey) && mode) {
        usePrivacyStore.getState().setMode(mode);
      }

      expect(usePrivacyStore.getState().mode).toBe("cloud-enhanced");
    });

    it("works with Ctrl key (Windows/Linux)", () => {
      const event = {
        metaKey: false,
        ctrlKey: true,
        key: "2",
        preventDefault: vi.fn(),
      };

      const mode = PRIVACY_SHORTCUTS[event.key];
      if ((event.metaKey || event.ctrlKey) && mode) {
        usePrivacyStore.getState().setMode(mode);
      }

      expect(usePrivacyStore.getState().mode).toBe("trusted-network");
    });

    it("does not change mode when modifier is not pressed", () => {
      const event = {
        metaKey: false,
        ctrlKey: false,
        key: "2",
        preventDefault: vi.fn(),
      };

      const originalMode = usePrivacyStore.getState().mode;

      const mode = PRIVACY_SHORTCUTS[event.key];
      if ((event.metaKey || event.ctrlKey) && mode) {
        usePrivacyStore.getState().setMode(mode);
      }

      expect(usePrivacyStore.getState().mode).toBe(originalMode);
    });

    it("does not change mode for unmapped keys", () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
        key: "9",
        preventDefault: vi.fn(),
      };

      const originalMode = usePrivacyStore.getState().mode;

      const mode = PRIVACY_SHORTCUTS[event.key];
      if ((event.metaKey || event.ctrlKey) && mode) {
        usePrivacyStore.getState().setMode(mode);
      }

      expect(usePrivacyStore.getState().mode).toBe(originalMode);
    });
  });

  describe("Performance (AC #3)", () => {
    it("mode switch via shortcut completes within 500ms", () => {
      const start = performance.now();

      const event = {
        metaKey: true,
        ctrlKey: false,
        key: "3",
        preventDefault: vi.fn(),
      };

      const mode = PRIVACY_SHORTCUTS[event.key];
      if ((event.metaKey || event.ctrlKey) && mode) {
        usePrivacyStore.getState().setMode(mode);
      }

      const end = performance.now();

      expect(usePrivacyStore.getState().mode).toBe("cloud-enhanced");
      expect(end - start).toBeLessThan(500);
    });
  });
});
