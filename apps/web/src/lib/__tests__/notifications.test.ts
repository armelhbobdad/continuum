/**
 * Notifications Utility Tests
 * Story 2.3: Model Download Manager - Task 9
 *
 * Tests for desktop notification handling.
 * AC3: Download completion notifications
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock platform module
let mockIsDesktop = false;

vi.mock("@continuum/platform", () => ({
  isDesktop: () => mockIsDesktop,
}));

// Mock Tauri notification plugin
const mockTauriIsPermissionGranted = vi.fn();
const mockTauriRequestPermission = vi.fn();
const mockTauriSendNotification = vi.fn();

vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: () => mockTauriIsPermissionGranted(),
  requestPermission: () => mockTauriRequestPermission(),
  sendNotification: (opts: unknown) => mockTauriSendNotification(opts),
}));

// Mock web Notification API
type MockNotificationFn = ReturnType<typeof vi.fn> & {
  permission: NotificationPermission;
  requestPermission: ReturnType<typeof vi.fn>;
};
const mockWebNotification = vi.fn() as MockNotificationFn;
const originalNotification = globalThis.Notification;

describe("notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockIsDesktop = false;

    // Reset web Notification mock
    (globalThis as { Notification?: unknown }).Notification =
      mockWebNotification;
    Object.defineProperty(mockWebNotification, "permission", {
      value: "default",
      writable: true,
      configurable: true,
    });
    mockWebNotification.requestPermission = vi.fn();
  });

  afterEach(() => {
    (globalThis as { Notification?: unknown }).Notification =
      originalNotification;
  });

  describe("isNotificationSupported", () => {
    it("should return true on desktop", async () => {
      mockIsDesktop = true;

      const { isNotificationSupported } = await import("../notifications");

      expect(isNotificationSupported()).toBe(true);
    });

    it("should return true when web Notification API exists", async () => {
      mockIsDesktop = false;

      const { isNotificationSupported } = await import("../notifications");

      expect(isNotificationSupported()).toBe(true);
    });

    it("should return false when no notification API", async () => {
      mockIsDesktop = false;
      (globalThis as { Notification?: unknown }).Notification = undefined;

      const { isNotificationSupported } = await import("../notifications");

      expect(isNotificationSupported()).toBe(false);
    });
  });

  describe("getNotificationPermission", () => {
    it("should check Tauri permission on desktop", async () => {
      mockIsDesktop = true;
      mockTauriIsPermissionGranted.mockResolvedValue(true);

      const { getNotificationPermission } = await import("../notifications");
      const permission = await getNotificationPermission();

      expect(permission).toBe("granted");
    });

    it("should return 'default' when Tauri permission not granted", async () => {
      mockIsDesktop = true;
      mockTauriIsPermissionGranted.mockResolvedValue(false);

      const { getNotificationPermission } = await import("../notifications");
      const permission = await getNotificationPermission();

      expect(permission).toBe("default");
    });

    it("should check web Notification.permission on web", async () => {
      mockIsDesktop = false;
      Object.defineProperty(mockWebNotification, "permission", {
        value: "granted",
        configurable: true,
      });

      const { getNotificationPermission } = await import("../notifications");
      const permission = await getNotificationPermission();

      expect(permission).toBe("granted");
    });
  });

  describe("requestNotificationPermission", () => {
    it("should request Tauri permission on desktop", async () => {
      mockIsDesktop = true;
      mockTauriRequestPermission.mockResolvedValue(undefined);
      mockTauriIsPermissionGranted.mockResolvedValue(true);

      const { requestNotificationPermission } = await import(
        "../notifications"
      );
      const result = await requestNotificationPermission();

      expect(mockTauriRequestPermission).toHaveBeenCalled();
      expect(result).toBe("granted");
    });

    it("should request web permission on web", async () => {
      mockIsDesktop = false;
      mockWebNotification.requestPermission = vi
        .fn()
        .mockResolvedValue("granted");

      const { requestNotificationPermission } = await import(
        "../notifications"
      );
      const result = await requestNotificationPermission();

      expect(mockWebNotification.requestPermission).toHaveBeenCalled();
      expect(result).toBe("granted");
    });
  });

  describe("sendNotification", () => {
    it("should send Tauri notification on desktop", async () => {
      mockIsDesktop = true;
      mockTauriIsPermissionGranted.mockResolvedValue(true);
      mockTauriSendNotification.mockResolvedValue(undefined);

      const { sendNotification } = await import("../notifications");
      const result = await sendNotification({
        title: "Test",
        body: "Test body",
      });

      expect(mockTauriSendNotification).toHaveBeenCalledWith({
        title: "Test",
        body: "Test body",
      });
      expect(result).toBe(true);
    });

    it("should send web notification on web", async () => {
      mockIsDesktop = false;
      Object.defineProperty(mockWebNotification, "permission", {
        value: "granted",
        configurable: true,
      });

      const { sendNotification } = await import("../notifications");
      const result = await sendNotification({
        title: "Test",
        body: "Test body",
      });

      expect(mockWebNotification).toHaveBeenCalledWith("Test", {
        body: "Test body",
        icon: undefined,
      });
      expect(result).toBe(true);
    });

    it("should return false when permission not granted", async () => {
      mockIsDesktop = false;
      Object.defineProperty(mockWebNotification, "permission", {
        value: "denied",
        configurable: true,
      });

      const { sendNotification } = await import("../notifications");
      const result = await sendNotification({
        title: "Test",
        body: "Test body",
      });

      expect(result).toBe(false);
    });
  });

  describe("notifyDownloadComplete (AC3)", () => {
    it("should send completion notification with model name", async () => {
      mockIsDesktop = true;
      mockTauriIsPermissionGranted.mockResolvedValue(true);
      mockTauriSendNotification.mockResolvedValue(undefined);

      const { notifyDownloadComplete } = await import("../notifications");
      await notifyDownloadComplete("Phi-3 Mini");

      expect(mockTauriSendNotification).toHaveBeenCalledWith({
        title: "Download Complete",
        body: "Phi-3 Mini is ready to use",
      });
    });
  });

  describe("notifyDownloadFailed", () => {
    it("should send failure notification with error", async () => {
      mockIsDesktop = true;
      mockTauriIsPermissionGranted.mockResolvedValue(true);
      mockTauriSendNotification.mockResolvedValue(undefined);

      const { notifyDownloadFailed } = await import("../notifications");
      await notifyDownloadFailed("Phi-3 Mini", "Network error");

      expect(mockTauriSendNotification).toHaveBeenCalledWith({
        title: "Download Failed",
        body: "Phi-3 Mini: Network error",
      });
    });

    it("should send generic message without error", async () => {
      mockIsDesktop = true;
      mockTauriIsPermissionGranted.mockResolvedValue(true);
      mockTauriSendNotification.mockResolvedValue(undefined);

      const { notifyDownloadFailed } = await import("../notifications");
      await notifyDownloadFailed("Phi-3 Mini");

      expect(mockTauriSendNotification).toHaveBeenCalledWith({
        title: "Download Failed",
        body: "Failed to download Phi-3 Mini",
      });
    });
  });

  describe("notifyLowStorage", () => {
    it("should send storage warning with MB", async () => {
      mockIsDesktop = true;
      mockTauriIsPermissionGranted.mockResolvedValue(true);
      mockTauriSendNotification.mockResolvedValue(undefined);

      const { notifyLowStorage } = await import("../notifications");
      await notifyLowStorage(500);

      expect(mockTauriSendNotification).toHaveBeenCalledWith({
        title: "Low Storage",
        body: "Need 500 MB more space",
      });
    });

    it("should send storage warning with GB for large values", async () => {
      mockIsDesktop = true;
      mockTauriIsPermissionGranted.mockResolvedValue(true);
      mockTauriSendNotification.mockResolvedValue(undefined);

      const { notifyLowStorage } = await import("../notifications");
      await notifyLowStorage(2048);

      expect(mockTauriSendNotification).toHaveBeenCalledWith({
        title: "Low Storage",
        body: "Need 2.0 GB more space",
      });
    });
  });
});
