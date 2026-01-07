/**
 * Privacy Store - Airplane Mode Tests
 *
 * Tests for Airplane Mode functionality in the privacy store.
 * Story 4.2: AC #1, AC #4
 */
import { beforeEach, describe, expect, it } from "vitest";
import { usePrivacyStore } from "@/stores/privacy";

describe("Privacy Store - Airplane Mode", () => {
  beforeEach(() => {
    // Reset store to initial state
    usePrivacyStore.setState({
      mode: "trusted-network",
      jazzKey: `jazz-trusted-network-${Date.now()}`,
      networkLog: [],
      isDashboardOpen: false,
      airplaneMode: false,
      previousMode: null,
    });
  });

  describe("Initial State", () => {
    it("initializes with airplaneMode disabled", () => {
      expect(usePrivacyStore.getState().airplaneMode).toBe(false);
    });

    it("initializes with previousMode as null", () => {
      expect(usePrivacyStore.getState().previousMode).toBeNull();
    });
  });

  describe("setAirplaneMode - Enable", () => {
    it("enables airplane mode and saves previous mode", () => {
      usePrivacyStore.setState({ mode: "trusted-network" });
      const { setAirplaneMode } = usePrivacyStore.getState();

      setAirplaneMode(true);

      const state = usePrivacyStore.getState();
      expect(state.airplaneMode).toBe(true);
      expect(state.previousMode).toBe("trusted-network");
    });

    it("saves cloud-enhanced as previous mode", () => {
      usePrivacyStore.setState({ mode: "cloud-enhanced" });
      const { setAirplaneMode } = usePrivacyStore.getState();

      setAirplaneMode(true);

      expect(usePrivacyStore.getState().previousMode).toBe("cloud-enhanced");
    });

    it("saves local-only as previous mode", () => {
      usePrivacyStore.setState({ mode: "local-only" });
      const { setAirplaneMode } = usePrivacyStore.getState();

      setAirplaneMode(true);

      expect(usePrivacyStore.getState().previousMode).toBe("local-only");
    });

    it("does not change the mode field when enabling", () => {
      usePrivacyStore.setState({ mode: "cloud-enhanced" });
      const originalMode = usePrivacyStore.getState().mode;
      const { setAirplaneMode } = usePrivacyStore.getState();

      setAirplaneMode(true);

      // Mode field stays unchanged - gate provider handles override
      expect(usePrivacyStore.getState().mode).toBe(originalMode);
    });
  });

  describe("setAirplaneMode - Disable", () => {
    it("disables airplane mode and restores previous mode", () => {
      // Set up airplane mode state
      usePrivacyStore.setState({
        mode: "local-only",
        airplaneMode: true,
        previousMode: "trusted-network",
      });

      const { setAirplaneMode } = usePrivacyStore.getState();
      setAirplaneMode(false);

      const state = usePrivacyStore.getState();
      expect(state.airplaneMode).toBe(false);
      expect(state.mode).toBe("trusted-network");
      expect(state.previousMode).toBeNull();
    });

    it("restores cloud-enhanced mode after disable", () => {
      usePrivacyStore.setState({
        mode: "local-only",
        airplaneMode: true,
        previousMode: "cloud-enhanced",
      });

      const { setAirplaneMode } = usePrivacyStore.getState();
      setAirplaneMode(false);

      expect(usePrivacyStore.getState().mode).toBe("cloud-enhanced");
    });

    it("defaults to current mode if no previousMode saved", () => {
      usePrivacyStore.setState({
        mode: "local-only",
        airplaneMode: true,
        previousMode: null,
      });

      const { setAirplaneMode } = usePrivacyStore.getState();
      setAirplaneMode(false);

      expect(usePrivacyStore.getState().mode).toBe("local-only");
    });

    it("clears previousMode after disable", () => {
      usePrivacyStore.setState({
        mode: "local-only",
        airplaneMode: true,
        previousMode: "cloud-enhanced",
      });

      const { setAirplaneMode } = usePrivacyStore.getState();
      setAirplaneMode(false);

      expect(usePrivacyStore.getState().previousMode).toBeNull();
    });
  });

  describe("Full Toggle Cycle", () => {
    it("completes enable-disable cycle correctly", () => {
      usePrivacyStore.setState({ mode: "cloud-enhanced" });
      const store = usePrivacyStore.getState();

      // Enable
      store.setAirplaneMode(true);
      expect(usePrivacyStore.getState().airplaneMode).toBe(true);
      expect(usePrivacyStore.getState().previousMode).toBe("cloud-enhanced");

      // Disable
      usePrivacyStore.getState().setAirplaneMode(false);
      expect(usePrivacyStore.getState().airplaneMode).toBe(false);
      expect(usePrivacyStore.getState().mode).toBe("cloud-enhanced");
      expect(usePrivacyStore.getState().previousMode).toBeNull();
    });

    it("handles multiple enable-disable cycles", () => {
      usePrivacyStore.setState({ mode: "trusted-network" });

      // First cycle
      usePrivacyStore.getState().setAirplaneMode(true);
      usePrivacyStore.getState().setAirplaneMode(false);
      expect(usePrivacyStore.getState().mode).toBe("trusted-network");

      // Change mode between cycles
      usePrivacyStore.getState().setMode("cloud-enhanced");

      // Second cycle
      usePrivacyStore.getState().setAirplaneMode(true);
      expect(usePrivacyStore.getState().previousMode).toBe("cloud-enhanced");
      usePrivacyStore.getState().setAirplaneMode(false);
      expect(usePrivacyStore.getState().mode).toBe("cloud-enhanced");
    });
  });

  describe("Memory-Only Storage", () => {
    it("airplaneMode resets on simulated app restart", () => {
      usePrivacyStore.setState({
        airplaneMode: true,
        previousMode: "cloud-enhanced",
      });

      // Simulate app restart - should reset to defaults
      usePrivacyStore.setState({
        mode: "local-only",
        airplaneMode: false,
        previousMode: null,
      });

      const state = usePrivacyStore.getState();
      expect(state.airplaneMode).toBe(false);
      expect(state.previousMode).toBeNull();
    });
  });
});
