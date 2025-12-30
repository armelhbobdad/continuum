import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InferenceToken } from "../types";

// Mock @tauri-apps/api/core
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

// Mock @tauri-apps/api/event
const mockListen = vi.fn();
vi.mock("@tauri-apps/api/event", () => ({
  listen: mockListen,
}));

describe("KalosmAdapter", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    mockListen.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create an instance implementing InferenceAdapter", async () => {
      const { KalosmAdapter } = await import("../adapters/kalosm");
      const adapter = new KalosmAdapter();

      // Verify interface contract
      expect(adapter.generate).toBeDefined();
      expect(adapter.abort).toBeDefined();
      expect(adapter.isModelLoaded).toBeDefined();
      expect(adapter.loadModel).toBeDefined();
      expect(adapter.getCapabilities).toBeDefined();
      expect(adapter.getStatus).toBeDefined();
    });
  });

  describe("loadModel", () => {
    it("should invoke load_model Tauri command with model ID", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { KalosmAdapter } = await import("../adapters/kalosm");
      const adapter = new KalosmAdapter();

      await adapter.loadModel("phi-3-mini");

      expect(mockInvoke).toHaveBeenCalledWith("load_model", {
        modelId: "phi-3-mini",
      });
    });

    it("should throw when model ID is not provided", async () => {
      const { KalosmAdapter } = await import("../adapters/kalosm");
      const adapter = new KalosmAdapter();

      await expect(adapter.loadModel()).rejects.toThrow("Model ID required");
    });

    it("should throw on load failure", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Load failed"));

      const { KalosmAdapter } = await import("../adapters/kalosm");
      const adapter = new KalosmAdapter();

      await expect(adapter.loadModel("phi-3-mini")).rejects.toThrow(
        "Load failed"
      );
    });
  });

  describe("unloadModel", () => {
    it("should invoke unload_model Tauri command", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { KalosmAdapter } = await import("../adapters/kalosm");
      const adapter = new KalosmAdapter();

      await adapter.unloadModel();

      expect(mockInvoke).toHaveBeenCalledWith("unload_model");
    });
  });

  describe("isModelLoaded", () => {
    it("should return true when status is loaded", async () => {
      mockInvoke.mockResolvedValueOnce("loaded");

      const { KalosmAdapter } = await import("../adapters/kalosm");
      const adapter = new KalosmAdapter();

      const result = await adapter.isModelLoaded();

      expect(result).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith("get_model_status");
    });

    it("should return false when status is unloaded", async () => {
      mockInvoke.mockResolvedValueOnce("unloaded");

      const { KalosmAdapter } = await import("../adapters/kalosm");
      const adapter = new KalosmAdapter();

      const result = await adapter.isModelLoaded();

      expect(result).toBe(false);
    });
  });

  describe("getStatus", () => {
    it("should return current cached status", async () => {
      const { KalosmAdapter } = await import("../adapters/kalosm");
      const adapter = new KalosmAdapter();

      const status = adapter.getStatus();

      expect(status).toBe("unloaded"); // Initial status
    });
  });

  describe("getCapabilities", () => {
    it("should return adapter capabilities", async () => {
      const { KalosmAdapter } = await import("../adapters/kalosm");
      const adapter = new KalosmAdapter();

      const caps = adapter.getCapabilities();

      expect(caps.supportsStreaming).toBe(true);
      expect(caps.supportsAbort).toBe(true);
      expect(caps.maxContextLength).toBeGreaterThan(0);
      expect(caps.modelName).toBeDefined();
    });
  });

  describe("abort", () => {
    it("should invoke abort_inference Tauri command", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { KalosmAdapter } = await import("../adapters/kalosm");
      const adapter = new KalosmAdapter();

      await adapter.abort();

      expect(mockInvoke).toHaveBeenCalledWith("abort_inference");
    });
  });

  describe("generate", () => {
    it("should invoke generate command and handle completion", async () => {
      const unlisten = vi.fn();

      // Simulate immediate completion
      mockListen.mockImplementation(
        async (
          eventName: string,
          callback: (event: { payload: unknown }) => void
        ) => {
          if (eventName === "inference:complete") {
            // Complete immediately
            setTimeout(() => callback({ payload: null }), 5);
          }
          return unlisten;
        }
      );
      mockInvoke.mockResolvedValueOnce(undefined);

      const { KalosmAdapter } = await import("../adapters/kalosm");
      const adapter = new KalosmAdapter();

      const tokens: InferenceToken[] = [];
      for await (const token of adapter.generate({ prompt: "Hello" })) {
        tokens.push(token);
      }

      expect(mockInvoke).toHaveBeenCalledWith("generate", {
        prompt: "Hello",
        maxTokens: undefined,
      });
    });
  });
});
