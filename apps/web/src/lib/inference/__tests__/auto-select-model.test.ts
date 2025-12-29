/**
 * Auto-Select Model Tests
 * Story 2.4: Model Selection & Switching
 *
 * Tests for auto-selection logic.
 * AC5: Auto-Selection
 */

import type { ModelMetadata } from "@continuum/inference";
import type { HardwareCapabilities } from "@continuum/platform";
import { describe, expect, it, vi } from "vitest";
import {
  autoSelectModel,
  getAutoSelectFailureMessage,
  needsAutoSelection,
} from "../auto-select-model";

// Mock getModelRecommendation
vi.mock("@continuum/platform", () => ({
  getModelRecommendation: vi.fn((requirements, hardware) => {
    const ramRatio = hardware.ram / requirements.ramMb;
    if (ramRatio >= 1.5) return "recommended";
    if (ramRatio >= 1.0) return "may-be-slow";
    return "not-recommended";
  }),
}));

// Test fixtures
const mockModels: ModelMetadata[] = [
  {
    id: "phi-3-mini",
    name: "Phi-3 Mini",
    version: "3.8b-4bit",
    description: "Fast small model",
    requirements: { ramMb: 4096, gpuVramMb: 0, storageMb: 2500 },
    capabilities: ["general-chat"],
    limitations: [],
    contextLength: 4096,
    license: { name: "MIT", url: "https://example.com", commercial: true },
    vulnerabilities: [],
    downloadUrl: "https://example.com/phi.gguf",
    sha256: "abc",
    tokenizerUrl:
      "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct/resolve/main/tokenizer.json",
  },
  {
    id: "mistral-7b",
    name: "Mistral 7B",
    version: "7b-4bit",
    description: "High-performance instruction following",
    requirements: { ramMb: 6144, gpuVramMb: 0, storageMb: 4200 },
    capabilities: ["general-chat", "code-generation"],
    limitations: [],
    contextLength: 8192,
    license: {
      name: "Apache 2.0",
      url: "https://example.com",
      commercial: true,
    },
    vulnerabilities: [],
    downloadUrl: "https://example.com/mistral.gguf",
    sha256: "def",
    tokenizerUrl:
      "https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2/resolve/main/tokenizer.json",
  },
  {
    id: "mixtral-8x7b",
    name: "Mixtral 8x7B",
    version: "47b-4bit",
    description: "Large MoE model",
    requirements: { ramMb: 32_768, gpuVramMb: 0, storageMb: 26_000 },
    capabilities: ["general-chat", "code-generation", "reasoning"],
    limitations: [],
    contextLength: 32_768,
    license: {
      name: "Apache 2.0",
      url: "https://example.com",
      commercial: true,
    },
    vulnerabilities: [],
    downloadUrl: "https://example.com/mixtral.gguf",
    sha256: "ghi",
    tokenizerUrl:
      "https://huggingface.co/mistralai/Mixtral-8x7B-Instruct-v0.1/resolve/main/tokenizer.json",
  },
];

const mockHardware16GB: HardwareCapabilities = {
  ram: 16_384, // 16GB
  cpuCores: 8,
  storageAvailable: 100_000,
  gpu: null,
  detectedBy: "desktop",
  detectedAt: new Date(),
};

const mockHardware8GB: HardwareCapabilities = {
  ram: 8192, // 8GB
  cpuCores: 4,
  storageAvailable: 50_000,
  gpu: null,
  detectedBy: "desktop",
  detectedAt: new Date(),
};

describe("autoSelectModel", () => {
  describe("Task 7.4: Handle no downloaded models", () => {
    it("should return failure when no models downloaded", () => {
      const result = autoSelectModel([], mockModels, mockHardware16GB);

      expect(result.success).toBe(false);
      expect(result.modelId).toBeNull();
      expect(result.reason).toBe("no-downloaded-models");
    });

    it("should return failure when downloaded models not in available list", () => {
      const result = autoSelectModel(
        ["non-existent-model"],
        mockModels,
        mockHardware16GB
      );

      expect(result.success).toBe(false);
      expect(result.modelId).toBeNull();
      expect(result.reason).toBe("no-downloaded-models");
    });
  });

  describe("Task 7.2-7.3: Pick best match from downloaded models", () => {
    it("should prefer recommended models over may-be-slow", () => {
      // With 16GB RAM: phi-3-mini (4GB) = recommended, mistral-7b (8GB) = recommended
      // Should prefer smaller one (phi-3-mini)
      const result = autoSelectModel(
        ["phi-3-mini", "mistral-7b"],
        mockModels,
        mockHardware16GB
      );

      expect(result.success).toBe(true);
      expect(result.modelId).toBe("phi-3-mini");
      expect(result.recommendation).toBe("recommended");
    });

    it("should select may-be-slow if no recommended models available", () => {
      // With 8GB RAM: mistral-7b (8GB) = may-be-slow
      const result = autoSelectModel(
        ["mistral-7b"],
        mockModels,
        mockHardware8GB
      );

      expect(result.success).toBe(true);
      expect(result.modelId).toBe("mistral-7b");
      expect(result.recommendation).toBe("may-be-slow");
    });

    it("should handle single downloaded model", () => {
      const result = autoSelectModel(
        ["phi-3-mini"],
        mockModels,
        mockHardware16GB
      );

      expect(result.success).toBe(true);
      expect(result.modelId).toBe("phi-3-mini");
    });

    it("should include model metadata in result", () => {
      const result = autoSelectModel(
        ["phi-3-mini"],
        mockModels,
        mockHardware16GB
      );

      expect(result.model).toBeDefined();
      expect(result.model?.id).toBe("phi-3-mini");
      expect(result.model?.name).toBe("Phi-3 Mini");
    });
  });

  describe("Hardware not detected fallback", () => {
    it("should fall back to smallest model when hardware not detected", () => {
      const result = autoSelectModel(
        ["mistral-7b", "phi-3-mini"],
        mockModels,
        null
      );

      expect(result.success).toBe(true);
      // Should pick phi-3-mini (smaller)
      expect(result.modelId).toBe("phi-3-mini");
      expect(result.recommendation).toBe("may-be-slow");
    });
  });
});

describe("needsAutoSelection", () => {
  it("should return true when no model selected", () => {
    expect(needsAutoSelection(null, ["phi-3-mini"])).toBe(true);
  });

  it("should return true when selected model not in downloaded list", () => {
    expect(needsAutoSelection("deleted-model", ["phi-3-mini"])).toBe(true);
  });

  it("should return false when valid model is selected", () => {
    expect(needsAutoSelection("phi-3-mini", ["phi-3-mini", "mistral-7b"])).toBe(
      false
    );
  });

  it("should return true when downloaded list is empty", () => {
    expect(needsAutoSelection("phi-3-mini", [])).toBe(true);
  });
});

describe("getAutoSelectFailureMessage", () => {
  it("should return appropriate message for no-downloaded-models", () => {
    const message = getAutoSelectFailureMessage("no-downloaded-models");
    expect(message).toContain("No models downloaded");
    expect(message).toContain("download a model");
  });

  it("should return appropriate message for no-compatible-models", () => {
    const message = getAutoSelectFailureMessage("no-compatible-models");
    expect(message).toContain("No compatible models");
    expect(message).toContain("smaller model");
  });

  it("should return appropriate message for hardware-not-detected", () => {
    const message = getAutoSelectFailureMessage("hardware-not-detected");
    expect(message).toContain("Unable to detect hardware");
    expect(message).toContain("manually");
  });
});
