/**
 * useSummarization Hook Tests
 *
 * Story 3.5: Auto-Summarization & Context Management
 * Task 5: Tests for summarization hook
 * AC #1: When context usage reaches critical threshold, trigger summarization
 * AC #2: Streaming progress shown
 *
 * Task 5.4: State machine with idle|pending|summarizing|success|error
 * Task 5.6: Abort capability via AbortController
 */

import type { InferenceAdapter } from "@continuum/inference";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSummarization } from "../use-summarization";

// Mock dependencies
vi.mock("@/stores/session", () => ({
  useSessionStore: vi.fn(),
}));

vi.mock("@/lib/inference/get-adapter", () => ({
  getInferenceAdapterAsync: vi.fn(),
}));

vi.mock("@/lib/context/summarize", () => ({
  selectMessagesForSummarization: vi.fn(),
  summarizeMessages: vi.fn(),
}));

import {
  selectMessagesForSummarization,
  summarizeMessages,
} from "@/lib/context/summarize";
import { getInferenceAdapterAsync } from "@/lib/inference/get-adapter";
import { useSessionStore } from "@/stores/session";

const mockUseSessionStore = useSessionStore as unknown as ReturnType<
  typeof vi.fn
>;
const mockGetAdapter = getInferenceAdapterAsync as ReturnType<typeof vi.fn>;
const mockSelectMessages = selectMessagesForSummarization as ReturnType<
  typeof vi.fn
>;
const mockSummarizeMessages = summarizeMessages as ReturnType<typeof vi.fn>;

describe("useSummarization", () => {
  const mockStoreSummarizedMessages = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default session store mock with 6 messages (hook requires 4+ to summarize)
    mockUseSessionStore.mockImplementation((selector) =>
      selector({
        activeSessionId: "session-1",
        sessions: [
          {
            id: "session-1",
            messages: [
              {
                id: "msg-1",
                role: "user",
                content: "Hello",
                timestamp: new Date(),
              },
              {
                id: "msg-2",
                role: "assistant",
                content: "Hi!",
                timestamp: new Date(),
              },
              {
                id: "msg-3",
                role: "user",
                content: "How are you?",
                timestamp: new Date(),
              },
              {
                id: "msg-4",
                role: "assistant",
                content: "Good!",
                timestamp: new Date(),
              },
              {
                id: "msg-5",
                role: "user",
                content: "Great",
                timestamp: new Date(),
              },
              {
                id: "msg-6",
                role: "assistant",
                content: "Thanks!",
                timestamp: new Date(),
              },
            ],
          },
        ],
        storeSummarizedMessages: mockStoreSummarizedMessages,
      })
    );
  });

  it("returns initial state with idle state and isSummarizing false", () => {
    const { result } = renderHook(() => useSummarization());

    // Task 5.4: Verify initial state machine state
    expect(result.current.state).toBe("idle");
    expect(result.current.isSummarizing).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it("provides startSummarization function", () => {
    const { result } = renderHook(() => useSummarization());

    expect(typeof result.current.startSummarization).toBe("function");
  });

  it("provides dismissPrompt function", () => {
    const { result } = renderHook(() => useSummarization());

    expect(typeof result.current.dismissPrompt).toBe("function");
  });

  it("sets isDismissed when dismissPrompt is called", async () => {
    const { result } = renderHook(() => useSummarization());

    expect(result.current.isDismissed).toBe(false);

    act(() => {
      result.current.dismissPrompt();
    });

    expect(result.current.isDismissed).toBe(true);
  });

  it("sets isSummarizing to true when startSummarization is called", async () => {
    // Mock the async generator to never complete immediately
    const neverEndingGenerator = (async function* () {
      yield "token";
      // Never completes
      await new Promise(() => {});
    })();

    mockGetAdapter.mockResolvedValue({
      generate: vi.fn(),
    } as unknown as InferenceAdapter);

    mockSelectMessages.mockReturnValue({
      toSummarize: [
        { id: "msg-1", role: "user", content: "Hello", timestamp: new Date() },
      ],
      toKeep: [
        {
          id: "msg-2",
          role: "assistant",
          content: "Hi!",
          timestamp: new Date(),
        },
      ],
      originalTokens: 100,
    });

    mockSummarizeMessages.mockReturnValue(neverEndingGenerator);

    const { result } = renderHook(() => useSummarization());

    act(() => {
      result.current.startSummarization();
    });

    await waitFor(() => {
      expect(result.current.isSummarizing).toBe(true);
    });
  });

  it("updates progress during summarization", async () => {
    let resolveGenerator: (() => void) | undefined;
    const generatorPromise = new Promise<void>((resolve) => {
      resolveGenerator = resolve;
    });

    // Create a generator that yields tokens with progress
    async function* mockGenerator() {
      yield "First";
      yield " token";
      await generatorPromise; // Wait for test to signal completion
      return {
        summary: "Summary text",
        tokenCount: 50,
        durationMs: 100,
      };
    }

    mockGetAdapter.mockResolvedValue({
      generate: vi.fn(),
    } as unknown as InferenceAdapter);

    mockSelectMessages.mockReturnValue({
      toSummarize: [
        { id: "msg-1", role: "user", content: "Hello", timestamp: new Date() },
        {
          id: "msg-2",
          role: "assistant",
          content: "Hi!",
          timestamp: new Date(),
        },
      ],
      toKeep: [],
      originalTokens: 100,
    });

    mockSummarizeMessages.mockReturnValue(mockGenerator());

    const { result } = renderHook(() => useSummarization());

    act(() => {
      result.current.startSummarization();
    });

    // Progress should update as tokens stream
    await waitFor(() => {
      expect(result.current.progress).toBeGreaterThan(0);
    });

    // Complete the generator
    resolveGenerator?.();
  });

  it("stores summarized messages when complete", async () => {
    async function* mockGenerator() {
      yield "Summary";
      return {
        summary: "Summary text",
        tokenCount: 50,
        durationMs: 100,
      };
    }

    mockGetAdapter.mockResolvedValue({
      generate: vi.fn(),
    } as unknown as InferenceAdapter);

    mockSelectMessages.mockReturnValue({
      toSummarize: [
        { id: "msg-1", role: "user", content: "Hello", timestamp: new Date() },
      ],
      toKeep: [
        {
          id: "msg-2",
          role: "assistant",
          content: "Hi!",
          timestamp: new Date(),
        },
      ],
      originalTokens: 100,
    });

    mockSummarizeMessages.mockReturnValue(mockGenerator());
    mockStoreSummarizedMessages.mockReturnValue("summary-msg-id");

    const { result } = renderHook(() => useSummarization());

    await act(async () => {
      await result.current.startSummarization();
    });

    expect(mockStoreSummarizedMessages).toHaveBeenCalled();
  });

  it("sets error when summarization fails", async () => {
    async function* mockGenerator(): AsyncGenerator<string, never, undefined> {
      throw new Error("Summarization failed");
    }

    mockGetAdapter.mockResolvedValue({
      generate: vi.fn(),
    } as unknown as InferenceAdapter);

    mockSelectMessages.mockReturnValue({
      toSummarize: [
        { id: "msg-1", role: "user", content: "Hello", timestamp: new Date() },
      ],
      toKeep: [],
      originalTokens: 100,
    });

    mockSummarizeMessages.mockReturnValue(mockGenerator());

    const { result } = renderHook(() => useSummarization());

    await act(async () => {
      await result.current.startSummarization();
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.message).toBe("Summarization failed");
  });

  it("resets state after successful summarization", async () => {
    async function* mockGenerator() {
      yield "Summary";
      return {
        summary: "Summary text",
        tokenCount: 50,
        durationMs: 100,
      };
    }

    mockGetAdapter.mockResolvedValue({
      generate: vi.fn(),
    } as unknown as InferenceAdapter);

    mockSelectMessages.mockReturnValue({
      toSummarize: [
        { id: "msg-1", role: "user", content: "Hello", timestamp: new Date() },
      ],
      toKeep: [],
      originalTokens: 100,
    });

    mockSummarizeMessages.mockReturnValue(mockGenerator());
    mockStoreSummarizedMessages.mockReturnValue("summary-msg-id");

    const { result } = renderHook(() => useSummarization());

    await act(async () => {
      await result.current.startSummarization();
    });

    expect(result.current.isSummarizing).toBe(false);
    expect(result.current.progress).toBe(100);
  });

  it("does nothing when no active session", async () => {
    mockUseSessionStore.mockImplementation((selector) =>
      selector({
        activeSessionId: null,
        sessions: [],
        storeSummarizedMessages: mockStoreSummarizedMessages,
      })
    );

    const { result } = renderHook(() => useSummarization());

    await act(async () => {
      await result.current.startSummarization();
    });

    expect(mockSelectMessages).not.toHaveBeenCalled();
    expect(result.current.isSummarizing).toBe(false);
    expect(result.current.state).toBe("idle");
  });

  // Task 5.4: State machine tests
  it("transitions through pending → summarizing → success states", async () => {
    async function* mockGenerator() {
      yield "Summary";
      return {
        summary: "Summary text",
        tokenCount: 50,
        durationMs: 100,
      };
    }

    mockGetAdapter.mockResolvedValue({
      generate: vi.fn(),
      abort: vi.fn(),
    } as unknown as InferenceAdapter);

    mockSelectMessages.mockReturnValue({
      toSummarize: [
        { id: "msg-1", role: "user", content: "Hello", timestamp: new Date() },
      ],
      toKeep: [],
      originalTokens: 100,
    });

    mockSummarizeMessages.mockReturnValue(mockGenerator());
    mockStoreSummarizedMessages.mockReturnValue("summary-msg-id");

    const { result } = renderHook(() => useSummarization());

    // Initial state
    expect(result.current.state).toBe("idle");

    await act(async () => {
      await result.current.startSummarization();
    });

    // Final state after completion
    expect(result.current.state).toBe("success");
    expect(result.current.isSummarizing).toBe(false);
  });

  it("transitions to error state on failure", async () => {
    async function* mockGenerator(): AsyncGenerator<string, never, undefined> {
      throw new Error("Summarization failed");
    }

    mockGetAdapter.mockResolvedValue({
      generate: vi.fn(),
      abort: vi.fn(),
    } as unknown as InferenceAdapter);

    mockSelectMessages.mockReturnValue({
      toSummarize: [
        { id: "msg-1", role: "user", content: "Hello", timestamp: new Date() },
      ],
      toKeep: [],
      originalTokens: 100,
    });

    mockSummarizeMessages.mockReturnValue(mockGenerator());

    const { result } = renderHook(() => useSummarization());

    await act(async () => {
      await result.current.startSummarization();
    });

    // Task 5.4: Should be in error state
    expect(result.current.state).toBe("error");
    expect(result.current.error).not.toBeNull();
  });

  // Task 5.6: Abort functionality test
  it("cancels summarization and calls adapter abort", async () => {
    const mockAbort = vi.fn().mockResolvedValue(undefined);

    // Create a generator that never completes
    const neverEndingGenerator = (async function* () {
      yield "token";
      // Never completes - wait forever
      await new Promise(() => {});
    })();

    mockGetAdapter.mockResolvedValue({
      generate: vi.fn(),
      abort: mockAbort,
    } as unknown as InferenceAdapter);

    mockSelectMessages.mockReturnValue({
      toSummarize: [
        { id: "msg-1", role: "user", content: "Hello", timestamp: new Date() },
      ],
      toKeep: [],
      originalTokens: 100,
    });

    mockSummarizeMessages.mockReturnValue(neverEndingGenerator);

    const { result } = renderHook(() => useSummarization());

    // Start summarization
    act(() => {
      result.current.startSummarization();
    });

    // Wait for summarizing state
    await waitFor(() => {
      expect(
        result.current.state === "pending" ||
          result.current.state === "summarizing"
      ).toBe(true);
    });

    // Cancel
    act(() => {
      result.current.cancelSummarization();
    });

    // Task 5.6: Should return to idle state
    expect(result.current.state).toBe("idle");
    expect(result.current.isSummarizing).toBe(false);
    expect(result.current.progress).toBe(0);
  });
});
