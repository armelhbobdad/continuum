/**
 * ModelSelector Component Tests
 * Story 2.4: Model Selection & Switching
 *
 * Tests for model selection UI with accessibility and state management.
 * AC1: Model List Display
 * AC2: Model Selection
 * AC4: Hardware Warning
 */

import type { ModelMetadata } from "@continuum/inference";
import type { HardwareCapabilities } from "@continuum/platform";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModelSelector } from "../model-selector";

// Top-level regex patterns for performance
const PHI_3_MINI_PATTERN = /phi.?3.?mini/i;
const MISTRAL_7B_PATTERN = /mistral.?7b/i;
const NO_MODELS_DOWNLOADED_PATTERN = /no models downloaded/i;
const MAY_BE_SLOW_PATTERN = /may be slow/i;
const RECOMMENDED_PATTERN = /recommended/i;

// Mock the stores
vi.mock("@/stores/hardware", () => ({
  useHardwareStore: vi.fn(),
}));

vi.mock("@/stores/models", () => ({
  useModelStore: vi.fn(),
  useModelsWithRecommendations: vi.fn(),
}));

// Mock getModelRecommendation from platform
vi.mock("@continuum/platform", () => ({
  getModelRecommendation: vi.fn(),
}));

// Import mocked modules
import { getModelRecommendation } from "@continuum/platform";
import { useHardwareStore } from "@/stores/hardware";
import { useModelStore, useModelsWithRecommendations } from "@/stores/models";

// Type the mocks
const mockedUseHardwareStore = vi.mocked(useHardwareStore);
const mockedUseModelStore = vi.mocked(useModelStore);
const mockedUseModelsWithRecommendations = vi.mocked(
  useModelsWithRecommendations
);
const mockedGetModelRecommendation = vi.mocked(getModelRecommendation);

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
    requirements: { ramMb: 6144, gpuVramMb: 4096, storageMb: 4200 },
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
];

const mockHardware: HardwareCapabilities = {
  ram: 16_384,
  cpuCores: 8,
  storageAvailable: 50_000,
  gpu: { name: "Test GPU", vram: 8192, computeCapable: true },
  detectedBy: "desktop",
  detectedAt: new Date(),
};

function setupMocks(options: {
  downloadedModels?: string[];
  selectedModelId?: string | null;
  capabilities?: HardwareCapabilities | null;
}) {
  const {
    downloadedModels = ["phi-3-mini", "mistral-7b"],
    selectedModelId = "phi-3-mini",
    capabilities = mockHardware,
  } = options;

  // Mock store with selector support
  const storeState = {
    availableModels: mockModels,
    downloadedModels,
    selectedModelId,
    switchingTo: null,
    switchProgress: null,
    isLoading: false,
    error: null,
    loadModels: vi.fn(),
    selectModel: vi.fn(),
    addDownloadedModel: vi.fn(),
    removeDownloadedModel: vi.fn(),
    getSelectedModel: vi.fn(() =>
      selectedModelId
        ? (mockModels.find((m) => m.id === selectedModelId) ?? null)
        : null
    ),
  };

  mockedUseModelStore.mockImplementation((selector?: unknown) => {
    if (typeof selector === "function") {
      return selector(storeState);
    }
    return storeState;
  });

  mockedUseHardwareStore.mockImplementation((selector?: unknown) => {
    const state = {
      capabilities,
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      _pollingInterval: undefined,
      fetchCapabilities: vi.fn(),
      startPolling: vi.fn(),
      stopPolling: vi.fn(),
    };
    if (typeof selector === "function") {
      return selector(state);
    }
    return state;
  });

  // Models with recommendations
  const downloadedModelsData = mockModels.filter((m) =>
    downloadedModels.includes(m.id)
  );
  mockedUseModelsWithRecommendations.mockReturnValue(
    downloadedModelsData.map((model) => ({
      model,
      recommendation:
        model.requirements.ramMb > 6000
          ? ("may-be-slow" as const)
          : ("recommended" as const),
    }))
  );

  // Mock getModelRecommendation to return appropriate recommendations
  mockedGetModelRecommendation.mockImplementation((requirements) => {
    if (requirements.ramMb > 6000) {
      return "may-be-slow";
    }
    return "recommended";
  });

  return storeState;
}

describe("ModelSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Model List Display (AC1)", () => {
    it("should display downloaded models", () => {
      setupMocks({});

      render(<ModelSelector />);

      expect(screen.getByText("Phi-3 Mini")).toBeInTheDocument();
      expect(screen.getByText("Mistral 7B")).toBeInTheDocument();
    });

    it("should highlight currently selected model (AC1)", () => {
      setupMocks({ selectedModelId: "phi-3-mini" });

      render(<ModelSelector />);

      const selectedOption = screen.getByRole("option", {
        name: PHI_3_MINI_PATTERN,
        selected: true,
      });
      expect(selectedOption).toBeInTheDocument();
    });

    it("should have listbox role for accessibility (AC1)", () => {
      setupMocks({});

      render(<ModelSelector />);

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("should show empty state when no models downloaded", () => {
      setupMocks({ downloadedModels: [] });

      render(<ModelSelector />);

      expect(
        screen.getByText(NO_MODELS_DOWNLOADED_PATTERN)
      ).toBeInTheDocument();
    });
  });

  describe("Model Selection (AC2)", () => {
    it("should call selectModel on click", () => {
      const storeState = setupMocks({ selectedModelId: "phi-3-mini" });

      render(<ModelSelector />);

      const mistralOption = screen.getByRole("option", {
        name: MISTRAL_7B_PATTERN,
      });
      fireEvent.click(mistralOption);

      expect(storeState.selectModel).toHaveBeenCalledWith("mistral-7b");
    });

    it("should not call selectModel when clicking already selected model", () => {
      const storeState = setupMocks({ selectedModelId: "phi-3-mini" });

      render(<ModelSelector />);

      const phiOption = screen.getByRole("option", {
        name: PHI_3_MINI_PATTERN,
      });
      fireEvent.click(phiOption);

      expect(storeState.selectModel).not.toHaveBeenCalled();
    });
  });

  describe("Hardware Warning (AC4)", () => {
    it("should show warning badge for demanding models", () => {
      setupMocks({});

      render(<ModelSelector />);

      // Mistral 7B requires 8GB RAM, marked as "may-be-slow"
      const mistralOption = screen.getByRole("option", {
        name: MISTRAL_7B_PATTERN,
      });
      expect(mistralOption).toHaveTextContent(MAY_BE_SLOW_PATTERN);
    });

    it("should show recommended badge for compatible models", () => {
      setupMocks({});

      render(<ModelSelector />);

      // Phi-3 Mini requires 4GB RAM, marked as "recommended"
      const phiOption = screen.getByRole("option", {
        name: PHI_3_MINI_PATTERN,
      });
      expect(phiOption).toHaveTextContent(RECOMMENDED_PATTERN);
    });
  });

  describe("Accessibility", () => {
    it("should support keyboard navigation", () => {
      setupMocks({});

      render(<ModelSelector />);

      const listbox = screen.getByRole("listbox");
      expect(listbox).toHaveAttribute("tabIndex", "0");
    });

    it("should have aria-selected on selected option", () => {
      setupMocks({ selectedModelId: "phi-3-mini" });

      render(<ModelSelector />);

      const selectedOption = screen.getByRole("option", {
        name: PHI_3_MINI_PATTERN,
      });
      expect(selectedOption).toHaveAttribute("aria-selected", "true");
    });

    it("should have aria-live region for selection changes", () => {
      setupMocks({});

      render(<ModelSelector />);

      expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("CVA Variants", () => {
    it("should apply selected variant to selected model", () => {
      setupMocks({ selectedModelId: "phi-3-mini" });

      render(<ModelSelector />);

      const selectedOption = screen.getByRole("option", {
        name: PHI_3_MINI_PATTERN,
      });
      expect(selectedOption).toHaveAttribute("data-state", "selected");
    });

    it("should apply default variant to unselected models", () => {
      setupMocks({ selectedModelId: "phi-3-mini" });

      render(<ModelSelector />);

      const unselectedOption = screen.getByRole("option", {
        name: MISTRAL_7B_PATTERN,
      });
      expect(unselectedOption).toHaveAttribute("data-state", "default");
    });
  });

  describe("Hardware Warning Dialog Integration (AC4)", () => {
    it("should show warning dialog when selecting demanding model (>80% RAM)", () => {
      // Low RAM system where Mistral 7B would use >80%
      const lowRamHardware: HardwareCapabilities = {
        ram: 6144, // 6GB - Mistral 7B requires 6GB = 100% usage
        cpuCores: 4,
        storageAvailable: 50_000,
        gpu: null,
        detectedBy: "desktop" as const,
        detectedAt: new Date(),
      };

      setupMocks({
        selectedModelId: "phi-3-mini",
        capabilities: lowRamHardware,
      });

      // Override recommendation to trigger warning
      mockedGetModelRecommendation.mockImplementation((requirements) => {
        if (requirements.ramMb >= 6000) {
          return "may-be-slow";
        }
        return "recommended";
      });

      render(<ModelSelector />);

      // Click on Mistral 7B (demanding model)
      const mistralOption = screen.getByRole("option", {
        name: MISTRAL_7B_PATTERN,
      });
      fireEvent.click(mistralOption);

      // Should show hardware warning dialog
      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toBeInTheDocument();
      // Dialog should contain the model name (not just checking text existence since it appears in list too)
      expect(dialog).toHaveTextContent("Mistral 7B");
    });

    it("should not show dialog when selecting recommended model", () => {
      setupMocks({ selectedModelId: "mistral-7b" });

      render(<ModelSelector />);

      // Click on Phi-3 Mini (recommended model)
      const phiOption = screen.getByRole("option", {
        name: PHI_3_MINI_PATTERN,
      });
      fireEvent.click(phiOption);

      // Should NOT show hardware warning dialog
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("should complete selection after confirming warning dialog", () => {
      const lowRamHardware: HardwareCapabilities = {
        ram: 6144,
        cpuCores: 4,
        storageAvailable: 50_000,
        gpu: null,
        detectedBy: "desktop" as const,
        detectedAt: new Date(),
      };

      const storeState = setupMocks({
        selectedModelId: "phi-3-mini",
        capabilities: lowRamHardware,
      });

      mockedGetModelRecommendation.mockImplementation((requirements) => {
        if (requirements.ramMb >= 6000) {
          return "may-be-slow";
        }
        return "recommended";
      });

      render(<ModelSelector />);

      // Click on Mistral 7B
      fireEvent.click(screen.getByRole("option", { name: MISTRAL_7B_PATTERN }));

      // Confirm in warning dialog
      fireEvent.click(screen.getByText("Proceed Anyway"));

      // Should have called selectModel
      expect(storeState.selectModel).toHaveBeenCalledWith("mistral-7b");
    });

    it("should cancel selection when clicking Choose Different", () => {
      const lowRamHardware: HardwareCapabilities = {
        ram: 6144,
        cpuCores: 4,
        storageAvailable: 50_000,
        gpu: null,
        detectedBy: "desktop" as const,
        detectedAt: new Date(),
      };

      const storeState = setupMocks({
        selectedModelId: "phi-3-mini",
        capabilities: lowRamHardware,
      });

      mockedGetModelRecommendation.mockImplementation((requirements) => {
        if (requirements.ramMb >= 6000) {
          return "may-be-slow";
        }
        return "recommended";
      });

      render(<ModelSelector />);

      // Click on Mistral 7B
      fireEvent.click(screen.getByRole("option", { name: MISTRAL_7B_PATTERN }));

      // Cancel in warning dialog
      fireEvent.click(screen.getByText("Choose Different"));

      // Should NOT have called selectModel
      expect(storeState.selectModel).not.toHaveBeenCalled();
      // Dialog should be closed
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });
});
