/**
 * ChatModelSelector Component Tests
 * Story 2.4: Model Selection & Switching
 *
 * Tests for chat model selector initialization and display.
 * Bug #4: Load models on mount
 * Bug #5: Fetch hardware capabilities on mount
 */

import type { ModelMetadata } from "@continuum/inference";
import type { HardwareCapabilities } from "@continuum/platform";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatModelSelector } from "../chat-model-selector";

// Mock the stores
vi.mock("@/stores/hardware", () => ({
  useHardwareStore: vi.fn(),
}));

vi.mock("@/stores/models", () => ({
  useModelStore: vi.fn(),
}));

// Mock inference package
vi.mock("@continuum/inference", () => ({
  getModelMetadata: vi.fn((id: string) => mockModels.find((m) => m.id === id)),
}));

// Mock platform package
vi.mock("@continuum/platform", () => ({
  getModelRecommendation: vi.fn(() => "recommended"),
}));

// Import mocked modules
import { useHardwareStore } from "@/stores/hardware";
import { useModelStore } from "@/stores/models";

// Type the mocks
const mockedUseHardwareStore = vi.mocked(useHardwareStore);
const mockedUseModelStore = vi.mocked(useModelStore);

// Test fixtures
const mockModels: ModelMetadata[] = [
  {
    id: "phi-3-mini",
    name: "Phi-3 Mini",
    version: "1.0",
    description: "Test model",
    requirements: { ramMb: 4096, gpuVramMb: 0, storageMb: 2000 },
    capabilities: ["general-chat"],
    limitations: [],
    contextLength: 4096,
    license: { name: "MIT", url: "https://example.com", commercial: true },
    vulnerabilities: [],
    downloadUrl: "https://example.com/phi.gguf",
    sha256: "abc",
    tokenizerUrl: "https://example.com/tokenizer.json",
  },
];

const mockHardware: HardwareCapabilities = {
  ram: 16_384,
  cpuCores: 8,
  storageAvailable: 50_000,
  gpu: null,
  detectedBy: "web",
  detectedAt: new Date(),
};

// Default mock state factory
function createMockModelState(overrides = {}) {
  return {
    availableModels: [] as ModelMetadata[],
    downloadedModels: [] as string[],
    selectedModelId: null as string | null,
    switchingTo: null,
    switchProgress: null,
    isLoading: false,
    error: null,
    verificationStatus: {},
    pinnedVersions: {},
    loadModels: vi.fn(),
    selectModel: vi.fn(),
    addDownloadedModel: vi.fn(),
    removeDownloadedModel: vi.fn(),
    getSelectedModel: vi.fn().mockReturnValue(null),
    setVerificationStatus: vi.fn(),
    clearVerificationStatus: vi.fn(),
    pinVersion: vi.fn(),
    unpinVersion: vi.fn(),
    isVersionPinned: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

function createMockHardwareState(overrides = {}) {
  return {
    capabilities: null as HardwareCapabilities | null,
    isLoading: false,
    error: null,
    lastUpdated: null,
    _pollingInterval: undefined,
    fetchCapabilities: vi.fn(),
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    ...overrides,
  };
}

describe("ChatModelSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initialization - Load Models on Mount (Bug #4)", () => {
    it("should call loadModels when availableModels is empty", () => {
      const loadModelsMock = vi.fn();
      const modelState = createMockModelState({
        availableModels: [],
        loadModels: loadModelsMock,
      });

      mockedUseModelStore.mockImplementation((selector?: unknown) => {
        if (typeof selector === "function") {
          return selector(modelState);
        }
        return modelState;
      });

      mockedUseHardwareStore.mockImplementation((selector?: unknown) => {
        const state = createMockHardwareState({ capabilities: mockHardware });
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      render(<ChatModelSelector />);

      expect(loadModelsMock).toHaveBeenCalled();
    });

    it("should NOT call loadModels when availableModels is already populated", () => {
      const loadModelsMock = vi.fn();
      const modelState = createMockModelState({
        availableModels: mockModels,
        downloadedModels: ["phi-3-mini"],
        loadModels: loadModelsMock,
      });

      mockedUseModelStore.mockImplementation((selector?: unknown) => {
        if (typeof selector === "function") {
          return selector(modelState);
        }
        return modelState;
      });

      mockedUseHardwareStore.mockImplementation((selector?: unknown) => {
        const state = createMockHardwareState({ capabilities: mockHardware });
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      render(<ChatModelSelector />);

      expect(loadModelsMock).not.toHaveBeenCalled();
    });
  });

  describe("Initialization - Fetch Hardware on Mount (Bug #5)", () => {
    it("should call fetchCapabilities when capabilities is null", () => {
      const fetchCapabilitiesMock = vi.fn();
      const modelState = createMockModelState({
        availableModels: mockModels,
        downloadedModels: ["phi-3-mini"],
      });

      mockedUseModelStore.mockImplementation((selector?: unknown) => {
        if (typeof selector === "function") {
          return selector(modelState);
        }
        return modelState;
      });

      mockedUseHardwareStore.mockImplementation((selector?: unknown) => {
        const state = createMockHardwareState({
          capabilities: null,
          fetchCapabilities: fetchCapabilitiesMock,
        });
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      render(<ChatModelSelector />);

      expect(fetchCapabilitiesMock).toHaveBeenCalled();
    });

    it("should NOT call fetchCapabilities when capabilities already exists", () => {
      const fetchCapabilitiesMock = vi.fn();
      const modelState = createMockModelState({
        availableModels: mockModels,
        downloadedModels: ["phi-3-mini"],
      });

      mockedUseModelStore.mockImplementation((selector?: unknown) => {
        if (typeof selector === "function") {
          return selector(modelState);
        }
        return modelState;
      });

      mockedUseHardwareStore.mockImplementation((selector?: unknown) => {
        const state = createMockHardwareState({
          capabilities: mockHardware,
          fetchCapabilities: fetchCapabilitiesMock,
        });
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      render(<ChatModelSelector />);

      expect(fetchCapabilitiesMock).not.toHaveBeenCalled();
    });
  });

  describe("Empty State", () => {
    it("should show 'No models downloaded' when no downloaded models", () => {
      const modelState = createMockModelState({
        availableModels: mockModels,
        downloadedModels: [],
      });

      mockedUseModelStore.mockImplementation((selector?: unknown) => {
        if (typeof selector === "function") {
          return selector(modelState);
        }
        return modelState;
      });

      mockedUseHardwareStore.mockImplementation((selector?: unknown) => {
        const state = createMockHardwareState({ capabilities: mockHardware });
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      render(<ChatModelSelector />);

      expect(screen.getByText("No models downloaded")).toBeInTheDocument();
    });
  });

  describe("Model Display", () => {
    it("should show dropdown trigger with model name when models are available", () => {
      const modelState = createMockModelState({
        availableModels: mockModels,
        downloadedModels: ["phi-3-mini"],
        selectedModelId: "phi-3-mini",
      });

      mockedUseModelStore.mockImplementation((selector?: unknown) => {
        if (typeof selector === "function") {
          return selector(modelState);
        }
        return modelState;
      });

      mockedUseHardwareStore.mockImplementation((selector?: unknown) => {
        const state = createMockHardwareState({ capabilities: mockHardware });
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      render(<ChatModelSelector />);

      expect(
        screen.getByTestId("chat-model-selector-trigger")
      ).toBeInTheDocument();
      expect(screen.getByText("Phi-3 Mini")).toBeInTheDocument();
    });

    it("should show 'Select Model' when no model is selected", () => {
      const modelState = createMockModelState({
        availableModels: mockModels,
        downloadedModels: ["phi-3-mini"],
        selectedModelId: null,
      });

      mockedUseModelStore.mockImplementation((selector?: unknown) => {
        if (typeof selector === "function") {
          return selector(modelState);
        }
        return modelState;
      });

      mockedUseHardwareStore.mockImplementation((selector?: unknown) => {
        const state = createMockHardwareState({ capabilities: mockHardware });
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      render(<ChatModelSelector />);

      expect(screen.getByText("Select Model")).toBeInTheDocument();
    });
  });

  describe("Disabled State", () => {
    it("should disable trigger when disabled prop is true", () => {
      const modelState = createMockModelState({
        availableModels: mockModels,
        downloadedModels: ["phi-3-mini"],
        selectedModelId: "phi-3-mini",
      });

      mockedUseModelStore.mockImplementation((selector?: unknown) => {
        if (typeof selector === "function") {
          return selector(modelState);
        }
        return modelState;
      });

      mockedUseHardwareStore.mockImplementation((selector?: unknown) => {
        const state = createMockHardwareState({ capabilities: mockHardware });
        if (typeof selector === "function") {
          return selector(state);
        }
        return state;
      });

      render(<ChatModelSelector disabled={true} />);

      expect(screen.getByTestId("chat-model-selector-trigger")).toBeDisabled();
    });
  });
});
