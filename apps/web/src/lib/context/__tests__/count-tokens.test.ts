/**
 * Token Counting Utility Tests
 *
 * Story 3.4: Context Health Indicators
 * Task 1.5: Tests for token counting
 * AC: #1, #2, #3, #4
 */
import { describe, expect, it } from "vitest";
import type { Session } from "@/stores/session";
import { countSessionTokens, estimateTokens } from "../count-tokens";

describe("estimateTokens", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("returns 0 for null/undefined", () => {
    expect(estimateTokens(null as unknown as string)).toBe(0);
    expect(estimateTokens(undefined as unknown as string)).toBe(0);
  });

  it("estimates ~4 chars per token", () => {
    // 5 chars / 4 = 1.25 → ceil = 2
    expect(estimateTokens("hello")).toBe(2);
  });

  it("handles exact multiples of 4", () => {
    // 8 chars / 4 = 2 → ceil = 2
    expect(estimateTokens("hi there")).toBe(2);
  });

  it("handles long text", () => {
    const longText = "a".repeat(1000);
    // 1000 / 4 = 250
    expect(estimateTokens(longText)).toBe(250);
  });

  it("handles single character", () => {
    // 1 char / 4 = 0.25 → ceil = 1
    expect(estimateTokens("a")).toBe(1);
  });

  it("handles unicode characters", () => {
    // Unicode emoji "👋" is 2 chars in JavaScript
    // 2 chars / 4 = 0.5 → ceil = 1
    expect(estimateTokens("👋")).toBe(1);
  });

  it("handles whitespace-only text", () => {
    // 4 spaces / 4 = 1
    expect(estimateTokens("    ")).toBe(1);
  });
});

describe("countSessionTokens", () => {
  const createSession = (
    messages: Array<{ role: "user" | "assistant"; content: string }>
  ): Session => ({
    id: "test-1",
    title: "Test",
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: messages.map((m, i) => ({
      id: `msg-${i}`,
      role: m.role,
      content: m.content,
      timestamp: new Date(),
    })),
  });

  it("returns zero metrics for empty session", () => {
    const session = createSession([]);
    const metrics = countSessionTokens(session);

    expect(metrics.totalTokens).toBe(0);
    expect(metrics.messageCount).toBe(0);
    expect(metrics.userTokens).toBe(0);
    expect(metrics.assistantTokens).toBe(0);
  });

  it("counts user and assistant tokens separately", () => {
    const session = createSession([
      { role: "user", content: "hello" }, // 5 chars → 2 tokens
      { role: "assistant", content: "hi there" }, // 8 chars → 2 tokens
    ]);
    const metrics = countSessionTokens(session);

    expect(metrics.userTokens).toBe(2);
    expect(metrics.assistantTokens).toBe(2);
    expect(metrics.totalTokens).toBe(4);
    expect(metrics.messageCount).toBe(2);
  });

  it("handles single user message", () => {
    const session = createSession([
      { role: "user", content: "Hello, how are you?" }, // 19 chars → 5 tokens
    ]);
    const metrics = countSessionTokens(session);

    expect(metrics.userTokens).toBe(5);
    expect(metrics.assistantTokens).toBe(0);
    expect(metrics.totalTokens).toBe(5);
    expect(metrics.messageCount).toBe(1);
  });

  it("handles multiple messages correctly", () => {
    const session = createSession([
      { role: "user", content: "aaaa" }, // 4 chars → 1 token
      { role: "assistant", content: "bbbbbbbb" }, // 8 chars → 2 tokens
      { role: "user", content: "cccccccccccc" }, // 12 chars → 3 tokens
      { role: "assistant", content: "dddd" }, // 4 chars → 1 token
    ]);
    const metrics = countSessionTokens(session);

    expect(metrics.userTokens).toBe(4); // 1 + 3
    expect(metrics.assistantTokens).toBe(3); // 2 + 1
    expect(metrics.totalTokens).toBe(7);
    expect(metrics.messageCount).toBe(4);
  });

  it("handles empty message content", () => {
    const session = createSession([
      { role: "user", content: "" },
      { role: "assistant", content: "" },
    ]);
    const metrics = countSessionTokens(session);

    expect(metrics.totalTokens).toBe(0);
    expect(metrics.messageCount).toBe(2);
  });

  it("returns correct ContextMetrics type shape", () => {
    const session = createSession([{ role: "user", content: "test" }]);
    const metrics = countSessionTokens(session);

    expect(metrics).toHaveProperty("totalTokens");
    expect(metrics).toHaveProperty("messageCount");
    expect(metrics).toHaveProperty("userTokens");
    expect(metrics).toHaveProperty("assistantTokens");
  });
});
