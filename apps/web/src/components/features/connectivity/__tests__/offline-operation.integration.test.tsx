import { render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOfflineCapability } from "@/hooks/use-offline-capability";
import { useConnectivityStore } from "@/stores/connectivity";
import { useModelStore } from "@/stores/models";
import { usePrivacyStore } from "@/stores/privacy";
import { useSyncQueueStore } from "@/stores/sync-queue";
import { OfflineFeatureGate } from "../offline-feature-gate";
import { SyncStatusIndicator } from "../sync-status-indicator";

/**
 * Offline Operation Integration Tests
 *
 * Story 4.5: All Acceptance Criteria
 * Tests the complete offline workflow across stores, hooks, and components.
 */

// Mock connectivity transition hook
vi.mock("@/hooks/use-connectivity-transition", () => ({
  useConnectivityTransition: () => ({
    onTransitionEvent: vi.fn((callback) => {
      // Store the callback for manual triggering
      (
        globalThis as unknown as { __transitionCallback?: typeof callback }
      ).__transitionCallback = callback;
      return () => {
        (
          globalThis as unknown as { __transitionCallback?: undefined }
        ).__transitionCallback = undefined;
      };
    }),
    currentTransition: null,
    isTransitioning: false,
  }),
}));

describe("Offline Operation Integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Reset all stores to default state
    useConnectivityStore.setState({
      isOnline: true,
      isStable: true,
      lastChecked: null,
      isSyncing: false,
      lastSyncedAt: null,
      pendingSyncCount: 0,
    });

    usePrivacyStore.setState({
      airplaneMode: false,
    });

    useModelStore.setState({
      downloadedModels: ["llama-3.2-1b"],
      selectedModelId: "llama-3.2-1b",
    });

    useSyncQueueStore.setState({
      entries: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("AC2: Local Persistence with Eventual Sync", () => {
    it("sync queue populates during offline operations", () => {
      // Go offline
      useConnectivityStore.setState({ isOnline: false });

      // Simulate session creation
      const id1 = useSyncQueueStore.getState().addToQueue("session-create", {
        sessionId: "session-1",
        data: { title: "Offline Session" },
      });

      // Simulate message addition
      const id2 = useSyncQueueStore.getState().addToQueue("message-add", {
        sessionId: "session-1",
        messageId: "msg-1",
        data: { content: "Hello from offline" },
      });

      const entries = useSyncQueueStore.getState().entries;
      expect(entries).toHaveLength(2);
      expect(entries[0].id).toBe(id1);
      expect(entries[0].operation).toBe("session-create");
      expect(entries[0].status).toBe("pending");
      expect(entries[1].id).toBe(id2);
      expect(entries[1].operation).toBe("message-add");
    });

    it("queue entries preserve order for sequential sync", () => {
      useConnectivityStore.setState({ isOnline: false });

      // Add operations in specific order
      useSyncQueueStore
        .getState()
        .addToQueue("session-create", { sessionId: "s1" });
      useSyncQueueStore
        .getState()
        .addToQueue("message-add", { messageId: "m1" });
      useSyncQueueStore
        .getState()
        .addToQueue("session-update", { sessionId: "s1" });

      const pending = useSyncQueueStore.getState().getQueuedOperations();
      expect(pending[0].operation).toBe("session-create");
      expect(pending[1].operation).toBe("message-add");
      expect(pending[2].operation).toBe("session-update");
    });
  });

  describe("AC3: Extended Offline Operation", () => {
    it("handles many offline changes gracefully", () => {
      useConnectivityStore.setState({ isOnline: false });

      // Simulate extended offline use with many operations
      for (let i = 0; i < 50; i++) {
        useSyncQueueStore.getState().addToQueue("message-add", {
          messageId: `msg-${i}`,
          data: { content: `Message ${i}` },
        });
      }

      const entries = useSyncQueueStore.getState().entries;
      expect(entries).toHaveLength(50);
      expect(entries.every((e) => e.status === "pending")).toBe(true);
    });

    it("pending count reflects queue size", () => {
      useConnectivityStore.setState({ isOnline: false });

      // Add several operations
      for (let i = 0; i < 5; i++) {
        useSyncQueueStore
          .getState()
          .addToQueue("message-add", { messageId: `msg-${i}` });
      }

      // Update pending sync count
      useConnectivityStore.setState({
        pendingSyncCount: useSyncQueueStore.getState().entries.length,
      });

      expect(useConnectivityStore.getState().pendingSyncCount).toBe(5);
    });
  });

  describe("AC4: Cloud Feature Limitations", () => {
    it("OfflineFeatureGate blocks cloud features when offline", () => {
      useConnectivityStore.setState({ isOnline: false });

      render(
        <OfflineFeatureGate feature="Cloud Sync" requiresCloud>
          <button type="button">Sync Now</button>
        </OfflineFeatureGate>
      );

      // Children should not be rendered
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      // Gate message should be shown
      expect(screen.getByTestId("offline-feature-gate")).toBeInTheDocument();
      expect(
        screen.getByText("Cloud Sync requires an internet connection")
      ).toBeInTheDocument();
    });

    it("OfflineFeatureGate allows cloud features when online", () => {
      useConnectivityStore.setState({ isOnline: true });

      render(
        <OfflineFeatureGate feature="Cloud Sync" requiresCloud>
          <button type="button">Sync Now</button>
        </OfflineFeatureGate>
      );

      // Children should be rendered
      expect(
        screen.getByRole("button", { name: "Sync Now" })
      ).toBeInTheDocument();
      // Gate should not be shown
      expect(
        screen.queryByTestId("offline-feature-gate")
      ).not.toBeInTheDocument();
    });

    it("OfflineFeatureGate shows airplane mode message", () => {
      useConnectivityStore.setState({ isOnline: true });
      usePrivacyStore.setState({ airplaneMode: true });

      render(
        <OfflineFeatureGate feature="Cloud Backup" requiresCloud>
          <span>Backup</span>
        </OfflineFeatureGate>
      );

      expect(
        screen.getByText("Disable Airplane Mode to use this feature")
      ).toBeInTheDocument();
    });
  });

  describe("AC5: Auto-Sync on Reconnect", () => {
    it("SyncStatusIndicator shows syncing state during active sync", () => {
      useConnectivityStore.setState({ isSyncing: true });

      render(<SyncStatusIndicator />);

      expect(screen.getByText("Syncing...")).toBeInTheDocument();
      expect(screen.getByTestId("sync-status-indicator")).toHaveAttribute(
        "data-status",
        "syncing"
      );
    });

    it("SyncStatusIndicator shows pending count when offline with queue", () => {
      useConnectivityStore.setState({
        isOnline: false,
        pendingSyncCount: 7,
      });

      render(<SyncStatusIndicator />);

      expect(screen.getByText("7 pending")).toBeInTheDocument();
      expect(screen.getByTestId("sync-status-indicator")).toHaveAttribute(
        "data-status",
        "pending"
      );
    });

    it("SyncStatusIndicator is hidden when idle", () => {
      useConnectivityStore.setState({
        isOnline: true,
        isSyncing: false,
        pendingSyncCount: 0,
      });

      render(<SyncStatusIndicator />);

      expect(screen.getByTestId("sync-status-indicator")).toHaveAttribute(
        "data-status",
        "idle"
      );
    });
  });

  describe("AC1: Full Offline Functionality", () => {
    it("useOfflineCapability reports correct state when model is downloaded", () => {
      useModelStore.setState({ downloadedModels: ["llama-3.2-1b"] });
      useConnectivityStore.setState({ isOnline: false });

      const { result } = renderHook(() => useOfflineCapability());

      expect(result.current.canWorkOffline).toBe(true);
      expect(result.current.hasLocalModel).toBe(true);
      expect(result.current.isOffline).toBe(true);
      expect(result.current.offlineFeatures).toContain("chat");
      expect(result.current.offlineFeatures).toContain("inference");
    });

    it("useOfflineCapability reports limitation when no model", () => {
      useModelStore.setState({ downloadedModels: [] });

      const { result } = renderHook(() => useOfflineCapability());

      expect(result.current.canWorkOffline).toBe(false);
      expect(result.current.hasLocalModel).toBe(false);
      expect(result.current.offlineLimitationReason).toBe(
        "No AI model downloaded. Download a model to work offline."
      );
    });
  });

  describe("Sync Workflow Integration", () => {
    it("queue clears as entries complete during sync", async () => {
      // Setup: offline with pending queue
      useConnectivityStore.setState({ isOnline: false });

      const id1 = useSyncQueueStore.getState().addToQueue("session-create", {});
      const id2 = useSyncQueueStore.getState().addToQueue("message-add", {});

      expect(useSyncQueueStore.getState().entries).toHaveLength(2);

      // Simulate sync completion
      useSyncQueueStore.getState().markSyncing(id1);
      useSyncQueueStore.getState().markCompleted(id1);
      useSyncQueueStore.getState().markSyncing(id2);
      useSyncQueueStore.getState().markCompleted(id2);
      useSyncQueueStore.getState().clearCompleted();

      expect(useSyncQueueStore.getState().entries).toHaveLength(0);
    });

    it("failed entries are preserved for retry", () => {
      const id = useSyncQueueStore.getState().addToQueue("session-create", {});

      useSyncQueueStore.getState().markSyncing(id);
      useSyncQueueStore.getState().markFailed(id, "Network timeout");

      const entry = useSyncQueueStore.getState().entries[0];
      expect(entry.status).toBe("failed");
      expect(entry.error).toBe("Network timeout");
      expect(entry.retryCount).toBe(1);

      // Entry should still be in queue for retry
      expect(useSyncQueueStore.getState().entries).toHaveLength(1);
    });
  });
});
