/**
 * useModelDownload Hook Tests
 * Story 2.3: Model Download Manager - Task 8/10
 *
 * Tests for download initiation with storage validation.
 * AC5: Storage space validation before download
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock platform module
const mockCheckStorageSpace = vi.fn();
const mockStartModelDownload = vi.fn();

vi.mock("@continuum/platform", () => ({
  checkStorageSpace: (...args: unknown[]) => mockCheckStorageSpace(...args),
  startModelDownload: (...args: unknown[]) => mockStartModelDownload(...args),
}));

// Mock download store
const mockAddDownload = vi.fn();

vi.mock("@/stores/downloads", () => ({
  useDownloadStore: (selector: (state: unknown) => unknown) => {
    const state = {
      addDownload: mockAddDownload,
    };
    return selector(state);
  },
}));

// Import after mocks are set up
import { useModelDownload } from "../use-model-download";

describe("useModelDownload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should start with idle status", () => {
      const { result } = renderHook(() => useModelDownload());

      expect(result.current.state.status).toBe("idle");
      expect(result.current.storageResult).toBeNull();
    });
  });

  describe("Storage Validation (AC5)", () => {
    it("should check storage before starting download", async () => {
      mockCheckStorageSpace.mockResolvedValue({
        hasSpace: true,
        availableMb: 10_000,
        requiredMb: 4000,
        shortfallMb: 0,
      });
      mockStartModelDownload.mockResolvedValue("download-123");

      const { result } = renderHook(() => useModelDownload());

      await act(async () => {
        await result.current.initiateDownload(
          "phi-3-mini",
          "https://example.com/model.gguf",
          "https://example.com/tokenizer.json",
          4000
        );
      });

      expect(mockCheckStorageSpace).toHaveBeenCalledWith(4000);
    });

    it("should show checking-storage status during check", async () => {
      let resolveStorage: (value: unknown) => void;
      mockCheckStorageSpace.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveStorage = resolve;
          })
      );

      const { result } = renderHook(() => useModelDownload());

      act(() => {
        result.current.initiateDownload(
          "phi-3-mini",
          "https://example.com/model.gguf",
          "https://example.com/tokenizer.json",
          4000
        );
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe("checking-storage");
      });

      // Clean up
      await act(async () => {
        resolveStorage?.({
          hasSpace: true,
          availableMb: 10_000,
          requiredMb: 4000,
          shortfallMb: 0,
        });
      });
    });

    it("should block download when insufficient storage", async () => {
      mockCheckStorageSpace.mockResolvedValue({
        hasSpace: false,
        availableMb: 2000,
        requiredMb: 4000,
        shortfallMb: 2000,
      });

      const { result } = renderHook(() => useModelDownload());

      await act(async () => {
        await result.current.initiateDownload(
          "phi-3-mini",
          "https://example.com/model.gguf",
          "https://example.com/tokenizer.json",
          4000
        );
      });

      expect(result.current.state.status).toBe("insufficient-storage");
      expect(result.current.storageResult?.shortfallMb).toBe(2000);
      expect(mockStartModelDownload).not.toHaveBeenCalled();
    });

    it("should proceed with download when storage is sufficient", async () => {
      mockCheckStorageSpace.mockResolvedValue({
        hasSpace: true,
        availableMb: 10_000,
        requiredMb: 4000,
        shortfallMb: 0,
      });
      mockStartModelDownload.mockResolvedValue("download-123");

      const { result } = renderHook(() => useModelDownload());

      await act(async () => {
        await result.current.initiateDownload(
          "phi-3-mini",
          "https://example.com/model.gguf",
          "https://example.com/tokenizer.json",
          4000
        );
      });

      expect(mockStartModelDownload).toHaveBeenCalledWith(
        "phi-3-mini",
        "https://example.com/model.gguf",
        "https://example.com/tokenizer.json",
        undefined // sha256 is optional
      );
    });
  });

  describe("Download Initiation", () => {
    it("should add download to store on success", async () => {
      mockCheckStorageSpace.mockResolvedValue({
        hasSpace: true,
        availableMb: 10_000,
        requiredMb: 4000,
        shortfallMb: 0,
      });
      mockStartModelDownload.mockResolvedValue("download-123");

      const { result } = renderHook(() => useModelDownload());

      await act(async () => {
        await result.current.initiateDownload(
          "phi-3-mini",
          "https://example.com/model.gguf",
          "https://example.com/tokenizer.json",
          4000
        );
      });

      expect(mockAddDownload).toHaveBeenCalledWith(
        expect.objectContaining({
          downloadId: "download-123",
          modelId: "phi-3-mini",
          status: "downloading",
        })
      );
    });

    it("should transition to downloading status on success", async () => {
      mockCheckStorageSpace.mockResolvedValue({
        hasSpace: true,
        availableMb: 10_000,
        requiredMb: 4000,
        shortfallMb: 0,
      });
      mockStartModelDownload.mockResolvedValue("download-123");

      const { result } = renderHook(() => useModelDownload());

      await act(async () => {
        await result.current.initiateDownload(
          "phi-3-mini",
          "https://example.com/model.gguf",
          "https://example.com/tokenizer.json",
          4000
        );
      });

      expect(result.current.state.status).toBe("downloading");
      if (result.current.state.status === "downloading") {
        expect(result.current.state.downloadId).toBe("download-123");
      }
    });

    it("should handle download start errors", async () => {
      mockCheckStorageSpace.mockResolvedValue({
        hasSpace: true,
        availableMb: 10_000,
        requiredMb: 4000,
        shortfallMb: 0,
      });
      mockStartModelDownload.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useModelDownload());

      await act(async () => {
        await result.current.initiateDownload(
          "phi-3-mini",
          "https://example.com/model.gguf",
          "https://example.com/tokenizer.json",
          4000
        );
      });

      expect(result.current.state.status).toBe("error");
      if (result.current.state.status === "error") {
        expect(result.current.state.error).toBe("Network error");
      }
    });
  });

  describe("Retry and Dismiss", () => {
    it("should allow retry after storage check failure", async () => {
      // First attempt - insufficient storage
      mockCheckStorageSpace.mockResolvedValueOnce({
        hasSpace: false,
        availableMb: 2000,
        requiredMb: 4000,
        shortfallMb: 2000,
      });

      const { result } = renderHook(() => useModelDownload());

      await act(async () => {
        await result.current.initiateDownload(
          "phi-3-mini",
          "https://example.com/model.gguf",
          "https://example.com/tokenizer.json",
          4000
        );
      });

      expect(result.current.state.status).toBe("insufficient-storage");

      // Second attempt - sufficient storage
      mockCheckStorageSpace.mockResolvedValueOnce({
        hasSpace: true,
        availableMb: 10_000,
        requiredMb: 4000,
        shortfallMb: 0,
      });
      mockStartModelDownload.mockResolvedValue("download-456");

      await act(async () => {
        await result.current.retryDownload();
      });

      expect(result.current.state.status).toBe("downloading");
    });

    it("should reset state on dismiss", async () => {
      mockCheckStorageSpace.mockResolvedValue({
        hasSpace: false,
        availableMb: 2000,
        requiredMb: 4000,
        shortfallMb: 2000,
      });

      const { result } = renderHook(() => useModelDownload());

      await act(async () => {
        await result.current.initiateDownload(
          "phi-3-mini",
          "https://example.com/model.gguf",
          "https://example.com/tokenizer.json",
          4000
        );
      });

      expect(result.current.state.status).toBe("insufficient-storage");

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.state.status).toBe("idle");
      expect(result.current.storageResult).toBeNull();
    });
  });
});
