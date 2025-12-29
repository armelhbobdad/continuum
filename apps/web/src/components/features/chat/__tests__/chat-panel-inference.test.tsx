/**
 * Chat Panel Inference Integration Tests
 *
 * Tests for inference functionality in the chat panel.
 * Story 1.4: AC #2-#6 (streaming, abort, loading, errors)
 * Story 2.4: Updated to work with model selection integration
 */

import type {
  InferenceAdapter,
  InferenceCapabilities,
  InferenceStatus,
} from "@continuum/inference";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { useSessionStore } from "@/stores/session";
import { ChatPanel } from "../chat-panel";

// Mock the inference adapter factory (async version used by chat-panel)
vi.mock("@/lib/inference/get-adapter", () => ({
  getInferenceAdapterAsync: vi.fn(),
}));

// Mock the model switch hook to avoid Tauri calls
vi.mock("@/hooks/use-model-switch", () => ({
  useModelSwitch: () => ({
    isSwitching: false,
    switchingTo: null,
    switchProgress: null,
    error: null,
    switchModel: vi.fn(),
    clearError: vi.fn(),
  }),
}));

// Mock getModelMetadata to return test model info
vi.mock("@continuum/inference", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@continuum/inference")>();
  return {
    ...actual,
    getModelMetadata: vi.fn().mockReturnValue({
      id: "test-model",
      name: "Test Model",
      version: "1.0",
      description: "Test",
      requirements: { ramMb: 4096, gpuVramMb: 0, storageMb: 2000 },
      capabilities: ["general-chat"],
      limitations: [],
      contextLength: 4096,
      license: { name: "MIT", url: "", commercial: true },
      vulnerabilities: [],
      downloadUrl: "",
      sha256: "",
    }),
  };
});

import { getInferenceAdapterAsync } from "@/lib/inference/get-adapter";

// Helper to create mock adapter
function createMockAdapter(
  overrides?: Partial<InferenceAdapter>
): InferenceAdapter {
  return {
    generate: vi.fn(),
    abort: vi.fn().mockResolvedValue(undefined),
    isModelLoaded: vi.fn().mockResolvedValue(true),
    loadModel: vi.fn().mockResolvedValue(undefined),
    getCapabilities: vi.fn().mockReturnValue({
      supportsStreaming: true,
      supportsAbort: true,
      maxContextLength: 4096,
      modelName: "test-model",
    } as InferenceCapabilities),
    getStatus: vi.fn().mockReturnValue("loaded" as InferenceStatus),
    ...overrides,
  };
}

// Helper to create generator from tokens
function* tokenGenerator(tokens: string[]): Generator<{ text: string }> {
  for (const text of tokens) {
    yield { text };
  }
}

// Helper to create a throwing async iterable for error tests
function throwingGenerator(error: Error): AsyncIterable<{ text: string }> {
  return {
    [Symbol.asyncIterator]() {
      return {
        next() {
          return Promise.reject(error);
        },
      };
    },
  };
}

// Import stores to set up model selection (Story 2.4)
import { useHardwareStore } from "@/stores/hardware";
import { useModelStore } from "@/stores/models";

describe("ChatPanel Inference Integration", () => {
  let mockAdapter: InferenceAdapter;

  beforeEach(() => {
    // Reset session store
    useSessionStore.setState({
      sessions: [],
      activeSessionId: null,
    });

    // Story 2.4: Set up model store with a selected model for tests
    useModelStore.setState({
      availableModels: [
        {
          id: "test-model",
          name: "Test Model",
          version: "1.0",
          description: "Test",
          requirements: { ramMb: 4096, gpuVramMb: 0, storageMb: 2000 },
          capabilities: ["general-chat"],
          limitations: [],
          contextLength: 4096,
          license: { name: "MIT", url: "", commercial: true },
          vulnerabilities: [],
          downloadUrl: "",
          sha256: "",
        },
      ],
      downloadedModels: ["test-model"],
      selectedModelId: "test-model",
      switchingTo: null,
      switchProgress: null,
      isLoading: false,
      error: null,
    });

    // Set up hardware store with capabilities
    useHardwareStore.setState({
      capabilities: {
        ram: 16_384,
        cpuCores: 8,
        storageAvailable: 100_000,
        gpu: null,
        detectedBy: "desktop",
        detectedAt: new Date(),
      },
      isLoading: false,
      error: null,
    });

    // Reset mocks
    vi.clearAllMocks();

    // Create default mock adapter
    mockAdapter = createMockAdapter({
      generate: vi
        .fn()
        .mockReturnValue(tokenGenerator(["Hello", " ", "world", "!"])),
    });

    (getInferenceAdapterAsync as Mock).mockResolvedValue(mockAdapter);
  });

  afterEach(async () => {
    // Wait for any pending state updates to flush
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    vi.clearAllMocks();
  });

  describe("Streaming Behavior (AC #2, #5)", () => {
    it("streams tokens into message content", async () => {
      const user = userEvent.setup();
      render(<ChatPanel />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test prompt");
      await user.keyboard("{Enter}");

      // Wait for streaming to complete
      await waitFor(() => {
        const state = useSessionStore.getState();
        const session = state.sessions[0];
        const assistantMessage = session?.messages.find(
          (m) => m.role === "assistant"
        );
        expect(assistantMessage?.content).toBe("Hello world!");
      });
    });

    it("shows generating status during streaming", async () => {
      // Create a slower generator to capture the state
      let resolveGeneration: () => void;
      const generationPromise = new Promise<void>((resolve) => {
        resolveGeneration = resolve;
      });

      mockAdapter = createMockAdapter({
        generate: vi.fn().mockImplementation(async function* () {
          yield { text: "Hello" };
          await generationPromise;
          yield { text: "!" };
        }),
      });
      (getInferenceAdapterAsync as Mock).mockResolvedValue(mockAdapter);

      const user = userEvent.setup();
      render(<ChatPanel />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test");
      await user.keyboard("{Enter}");

      // Should show generating status
      await waitFor(() => {
        expect(screen.getByTestId("generation-status")).toBeInTheDocument();
      });

      // Resolve and finish
      resolveGeneration?.();
    });
  });

  describe("Cold Model Loading (AC #3)", () => {
    it("shows loading indicator when model not loaded", async () => {
      let resolveLoad: () => void;
      const loadPromise = new Promise<void>((resolve) => {
        resolveLoad = resolve;
      });

      mockAdapter = createMockAdapter({
        isModelLoaded: vi.fn().mockResolvedValue(false),
        loadModel: vi.fn().mockImplementation(() => loadPromise),
        generate: vi.fn().mockReturnValue(tokenGenerator(["Done"])),
      });
      (getInferenceAdapterAsync as Mock).mockResolvedValue(mockAdapter);

      const user = userEvent.setup();
      render(<ChatPanel />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test");
      await user.keyboard("{Enter}");

      // Should show model loading
      await waitFor(() => {
        expect(screen.getByTestId("model-loading")).toBeInTheDocument();
      });

      // Resolve load
      await act(() => {
        resolveLoad?.();
      });

      // Should no longer show loading
      await waitFor(() => {
        expect(screen.queryByTestId("model-loading")).not.toBeInTheDocument();
      });
    });

    it("loads model before generating", async () => {
      mockAdapter = createMockAdapter({
        isModelLoaded: vi.fn().mockResolvedValue(false),
        loadModel: vi.fn().mockResolvedValue(undefined),
        generate: vi.fn().mockReturnValue(tokenGenerator(["OK"])),
      });
      (getInferenceAdapterAsync as Mock).mockResolvedValue(mockAdapter);

      const user = userEvent.setup();
      render(<ChatPanel />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(mockAdapter.loadModel).toHaveBeenCalled();
        expect(mockAdapter.generate).toHaveBeenCalled();
      });

      // loadModel should be called before generate
      const loadOrder = (mockAdapter.loadModel as Mock).mock
        .invocationCallOrder[0];
      const generateOrder = (mockAdapter.generate as Mock).mock
        .invocationCallOrder[0];
      expect(loadOrder).toBeLessThan(generateOrder);
    });
  });

  describe("Abort Functionality (AC #4)", () => {
    it("shows abort button during generation", async () => {
      let resolveGeneration: () => void;
      const generationPromise = new Promise<void>((resolve) => {
        resolveGeneration = resolve;
      });

      mockAdapter = createMockAdapter({
        generate: vi.fn().mockImplementation(async function* () {
          yield { text: "Start" };
          await generationPromise;
        }),
      });
      (getInferenceAdapterAsync as Mock).mockResolvedValue(mockAdapter);

      const user = userEvent.setup();
      render(<ChatPanel />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByTestId("abort-button")).toBeInTheDocument();
      });

      resolveGeneration?.();
    });

    it("calls adapter abort when button clicked", async () => {
      let resolveGeneration: () => void;
      const generationPromise = new Promise<void>((resolve) => {
        resolveGeneration = resolve;
      });

      mockAdapter = createMockAdapter({
        generate: vi.fn().mockImplementation(async function* () {
          yield { text: "Start" };
          await generationPromise;
        }),
      });
      (getInferenceAdapterAsync as Mock).mockResolvedValue(mockAdapter);

      const user = userEvent.setup();
      render(<ChatPanel />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByTestId("abort-button")).toBeInTheDocument();
      });

      // Click abort
      await user.click(screen.getByTestId("abort-button"));

      expect(mockAdapter.abort).toHaveBeenCalled();
      resolveGeneration?.();
    });

    it("preserves partial response on abort", async () => {
      let resolveGeneration: () => void;
      const generationPromise = new Promise<void>((resolve) => {
        resolveGeneration = resolve;
      });

      mockAdapter = createMockAdapter({
        generate: vi.fn().mockImplementation(async function* () {
          yield { text: "Partial " };
          yield { text: "content" };
          await generationPromise;
          yield { text: " more" };
        }),
      });
      (getInferenceAdapterAsync as Mock).mockResolvedValue(mockAdapter);

      const user = userEvent.setup();
      render(<ChatPanel />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByTestId("abort-button")).toBeInTheDocument();
      });

      // Click abort
      await user.click(screen.getByTestId("abort-button"));
      resolveGeneration?.();

      // Partial content should be preserved
      await waitFor(() => {
        const state = useSessionStore.getState();
        const session = state.sessions[0];
        const assistantMessage = session?.messages.find(
          (m) => m.role === "assistant"
        );
        expect(assistantMessage?.content).toBe("Partial content");
      });
    });
  });

  describe("Error Handling (AC #6)", () => {
    it("shows error message on inference failure", async () => {
      mockAdapter = createMockAdapter({
        generate: vi
          .fn()
          .mockReturnValue(
            throwingGenerator(new Error("Test inference error"))
          ),
      });
      (getInferenceAdapterAsync as Mock).mockResolvedValue(mockAdapter);

      const user = userEvent.setup();
      render(<ChatPanel />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByTestId("inference-error")).toBeInTheDocument();
      });
    });

    it("shows retry button for recoverable errors", async () => {
      mockAdapter = createMockAdapter({
        generate: vi
          .fn()
          .mockReturnValue(throwingGenerator(new Error("Recoverable error"))),
      });
      (getInferenceAdapterAsync as Mock).mockResolvedValue(mockAdapter);

      const user = userEvent.setup();
      render(<ChatPanel />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByTestId("error-retry-button")).toBeInTheDocument();
      });
    });

    it("allows dismissing error", async () => {
      mockAdapter = createMockAdapter({
        generate: vi
          .fn()
          .mockReturnValue(throwingGenerator(new Error("Error"))),
      });
      (getInferenceAdapterAsync as Mock).mockResolvedValue(mockAdapter);

      const user = userEvent.setup();
      render(<ChatPanel />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByTestId("error-dismiss-button")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("error-dismiss-button"));

      await waitFor(() => {
        expect(screen.queryByTestId("inference-error")).not.toBeInTheDocument();
      });
    });
  });

  describe("Input Disabled State", () => {
    it("disables input while generating", async () => {
      let resolveGeneration: () => void;
      const generationPromise = new Promise<void>((resolve) => {
        resolveGeneration = resolve;
      });

      mockAdapter = createMockAdapter({
        generate: vi.fn().mockImplementation(async function* () {
          yield { text: "..." };
          await generationPromise;
        }),
      });
      (getInferenceAdapterAsync as Mock).mockResolvedValue(mockAdapter);

      const user = userEvent.setup();
      render(<ChatPanel />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByRole("textbox")).toBeDisabled();
      });

      resolveGeneration?.();
    });

    it("disables input while loading model", async () => {
      let resolveLoad: () => void;
      const loadPromise = new Promise<void>((resolve) => {
        resolveLoad = resolve;
      });

      mockAdapter = createMockAdapter({
        isModelLoaded: vi.fn().mockResolvedValue(false),
        loadModel: vi.fn().mockImplementation(() => loadPromise),
        generate: vi.fn().mockReturnValue(tokenGenerator(["OK"])),
      });
      (getInferenceAdapterAsync as Mock).mockResolvedValue(mockAdapter);

      const user = userEvent.setup();
      render(<ChatPanel />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByRole("textbox")).toBeDisabled();
      });

      await act(() => {
        resolveLoad?.();
      });
    });
  });
});
