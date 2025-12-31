/**
 * Summarization Service Tests
 *
 * Story 3.5: Auto-Summarization & Context Management
 * Task 2: Create Summarization Service
 *
 * Tests for message summarization, streaming output, error handling,
 * and message selection algorithms.
 */

import type { InferenceAdapter, InferenceToken } from "@continuum/inference";
import { describe, expect, it, vi } from "vitest";
import type { Message } from "@/stores/session";
import {
  SummarizationError,
  selectMessagesForSummarization,
  summarizeMessages,
} from "../summarize";

/** Helper to create mock messages */
function createMessage(
  role: "user" | "assistant",
  content: string,
  id?: string
): Message {
  return {
    id: id ?? `msg-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    timestamp: new Date(),
  };
}

/** Create a mock InferenceAdapter */
function createMockAdapter(
  tokens: InferenceToken[] = [],
  shouldThrow = false
): InferenceAdapter {
  return {
    generate: vi.fn().mockImplementation(async function* () {
      if (shouldThrow) {
        throw new Error("Adapter error");
      }
      for (const token of tokens) {
        yield token;
      }
    }),
    abort: vi.fn().mockResolvedValue(undefined),
    isModelLoaded: vi.fn().mockResolvedValue(true),
    loadModel: vi.fn().mockResolvedValue(undefined),
    getCapabilities: vi.fn().mockReturnValue({
      supportsStreaming: true,
      supportsAbort: true,
      maxContextLength: 4096,
      modelName: "test-model",
    }),
    getStatus: vi.fn().mockReturnValue("loaded"),
  };
}

describe("selectMessagesForSummarization", () => {
  it("returns empty toSummarize when messages count is under minimum", () => {
    const messages = [
      createMessage("user", "hi"),
      createMessage("assistant", "hello"),
    ];
    const result = selectMessagesForSummarization(messages, 0.5, 4);

    expect(result.toSummarize).toHaveLength(0);
    expect(result.toKeep).toHaveLength(2);
  });

  it("keeps minimum recent messages", () => {
    const messages = Array.from({ length: 10 }, (_, i) =>
      createMessage(i % 2 === 0 ? "user" : "assistant", `Message ${i}`)
    );
    const result = selectMessagesForSummarization(messages, 0.5, 4);

    expect(result.toKeep.length).toBeGreaterThanOrEqual(4);
  });

  it("summarizes approximately target percentage", () => {
    const messages = Array.from({ length: 20 }, (_, i) =>
      createMessage(i % 2 === 0 ? "user" : "assistant", `Message ${i}`)
    );
    const result = selectMessagesForSummarization(messages, 0.5, 4);

    // ~50% should be summarized (10 messages), but at least 4 kept
    expect(result.toSummarize.length).toBeGreaterThanOrEqual(8);
    expect(result.toSummarize.length).toBeLessThanOrEqual(16);
    expect(result.toKeep.length).toBeGreaterThanOrEqual(4);
  });

  it("returns oldest messages for summarization", () => {
    const messages = [
      createMessage("user", "First", "msg-1"),
      createMessage("assistant", "Second", "msg-2"),
      createMessage("user", "Third", "msg-3"),
      createMessage("assistant", "Fourth", "msg-4"),
      createMessage("user", "Fifth", "msg-5"),
      createMessage("assistant", "Sixth", "msg-6"),
    ];
    const result = selectMessagesForSummarization(messages, 0.5, 2);

    // Should summarize oldest 3 messages (50%)
    expect(result.toSummarize.map((m) => m.id)).toEqual([
      "msg-1",
      "msg-2",
      "msg-3",
    ]);
    expect(result.toKeep.map((m) => m.id)).toEqual(["msg-4", "msg-5", "msg-6"]);
  });

  it("handles empty message array", () => {
    const result = selectMessagesForSummarization([], 0.5, 4);

    expect(result.toSummarize).toHaveLength(0);
    expect(result.toKeep).toHaveLength(0);
  });
});

describe("summarizeMessages", () => {
  it("streams tokens during summarization", async () => {
    const messages = [
      createMessage("user", "What is React?"),
      createMessage(
        "assistant",
        "React is a JavaScript library for building UIs."
      ),
    ];

    const mockTokens: InferenceToken[] = [
      { text: "Summary: " },
      { text: "Discussion " },
      { text: "about React." },
    ];

    const adapter = createMockAdapter(mockTokens);

    const tokens: string[] = [];
    const generator = summarizeMessages(messages, adapter);

    for await (const token of generator) {
      tokens.push(token);
    }

    expect(tokens).toEqual(["Summary: ", "Discussion ", "about React."]);
  });

  it("returns SummarizationResult from generator return value", async () => {
    const messages = [
      createMessage("user", "Hello"),
      createMessage("assistant", "Hi there!"),
    ];

    const mockTokens: InferenceToken[] = [
      { text: "A " },
      { text: "friendly " },
      { text: "greeting." },
    ];

    const adapter = createMockAdapter(mockTokens);

    const generator = summarizeMessages(messages, adapter);
    let result: unknown;
    let iterResult = await generator.next();

    // Consume all tokens and capture final result
    while (!iterResult.done) {
      iterResult = await generator.next();
    }
    result = iterResult.value;

    expect(result).toBeDefined();
    expect(result).toHaveProperty("summary", "A friendly greeting.");
    expect(result).toHaveProperty("tokenCount", 3);
    expect(result).toHaveProperty("durationMs");
  });

  it("throws SummarizationError on adapter failure", async () => {
    const messages = [createMessage("user", "test")];

    const adapter = createMockAdapter([], true);

    const consumeGenerator = async () => {
      for await (const _ of summarizeMessages(messages, adapter)) {
        // consume
      }
    };

    await expect(consumeGenerator()).rejects.toThrow(SummarizationError);
  });

  it("includes message count in error details", async () => {
    const messages = [
      createMessage("user", "msg1"),
      createMessage("assistant", "msg2"),
    ];

    const adapter = createMockAdapter([], true);

    try {
      for await (const _ of summarizeMessages(messages, adapter)) {
        // consume
      }
    } catch (error) {
      expect(error).toBeInstanceOf(SummarizationError);
      expect((error as SummarizationError).details.messagesCount).toBe(2);
    }
  });

  it("passes correct options to adapter", async () => {
    const messages = [createMessage("user", "Test message")];

    const adapter = createMockAdapter([{ text: "Summary" }]);

    for await (const _ of summarizeMessages(messages, adapter, {
      maxTokens: 200,
      temperature: 0.5,
    })) {
      // consume
    }

    expect(adapter.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        maxTokens: 200,
        temperature: 0.5,
      })
    );
  });

  it("formats messages with role and timestamp", async () => {
    const messages = [
      createMessage("user", "Hello!"),
      createMessage("assistant", "Hi there!"),
    ];

    const adapter = createMockAdapter([{ text: "Summary" }]);

    for await (const _ of summarizeMessages(messages, adapter)) {
      // consume
    }

    // Verify the prompt includes formatted messages
    const generateCall = (adapter.generate as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(generateCall.prompt).toContain("User:");
    expect(generateCall.prompt).toContain("Assistant:");
    expect(generateCall.prompt).toContain("Hello!");
    expect(generateCall.prompt).toContain("Hi there!");
  });
});

describe("SummarizationError", () => {
  it("has correct name and details", () => {
    const error = new SummarizationError("Test error", { key: "value" });

    expect(error.name).toBe("SummarizationError");
    expect(error.message).toBe("Test error");
    expect(error.details).toEqual({ key: "value" });
  });

  it("extends Error properly", () => {
    const error = new SummarizationError("Test", {});

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SummarizationError);
  });
});
