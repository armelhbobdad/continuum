/**
 * ModelCatalog Component Tests
 * Story 2.2: Model Catalog & Cards
 *
 * Tests for model catalog display, sorting, and hardware integration.
 * AC1: Model Catalog Display
 * AC3: Hardware-Based Recommendations
 */

import type { ModelMetadata } from "@continuum/inference";
import type { HardwareCapabilities } from "@continuum/platform";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModelCatalog } from "../model-catalog";

// Mock the stores
vi.mock("@/stores/hardware", () => ({
  useHardwareStore: vi.fn(),
}));

vi.mock("@/stores/models", () => ({
  useModelStore: vi.fn(),
  useModelsWithRecommendations: vi.fn(),
}));

// Import mocked modules
import { useHardwareStore } from "@/stores/hardware";
import { useModelStore, useModelsWithRecommendations } from "@/stores/models";

// Type the mocks
const mockedUseHardwareStore = vi.mocked(useHardwareStore);
const mockedUseModelStore = vi.mocked(useModelStore);
const mockedUseModelsWithRecommendations = vi.mocked(
  useModelsWithRecommendations
);

// Test fixtures
const mockModels: ModelMetadata[] = [
  {
    id: "model-a",
    name: "Model A",
    version: "1.0",
    description: "First model",
    requirements: { ramMb: 4096, gpuVramMb: 0, storageMb: 2000 },
    capabilities: ["general-chat"],
    limitations: [],
    contextLength: 4096,
    license: { name: "MIT", url: "https://example.com", commercial: true },
    vulnerabilities: [],
    downloadUrl: "https://example.com/a.gguf",
    sha256: "abc",
    tokenizerUrl:
      "https://huggingface.co/test/model-a/resolve/main/tokenizer.json",
  },
  {
    id: "model-b",
    name: "Model B",
    version: "2.0",
    description: "Second model",
    requirements: { ramMb: 8192, gpuVramMb: 4096, storageMb: 5000 },
    capabilities: ["general-chat", "code-generation"],
    limitations: [],
    contextLength: 8192,
    license: {
      name: "Apache 2.0",
      url: "https://example.com",
      commercial: true,
    },
    vulnerabilities: [],
    downloadUrl: "https://example.com/b.gguf",
    sha256: "def",
    tokenizerUrl:
      "https://huggingface.co/test/model-b/resolve/main/tokenizer.json",
  },
];

const mockHardware: HardwareCapabilities = {
  ram: 16_384,
  cpuCores: 8,
  storageAvailable: 50_000,
  gpu: { name: "Test GPU", vram: 8192, computeCapable: true },
  detectedBy: "desktop",
  detectedAt: new Date(),
};

describe("ModelCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading State (AC1)", () => {
    it("should display loading skeleton when hardware loading", () => {
      mockedUseHardwareStore.mockReturnValue({
        capabilities: null,
        isLoading: true,
        error: null,
        lastUpdated: null,
        _pollingInterval: undefined,
        fetchCapabilities: vi.fn(),
        startPolling: vi.fn(),
        stopPolling: vi.fn(),
      });
      mockedUseModelStore.mockReturnValue({
        availableModels: [],
        downloadedModels: [],
        selectedModelId: null,
        isLoading: false,
        error: null,
        verificationStatus: {},
        pinnedVersions: {},
        loadModels: vi.fn(),
        selectModel: vi.fn(),
        addDownloadedModel: vi.fn(),
        removeDownloadedModel: vi.fn(),
      });
      mockedUseModelsWithRecommendations.mockReturnValue([]);

      render(<ModelCatalog />);

      expect(screen.getByTestId("catalog-skeleton")).toBeInTheDocument();
    });

    it("should display loading skeleton when models loading", () => {
      mockedUseHardwareStore.mockReturnValue({
        capabilities: mockHardware,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
        _pollingInterval: undefined,
        fetchCapabilities: vi.fn(),
        startPolling: vi.fn(),
        stopPolling: vi.fn(),
      });
      mockedUseModelStore.mockReturnValue({
        availableModels: [],
        downloadedModels: [],
        selectedModelId: null,
        isLoading: true,
        error: null,
        verificationStatus: {},
        pinnedVersions: {},
        loadModels: vi.fn(),
        selectModel: vi.fn(),
        addDownloadedModel: vi.fn(),
        removeDownloadedModel: vi.fn(),
      });
      mockedUseModelsWithRecommendations.mockReturnValue([]);

      render(<ModelCatalog />);

      expect(screen.getByTestId("catalog-skeleton")).toBeInTheDocument();
    });
  });

  describe("Empty State (AC1)", () => {
    it("should show empty state when no models", () => {
      mockedUseHardwareStore.mockReturnValue({
        capabilities: mockHardware,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
        _pollingInterval: undefined,
        fetchCapabilities: vi.fn(),
        startPolling: vi.fn(),
        stopPolling: vi.fn(),
      });
      mockedUseModelStore.mockReturnValue({
        availableModels: [],
        downloadedModels: [],
        selectedModelId: null,
        isLoading: false,
        error: null,
        verificationStatus: {},
        pinnedVersions: {},
        loadModels: vi.fn(),
        selectModel: vi.fn(),
        addDownloadedModel: vi.fn(),
        removeDownloadedModel: vi.fn(),
      });
      mockedUseModelsWithRecommendations.mockReturnValue([]);

      render(<ModelCatalog />);

      expect(screen.getByText("No models available")).toBeInTheDocument();
    });
  });

  describe("Model Display (AC1)", () => {
    it("should display all models from registry", () => {
      mockedUseHardwareStore.mockReturnValue({
        capabilities: mockHardware,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
        _pollingInterval: undefined,
        fetchCapabilities: vi.fn(),
        startPolling: vi.fn(),
        stopPolling: vi.fn(),
      });

      // Mock store with selector support for ModelDownloadButton
      const storeState = {
        availableModels: mockModels,
        downloadedModels: [] as string[],
        selectedModelId: null,
        isLoading: false,
        error: null,
        verificationStatus: {},
        pinnedVersions: {},
        loadModels: vi.fn(),
        selectModel: vi.fn(),
        addDownloadedModel: vi.fn(),
        removeDownloadedModel: vi.fn(),
        isVersionPinned: vi.fn().mockReturnValue(false),
      };
      mockedUseModelStore.mockImplementation((selector?: unknown) => {
        if (typeof selector === "function") {
          return selector(storeState);
        }
        return storeState;
      });

      mockedUseModelsWithRecommendations.mockReturnValue([
        { model: mockModels[0], recommendation: "recommended" as const },
        { model: mockModels[1], recommendation: "may-be-slow" as const },
      ]);

      render(<ModelCatalog />);

      expect(screen.getByText("Model A")).toBeInTheDocument();
      expect(screen.getByText("Model B")).toBeInTheDocument();
    });
  });

  describe("Recommendation Sorting (AC3)", () => {
    it("should display models sorted by recommendation", () => {
      mockedUseHardwareStore.mockReturnValue({
        capabilities: mockHardware,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
        _pollingInterval: undefined,
        fetchCapabilities: vi.fn(),
        startPolling: vi.fn(),
        stopPolling: vi.fn(),
      });

      // Mock store with selector support for ModelDownloadButton
      const storeState = {
        availableModels: mockModels,
        downloadedModels: [] as string[],
        selectedModelId: null,
        isLoading: false,
        error: null,
        verificationStatus: {},
        pinnedVersions: {},
        loadModels: vi.fn(),
        selectModel: vi.fn(),
        addDownloadedModel: vi.fn(),
        removeDownloadedModel: vi.fn(),
        isVersionPinned: vi.fn().mockReturnValue(false),
      };
      mockedUseModelStore.mockImplementation((selector?: unknown) => {
        if (typeof selector === "function") {
          return selector(storeState);
        }
        return storeState;
      });

      // Note: useModelsWithRecommendations already returns sorted
      mockedUseModelsWithRecommendations.mockReturnValue([
        { model: mockModels[0], recommendation: "recommended" as const },
        { model: mockModels[1], recommendation: "may-be-slow" as const },
      ]);

      render(<ModelCatalog />);

      const cards = screen.getAllByRole("article");
      // First card should be "recommended"
      expect(cards[0]).toHaveTextContent("Model A");
      expect(cards[0]).toHaveTextContent("Recommended");
      // Second card should be "may-be-slow"
      expect(cards[1]).toHaveTextContent("Model B");
      expect(cards[1]).toHaveTextContent("May be slow");
    });

    it("should show recommendation badges on each card (AC3)", () => {
      mockedUseHardwareStore.mockReturnValue({
        capabilities: mockHardware,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
        _pollingInterval: undefined,
        fetchCapabilities: vi.fn(),
        startPolling: vi.fn(),
        stopPolling: vi.fn(),
      });

      // Mock store with selector support for ModelDownloadButton
      const storeState = {
        availableModels: mockModels,
        downloadedModels: [] as string[],
        selectedModelId: null,
        isLoading: false,
        error: null,
        verificationStatus: {},
        pinnedVersions: {},
        loadModels: vi.fn(),
        selectModel: vi.fn(),
        addDownloadedModel: vi.fn(),
        removeDownloadedModel: vi.fn(),
        isVersionPinned: vi.fn().mockReturnValue(false),
      };
      mockedUseModelStore.mockImplementation((selector?: unknown) => {
        if (typeof selector === "function") {
          return selector(storeState);
        }
        return storeState;
      });

      mockedUseModelsWithRecommendations.mockReturnValue([
        { model: mockModels[0], recommendation: "recommended" as const },
        { model: mockModels[1], recommendation: "not-recommended" as const },
      ]);

      render(<ModelCatalog />);

      expect(screen.getByText("Recommended")).toBeInTheDocument();
      expect(screen.getByText("Not recommended")).toBeInTheDocument();
    });
  });

  describe("Load Models on Mount", () => {
    it("should call loadModels on mount", () => {
      const loadModelsMock = vi.fn();
      mockedUseHardwareStore.mockReturnValue({
        capabilities: mockHardware,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
        _pollingInterval: undefined,
        fetchCapabilities: vi.fn(),
        startPolling: vi.fn(),
        stopPolling: vi.fn(),
      });
      mockedUseModelStore.mockReturnValue({
        availableModels: [],
        downloadedModels: [],
        selectedModelId: null,
        isLoading: false,
        error: null,
        verificationStatus: {},
        pinnedVersions: {},
        loadModels: loadModelsMock,
        selectModel: vi.fn(),
        addDownloadedModel: vi.fn(),
        removeDownloadedModel: vi.fn(),
      });
      mockedUseModelsWithRecommendations.mockReturnValue([]);

      render(<ModelCatalog />);

      expect(loadModelsMock).toHaveBeenCalled();
    });
  });

  describe("Error State", () => {
    it("should display error message when loading fails", () => {
      mockedUseHardwareStore.mockReturnValue({
        capabilities: mockHardware,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
        _pollingInterval: undefined,
        fetchCapabilities: vi.fn(),
        startPolling: vi.fn(),
        stopPolling: vi.fn(),
      });
      mockedUseModelStore.mockReturnValue({
        availableModels: [],
        downloadedModels: [],
        selectedModelId: null,
        isLoading: false,
        error: "Failed to load models",
        verificationStatus: {},
        pinnedVersions: {},
        loadModels: vi.fn(),
        selectModel: vi.fn(),
        addDownloadedModel: vi.fn(),
        removeDownloadedModel: vi.fn(),
      });
      mockedUseModelsWithRecommendations.mockReturnValue([]);

      render(<ModelCatalog />);

      expect(screen.getByText("Failed to load models")).toBeInTheDocument();
    });
  });

  describe("Model Selection", () => {
    it("should call selectModel when a model is selected", () => {
      const selectModelMock = vi.fn();
      mockedUseHardwareStore.mockReturnValue({
        capabilities: mockHardware,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
        _pollingInterval: undefined,
        fetchCapabilities: vi.fn(),
        startPolling: vi.fn(),
        stopPolling: vi.fn(),
      });

      // Mock store with selector support - model-a must be downloaded for Select button to show
      const storeState = {
        availableModels: mockModels,
        downloadedModels: ["model-a"],
        selectedModelId: null,
        isLoading: false,
        error: null,
        verificationStatus: {},
        pinnedVersions: {},
        loadModels: vi.fn(),
        selectModel: selectModelMock,
        addDownloadedModel: vi.fn(),
        removeDownloadedModel: vi.fn(),
        isVersionPinned: vi.fn().mockReturnValue(false),
      };

      mockedUseModelStore.mockImplementation((selector?: unknown) => {
        if (typeof selector === "function") {
          return selector(storeState);
        }
        return storeState;
      });

      mockedUseModelsWithRecommendations.mockReturnValue([
        { model: mockModels[0], recommendation: "recommended" as const },
      ]);

      render(<ModelCatalog />);

      const selectButton = screen.getByRole("button", { name: "Select Model" });
      selectButton.click();

      expect(selectModelMock).toHaveBeenCalledWith("model-a");
    });
  });
});
