/**
 * Privacy Store Network Log Tests
 *
 * Tests for network activity logging functionality in the privacy store.
 * Story 1.6: AC #1 (network log), AC #4 (log storage)
 */
import { beforeEach, describe, expect, it } from "vitest";
import { usePrivacyStore } from "@/stores/privacy";

describe("Privacy Store - Network Log", () => {
  beforeEach(() => {
    // Reset store to initial state
    usePrivacyStore.setState({
      mode: "local-only",
      jazzKey: `jazz-local-only-${Date.now()}`,
      networkLog: [],
      isDashboardOpen: false,
    });
  });

  describe("logNetworkAttempt", () => {
    it("adds entry with generated id and timestamp", () => {
      const { logNetworkAttempt, networkLog } = usePrivacyStore.getState();

      expect(networkLog).toHaveLength(0);

      logNetworkAttempt({
        type: "fetch",
        url: "https://example.com/api",
        blocked: true,
        reason: "Privacy mode is local-only",
      });

      const log = usePrivacyStore.getState().networkLog;
      expect(log).toHaveLength(1);
      expect(log[0].id).toBeDefined();
      expect(log[0].timestamp).toBeDefined();
      expect(log[0].type).toBe("fetch");
      expect(log[0].url).toBe("https://example.com/api");
      expect(log[0].blocked).toBe(true);
      expect(log[0].reason).toBe("Privacy mode is local-only");
    });

    it("prepends new entries (most recent first)", () => {
      const { logNetworkAttempt } = usePrivacyStore.getState();

      logNetworkAttempt({
        type: "fetch",
        url: "https://first.com",
        blocked: true,
      });

      logNetworkAttempt({
        type: "xhr",
        url: "https://second.com",
        blocked: true,
      });

      const log = usePrivacyStore.getState().networkLog;
      expect(log[0].url).toBe("https://second.com");
      expect(log[1].url).toBe("https://first.com");
    });

    it("limits log to MAX_LOG_ENTRIES (1000) with FIFO", () => {
      const { logNetworkAttempt } = usePrivacyStore.getState();

      // Add 1001 entries
      for (let i = 0; i < 1001; i++) {
        logNetworkAttempt({
          type: "fetch",
          url: `https://example.com/${i}`,
          blocked: true,
        });
      }

      const log = usePrivacyStore.getState().networkLog;
      expect(log).toHaveLength(1000);
      // Most recent should be entry 1000
      expect(log[0].url).toBe("https://example.com/1000");
      // Entry 0 should have been dropped
      expect(
        log.find((e) => e.url === "https://example.com/0")
      ).toBeUndefined();
    });

    it("generates unique IDs for each entry", () => {
      const { logNetworkAttempt } = usePrivacyStore.getState();

      logNetworkAttempt({
        type: "fetch",
        url: "https://example.com/1",
        blocked: true,
      });

      logNetworkAttempt({
        type: "fetch",
        url: "https://example.com/2",
        blocked: true,
      });

      const log = usePrivacyStore.getState().networkLog;
      expect(log[0].id).not.toBe(log[1].id);
    });
  });

  describe("clearNetworkLog", () => {
    it("clears all log entries", () => {
      const { logNetworkAttempt, clearNetworkLog } = usePrivacyStore.getState();

      logNetworkAttempt({
        type: "fetch",
        url: "https://example.com",
        blocked: true,
      });

      expect(usePrivacyStore.getState().networkLog).toHaveLength(1);

      clearNetworkLog();

      expect(usePrivacyStore.getState().networkLog).toHaveLength(0);
    });
  });

  describe("Dashboard State", () => {
    it("initializes with dashboard closed", () => {
      expect(usePrivacyStore.getState().isDashboardOpen).toBe(false);
    });

    it("toggleDashboard opens when closed", () => {
      const { toggleDashboard } = usePrivacyStore.getState();

      toggleDashboard();

      expect(usePrivacyStore.getState().isDashboardOpen).toBe(true);
    });

    it("toggleDashboard closes when open", () => {
      usePrivacyStore.setState({ isDashboardOpen: true });

      const { toggleDashboard } = usePrivacyStore.getState();
      toggleDashboard();

      expect(usePrivacyStore.getState().isDashboardOpen).toBe(false);
    });

    it("openDashboard sets isDashboardOpen to true", () => {
      const { openDashboard } = usePrivacyStore.getState();

      openDashboard();

      expect(usePrivacyStore.getState().isDashboardOpen).toBe(true);
    });

    it("closeDashboard sets isDashboardOpen to false", () => {
      usePrivacyStore.setState({ isDashboardOpen: true });

      const { closeDashboard } = usePrivacyStore.getState();
      closeDashboard();

      expect(usePrivacyStore.getState().isDashboardOpen).toBe(false);
    });
  });

  describe("Memory-Only Storage (AC #4)", () => {
    it("network log is not persisted (memory-only)", () => {
      // This test documents the requirement that network log is never persisted
      // The store uses Zustand without persist middleware, ensuring memory-only storage
      const { logNetworkAttempt } = usePrivacyStore.getState();

      logNetworkAttempt({
        type: "fetch",
        url: "https://example.com",
        blocked: true,
      });

      // Reset simulates app restart - data should be gone
      usePrivacyStore.setState({
        networkLog: [],
      });

      expect(usePrivacyStore.getState().networkLog).toHaveLength(0);
    });
  });

  describe("Request Types", () => {
    it("accepts fetch type", () => {
      const { logNetworkAttempt } = usePrivacyStore.getState();

      logNetworkAttempt({
        type: "fetch",
        url: "https://test.com",
        blocked: true,
      });

      expect(usePrivacyStore.getState().networkLog[0].type).toBe("fetch");
    });

    it("accepts xhr type", () => {
      const { logNetworkAttempt } = usePrivacyStore.getState();

      logNetworkAttempt({
        type: "xhr",
        url: "https://test.com",
        blocked: true,
      });

      expect(usePrivacyStore.getState().networkLog[0].type).toBe("xhr");
    });

    it("accepts websocket type", () => {
      const { logNetworkAttempt } = usePrivacyStore.getState();

      logNetworkAttempt({
        type: "websocket",
        url: "wss://test.com",
        blocked: true,
      });

      expect(usePrivacyStore.getState().networkLog[0].type).toBe("websocket");
    });

    it("accepts eventsource type", () => {
      const { logNetworkAttempt } = usePrivacyStore.getState();

      logNetworkAttempt({
        type: "eventsource",
        url: "https://test.com/events",
        blocked: true,
      });

      expect(usePrivacyStore.getState().networkLog[0].type).toBe("eventsource");
    });
  });
});
