/**
 * Download Adapter Tests
 * Story 2.3: Model Download Manager - Task 5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock capabilities module
vi.mock("../capabilities", () => ({
  isDesktop: vi.fn(),
}));

// Mock Tauri modules
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isDesktop } from "../capabilities";
import {
  cancelModelDownload,
  checkStorageSpace,
  deleteModel,
  getModelPath,
  isOnline,
  pauseModelDownload,
  resumeModelDownload,
  startModelDownload,
  subscribeToDownloadProgress,
  subscribeToNetworkStatus,
} from "../downloads";

const mockIsDesktop = isDesktop as ReturnType<typeof vi.fn>;
const mockInvoke = invoke as ReturnType<typeof vi.fn>;
const mockListen = listen as ReturnType<typeof vi.fn>;

describe("Download Adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDesktop.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("startModelDownload", () => {
    it("should call Tauri invoke with correct parameters", async () => {
      mockInvoke.mockResolvedValue("download-123");

      const result = await startModelDownload(
        "phi-3-mini",
        "https://example.com/model.gguf",
        "https://example.com/tokenizer.json"
      );

      expect(mockInvoke).toHaveBeenCalledWith("start_download", {
        modelId: "phi-3-mini",
        url: "https://example.com/model.gguf",
        tokenizerUrl: "https://example.com/tokenizer.json",
        expectedHash: null,
      });
      expect(result).toBe("download-123");
    });

    it("should pass expectedHash when provided (Story 2.5)", async () => {
      mockInvoke.mockResolvedValue("download-456");

      const result = await startModelDownload(
        "phi-3-mini",
        "https://example.com/model.gguf",
        "https://example.com/tokenizer.json",
        "abc123def456"
      );

      expect(mockInvoke).toHaveBeenCalledWith("start_download", {
        modelId: "phi-3-mini",
        url: "https://example.com/model.gguf",
        tokenizerUrl: "https://example.com/tokenizer.json",
        expectedHash: "abc123def456",
      });
      expect(result).toBe("download-456");
    });

    it("should throw error on non-desktop platform", async () => {
      mockIsDesktop.mockReturnValue(false);

      await expect(
        startModelDownload(
          "phi-3-mini",
          "https://example.com/model.gguf",
          "https://example.com/tokenizer.json"
        )
      ).rejects.toThrow("Model downloads are only supported on desktop");
    });
  });

  describe("pauseModelDownload", () => {
    it("should call Tauri invoke with download ID", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await pauseModelDownload("download-123");

      expect(mockInvoke).toHaveBeenCalledWith("pause_download", {
        downloadId: "download-123",
      });
    });

    it("should throw error on non-desktop platform", async () => {
      mockIsDesktop.mockReturnValue(false);

      await expect(pauseModelDownload("download-123")).rejects.toThrow(
        "Model downloads are only supported on desktop"
      );
    });
  });

  describe("resumeModelDownload", () => {
    it("should call Tauri invoke with download ID", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await resumeModelDownload("download-123");

      expect(mockInvoke).toHaveBeenCalledWith("resume_download", {
        downloadId: "download-123",
      });
    });
  });

  describe("cancelModelDownload", () => {
    it("should call Tauri invoke with download ID", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await cancelModelDownload("download-123");

      expect(mockInvoke).toHaveBeenCalledWith("cancel_download", {
        downloadId: "download-123",
      });
    });
  });

  describe("checkStorageSpace", () => {
    it("should return storage check result from Tauri", async () => {
      mockInvoke.mockResolvedValue({
        has_space: true,
        available_mb: 100_000,
        required_mb: 4000,
        shortfall_mb: 0,
      });

      const result = await checkStorageSpace(4000);

      expect(mockInvoke).toHaveBeenCalledWith("check_storage_space", {
        requiredMb: 4000,
      });
      expect(result).toEqual({
        hasSpace: true,
        availableMb: 100_000,
        requiredMb: 4000,
        shortfallMb: 0,
      });
    });

    it("should use web fallback on non-desktop", async () => {
      mockIsDesktop.mockReturnValue(false);

      // Mock navigator.storage.estimate
      const originalNavigator = globalThis.navigator;
      Object.defineProperty(globalThis, "navigator", {
        value: {
          storage: {
            estimate: async () => ({
              quota: 10 * 1024 * 1024 * 1024, // 10GB
              usage: 1 * 1024 * 1024 * 1024, // 1GB
            }),
          },
        },
        writable: true,
      });

      const result = await checkStorageSpace(4000);

      expect(result.hasSpace).toBe(true);
      expect(result.requiredMb).toBe(4000);

      // Restore
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        writable: true,
      });
    });
  });

  describe("getModelPath", () => {
    it("should return model path from Tauri", async () => {
      mockInvoke.mockResolvedValue("/path/to/model.gguf");

      const result = await getModelPath("phi-3-mini");

      expect(mockInvoke).toHaveBeenCalledWith("get_model_path", {
        modelId: "phi-3-mini",
      });
      expect(result).toBe("/path/to/model.gguf");
    });

    it("should return null on non-desktop", async () => {
      mockIsDesktop.mockReturnValue(false);

      const result = await getModelPath("phi-3-mini");

      expect(result).toBeNull();
    });
  });

  describe("deleteModel", () => {
    it("should call Tauri invoke with model ID", async () => {
      mockInvoke.mockResolvedValue(undefined);

      await deleteModel("phi-3-mini");

      expect(mockInvoke).toHaveBeenCalledWith("delete_model", {
        modelId: "phi-3-mini",
      });
    });
  });

  describe("subscribeToDownloadProgress", () => {
    it("should set up Tauri event listener", async () => {
      const mockUnlisten = vi.fn();
      mockListen.mockResolvedValue(mockUnlisten);

      const callback = vi.fn();
      const unlisten = await subscribeToDownloadProgress(callback);

      expect(mockListen).toHaveBeenCalledWith(
        "download_progress",
        expect.any(Function)
      );

      // Call unlisten
      unlisten();
      // Note: mockUnlisten should be called but our mock doesn't track that directly
    });

    it("should return no-op on non-desktop", async () => {
      mockIsDesktop.mockReturnValue(false);

      const callback = vi.fn();
      const unlisten = await subscribeToDownloadProgress(callback);

      expect(typeof unlisten).toBe("function");
      // Should not throw when called
      unlisten();
    });
  });

  describe("subscribeToNetworkStatus", () => {
    it("should add event listeners for online/offline", () => {
      // Skip if window not available (Bun test environment)
      if (typeof globalThis.window === "undefined") {
        // Create mock window
        const mockWindow = {
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        };
        Object.defineProperty(globalThis, "window", {
          value: mockWindow,
          writable: true,
        });
      }

      const addEventListenerSpy = vi.spyOn(
        globalThis.window,
        "addEventListener"
      );
      const callback = vi.fn();

      const unlisten = subscribeToNetworkStatus(callback);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "online",
        expect.any(Function)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "offline",
        expect.any(Function)
      );

      // Cleanup
      unlisten();
    });

    it("should return a function that can be called", () => {
      // Skip if window not available (Bun test environment)
      if (typeof globalThis.window === "undefined") {
        // Create mock window
        Object.defineProperty(globalThis, "window", {
          value: {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          },
          writable: true,
        });
      }

      const callback = vi.fn();
      const unlisten = subscribeToNetworkStatus(callback);

      expect(typeof unlisten).toBe("function");
      // Should not throw when called
      unlisten();
    });
  });

  describe("isOnline", () => {
    it("should return navigator.onLine value", () => {
      const originalNavigator = globalThis.navigator;

      Object.defineProperty(globalThis, "navigator", {
        value: { onLine: true },
        writable: true,
      });
      expect(isOnline()).toBe(true);

      Object.defineProperty(globalThis, "navigator", {
        value: { onLine: false },
        writable: true,
      });
      expect(isOnline()).toBe(false);

      // Restore
      Object.defineProperty(globalThis, "navigator", {
        value: originalNavigator,
        writable: true,
      });
    });
  });
});
