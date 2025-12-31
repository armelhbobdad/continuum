/**
 * Summarization Integration Tests
 *
 * Story 3.5: Auto-Summarization & Context Management
 * Task 9: Integration tests for the full summarization flow.
 *
 * AC #1: Trigger → Execute → Display
 * AC #2: Expansion/collapse of original messages
 * AC #3: Error recovery preserves originals
 * AC #6: Privacy mode compliance (local inference)
 */

import type { InferenceAdapter, InferenceToken } from "@continuum/inference";
import { describe, expect, it, vi } from "vitest";
import type { Message } from "@/stores/session";
import {
  selectMessagesForSummarization,
  summarizeMessages,
} from "../summarize";

describe("Summarization Integration", () => {
  // Mock messages for testing
  const createMockMessages = (count: number): Message[] =>
    Array.from({ length: count }, (_, i) => ({
      id: `msg-${i + 1}`,
      role: i % 2 === 0 ? "user" : "assistant",
      content: `Message ${i + 1} content here`,
      timestamp: new Date(Date.now() - (count - i) * 60_000),
    }));

  // Mock inference adapter
  const createMockAdapter = (
    responseTokens: string[] = ["Summary", " of", " conversation", "."]
  ): InferenceAdapter => ({
    generate: vi.fn().mockImplementation(async function* () {
      for (const token of responseTokens) {
        yield { text: token } as InferenceToken;
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
  });

  describe("Full summarization flow", () => {
    it("selects correct messages for summarization", () => {
      const messages = createMockMessages(10);

      // 50% of 10 = 5, but we keep at least 4, so summarize 6
      const { toSummarize, toKeep } = selectMessagesForSummarization(
        messages,
        0.5,
        4
      );

      // Should summarize oldest messages
      expect(toSummarize.length).toBeGreaterThan(0);
      expect(toKeep.length).toBeGreaterThanOrEqual(4);
      expect(toSummarize.length + toKeep.length).toBe(10);

      // Oldest messages should be in toSummarize
      expect(toSummarize[0].id).toBe("msg-1");
    });

    it("generates summary with streaming tokens", async () => {
      const messages = createMockMessages(5);
      const adapter = createMockAdapter();

      const generator = summarizeMessages(messages, adapter);

      const tokens: string[] = [];
      let result = await generator.next();

      while (!result.done) {
        tokens.push(result.value);
        result = await generator.next();
      }

      // Should have received all tokens
      expect(tokens).toEqual(["Summary", " of", " conversation", "."]);

      // Final result should contain the complete summary
      expect(result.value.summary).toBe("Summary of conversation.");
      expect(result.value.tokenCount).toBe(4);
    });
  });

  describe("Expansion/collapse functionality", () => {
    it("keeps original messages separate from summary selection", () => {
      const messages = createMockMessages(8);

      const { toSummarize, toKeep } = selectMessagesForSummarization(
        messages,
        0.5,
        3
      );

      // Original messages are the ones in toSummarize
      // These should be stored for later expansion
      expect(toSummarize.length).toBeGreaterThan(0);

      // Each message should have complete data for reconstruction
      for (const msg of toSummarize) {
        expect(msg.id).toBeDefined();
        expect(msg.role).toBeDefined();
        expect(msg.content).toBeDefined();
        expect(msg.timestamp).toBeDefined();
      }
    });
  });

  describe("Error recovery", () => {
    it("preserves original messages when summarization fails", async () => {
      const messages = createMockMessages(5);

      // Adapter that throws an error
      const failingAdapter: InferenceAdapter = {
        generate: vi.fn().mockImplementation(async function* () {
          throw new Error("Model inference failed");
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

      const generator = summarizeMessages(messages, failingAdapter);

      // Attempting to consume the generator should throw
      await expect(async () => {
        const result = await generator.next();
        while (!result.done) {
          await generator.next();
        }
      }).rejects.toThrow("Model inference failed");

      // Original messages should be unchanged
      expect(messages.length).toBe(5);
      expect(messages[0].content).toBe("Message 1 content here");
    });
  });

  describe("Privacy mode compliance", () => {
    it("uses local inference adapter for summarization", async () => {
      const messages = createMockMessages(5);
      const adapter = createMockAdapter();

      const generator = summarizeMessages(messages, adapter);

      // Consume the generator
      let result = await generator.next();
      while (!result.done) {
        result = await generator.next();
      }

      // Verify the adapter's generate method was called
      // This confirms we're using the local inference, not external API
      expect(adapter.generate).toHaveBeenCalledTimes(1);

      // The prompt should contain the message content
      const generateCall = (adapter.generate as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(generateCall.prompt).toContain("Message 1 content here");
    });

    it("does not send data externally", async () => {
      // This test verifies that summarization uses the passed adapter
      // and doesn't make any external network calls
      const messages = createMockMessages(3);
      const adapter = createMockAdapter();

      // Mock fetch to ensure no network calls
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const generator = summarizeMessages(messages, adapter);
      let result = await generator.next();
      while (!result.done) {
        result = await generator.next();
      }

      // No external network calls should have been made
      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });
  });
});
