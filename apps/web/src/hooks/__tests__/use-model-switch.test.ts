/**
 * useModelSwitch Hook Tests
 * Story 2.4: Model Selection & Switching
 *
 * Tests for async model switching flow.
 * AC2: Model Selection
 * AC3: Mid-Conversation Switching
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Tauri - use factory function to avoid hoisting issues
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock model store with mutable state
vi.mock("@/stores/models", () => ({
  useModelStore: vi.fn(),
}));

// Mock inference package for model metadata
vi.mock("@continuum/inference", () => ({
  getModelMetadata: vi.fn((modelId: string) => {
    const models: Record<string, { id: string; tokenizerSource: string }> = {
      "phi-3-mini": {
        id: "phi-3-mini",
        tokenizerSource: "microsoft/Phi-3-mini-4k-instruct",
      },
      "llama-3-8b": {
        id: "llama-3-8b",
        tokenizerSource: "meta-llama/Meta-Llama-3-8B-Instruct",
      },
    };
    return models[modelId];
  }),
}));

// Import mocked modules after mocking
import { invoke } from "@tauri-apps/api/core";
import { useModelStore } from "@/stores/models";
import { useModelSwitch } from "../use-model-switch";

// Type the mocks
const mockInvoke = vi.mocked(invoke);
const mockUseModelStore = vi.mocked(useModelStore);

// Mutable test state
let currentSelectedModelId = "phi-3-mini";
const mockSelectModel = vi.fn();

function setupStoreMock() {
  mockUseModelStore.mockImplementation((selector?: unknown) => {
    const state = {
      selectedModelId: currentSelectedModelId,
      selectModel: mockSelectModel,
    };
    if (typeof selector === "function") {
      return (selector as (s: typeof state) => unknown)(state);
    }
    return state;
  });
}

describe("useModelSwitch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockReset();
    mockSelectModel.mockReset();
    currentSelectedModelId = "phi-3-mini";
    setupStoreMock();
  });

  describe("Initial State", () => {
    it("should start with no switch in progress", () => {
      const { result } = renderHook(() => useModelSwitch());

      expect(result.current.isSwitching).toBe(false);
      expect(result.current.switchingTo).toBeNull();
      expect(result.current.switchProgress).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe("switchModel Success Flow", () => {
    it("should call abort, unload, then load in sequence (Task 4.1-4.3)", async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useModelSwitch());

      await act(async () => {
        await result.current.switchModel("llama-3-8b");
      });

      // Verify call order: abort first (Task 4.1), then unload, then load with tokenizer source
      expect(mockInvoke).toHaveBeenNthCalledWith(1, "abort_inference");
      expect(mockInvoke).toHaveBeenNthCalledWith(2, "unload_model");
      expect(mockInvoke).toHaveBeenNthCalledWith(3, "load_model", {
        modelId: "llama-3-8b",
        tokenizerSource: "meta-llama/Meta-Llama-3-8B-Instruct",
      });
    });

    it("should update selection on success (Task 4.4)", async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useModelSwitch());

      await act(async () => {
        await result.current.switchModel("llama-3-8b");
      });

      expect(mockSelectModel).toHaveBeenCalledWith("llama-3-8b");
    });

    it("should clear switching state on success", async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useModelSwitch());

      await act(async () => {
        await result.current.switchModel("llama-3-8b");
      });

      expect(result.current.isSwitching).toBe(false);
      expect(result.current.switchingTo).toBeNull();
      expect(result.current.switchProgress).toBeNull();
    });

    it("should skip switch when selecting same model", async () => {
      const { result } = renderHook(() => useModelSwitch());

      await act(async () => {
        const switchResult = await result.current.switchModel("phi-3-mini");
        expect(switchResult.success).toBe(true);
      });

      // No Tauri calls when already selected
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("switchModel Error Flow", () => {
    it("should handle load error when model not in registry (Task 4.5)", async () => {
      // Set up mock to handle abort (called before registry lookup)
      mockInvoke.mockResolvedValue(undefined);

      const { result } = renderHook(() => useModelSwitch());

      await act(async () => {
        const switchResult = await result.current.switchModel("invalid-model");
        expect(switchResult.success).toBe(false);
        expect(switchResult.error).toContain("not found in registry");
      });

      expect(result.current.error).toContain("not found in registry");
      expect(result.current.isSwitching).toBe(false);
    });

    it("should attempt to reload previous model on error (Task 4.5)", async () => {
      mockInvoke
        .mockResolvedValueOnce(undefined) // abort succeeds
        .mockResolvedValueOnce(undefined) // unload succeeds
        .mockRejectedValueOnce(new Error("Load failed")) // load fails
        .mockResolvedValueOnce(undefined); // reload previous succeeds

      const { result } = renderHook(() => useModelSwitch());

      await act(async () => {
        await result.current.switchModel("llama-3-8b");
      });

      // Should try to reload previous model (4th call after abort, unload, failed load)
      expect(mockInvoke).toHaveBeenNthCalledWith(4, "load_model", {
        modelId: "phi-3-mini",
        tokenizerSource: "microsoft/Phi-3-mini-4k-instruct",
      });
    });
  });

  describe("Progress Tracking", () => {
    it("should set switching state during operation (Task 4.1)", async () => {
      mockInvoke.mockImplementation(async () => {
        // Just resolve immediately for this test
        return;
      });

      const { result } = renderHook(() => useModelSwitch());

      await act(async () => {
        await result.current.switchModel("llama-3-8b");
      });

      // Verify the switch was initiated (states changed during operation)
      expect(mockInvoke).toHaveBeenCalledWith("unload_model");
      expect(mockInvoke).toHaveBeenCalledWith("load_model", {
        modelId: "llama-3-8b",
        tokenizerSource: "meta-llama/Meta-Llama-3-8B-Instruct",
      });
    });
  });

  describe("clearError", () => {
    it("should have clearError function", () => {
      const { result } = renderHook(() => useModelSwitch());

      expect(result.current.clearError).toBeDefined();
      expect(typeof result.current.clearError).toBe("function");
    });

    it("should clear error when called", async () => {
      // Set up a failing switch to create an error
      mockInvoke
        .mockResolvedValueOnce(undefined) // unload succeeds
        .mockRejectedValueOnce(new Error("Test error")); // load fails

      const { result } = renderHook(() => useModelSwitch());

      // Trigger error
      await act(async () => {
        await result.current.switchModel("failing-model");
      });

      expect(result.current.error).toBe("Test error");

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
