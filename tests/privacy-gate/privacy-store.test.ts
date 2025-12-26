/**
 * Privacy Store Unit Tests
 *
 * Tests for the Zustand privacy store that manages privacy mode state.
 * Story 1.2: AC #1 (indicator visibility), AC #3 (mode switch), AC #5 (restrictive transition)
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { PrivacyMode } from "../../apps/web/src/stores/privacy";
import { usePrivacyStore } from "../../apps/web/src/stores/privacy";

// Top-level regex patterns for performance
const JAZZ_LOCAL_ONLY_REGEX = /^jazz-local-only-/;
const JAZZ_TRUSTED_NETWORK_REGEX = /^jazz-trusted-network-/;

describe("Privacy Store", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    usePrivacyStore.setState({
      mode: "local-only",
      jazzKey: `jazz-local-only-${Date.now()}`,
    });
  });

  describe("Initial State", () => {
    it("should initialize with local-only mode (most restrictive default)", () => {
      const state = usePrivacyStore.getState();
      expect(state.mode).toBe("local-only");
    });

    it("should have a jazzKey on initialization", () => {
      const state = usePrivacyStore.getState();
      expect(state.jazzKey).toBeDefined();
      expect(state.jazzKey).toMatch(JAZZ_LOCAL_ONLY_REGEX);
    });
  });

  describe("Mode Switching", () => {
    it("should update mode when setMode is called", () => {
      const { setMode } = usePrivacyStore.getState();

      setMode("trusted-network");
      expect(usePrivacyStore.getState().mode).toBe("trusted-network");

      setMode("cloud-enhanced");
      expect(usePrivacyStore.getState().mode).toBe("cloud-enhanced");

      setMode("local-only");
      expect(usePrivacyStore.getState().mode).toBe("local-only");
    });

    it("should support all three privacy modes", () => {
      const modes: PrivacyMode[] = [
        "local-only",
        "trusted-network",
        "cloud-enhanced",
      ];
      const { setMode } = usePrivacyStore.getState();

      for (const mode of modes) {
        setMode(mode);
        expect(usePrivacyStore.getState().mode).toBe(mode);
      }
    });
  });

  describe("Jazz Key Generation (AC #3)", () => {
    it("should generate new jazzKey when mode changes", () => {
      const initialKey = usePrivacyStore.getState().jazzKey;
      const { setMode } = usePrivacyStore.getState();

      setMode("trusted-network");
      const newKey = usePrivacyStore.getState().jazzKey;

      expect(newKey).not.toBe(initialKey);
      expect(newKey).toMatch(JAZZ_TRUSTED_NETWORK_REGEX);
    });

    it("should include mode name in jazzKey", () => {
      const { setMode } = usePrivacyStore.getState();

      setMode("local-only");
      expect(usePrivacyStore.getState().jazzKey).toContain("local-only");

      setMode("trusted-network");
      expect(usePrivacyStore.getState().jazzKey).toContain("trusted-network");

      setMode("cloud-enhanced");
      expect(usePrivacyStore.getState().jazzKey).toContain("cloud-enhanced");
    });

    it("should generate unique jazzKey on each mode change", async () => {
      const { setMode } = usePrivacyStore.getState();
      const keys = new Set<string>();

      // Generate multiple keys by switching modes
      for (let i = 0; i < 5; i++) {
        setMode("trusted-network");
        keys.add(usePrivacyStore.getState().jazzKey);
        // Small delay to ensure timestamp differs
        await new Promise((resolve) => setTimeout(resolve, 2));
        setMode("local-only");
        keys.add(usePrivacyStore.getState().jazzKey);
        await new Promise((resolve) => setTimeout(resolve, 2));
      }

      // All keys should be unique
      expect(keys.size).toBe(10);
    });
  });

  describe("Memory-Only Storage (No Persistence)", () => {
    it("should not use persist middleware", () => {
      // Verify the store doesn't have persist middleware by checking
      // that the store doesn't have persist-related methods
      const store = usePrivacyStore;

      // Zustand persist middleware adds these methods - we verify they don't exist
      // @ts-expect-error - checking for persist middleware methods
      expect(store.persist).toBeUndefined();

      // The store should work purely in memory
      const { setMode } = usePrivacyStore.getState();
      setMode("cloud-enhanced");
      expect(usePrivacyStore.getState().mode).toBe("cloud-enhanced");

      // Reset should work without any persistence side effects
      usePrivacyStore.setState({ mode: "local-only" });
      expect(usePrivacyStore.getState().mode).toBe("local-only");
    });
  });
});
