/**
 * Session Export Utilities Tests
 *
 * Story 3.3: Session Deletion & Export
 * AC #3 (export format selection)
 */
import { describe, expect, it } from "vitest";
import type { Session } from "@/stores/session";
import {
  exportSessionToJson,
  exportSessionToMarkdown,
} from "../export-session";

const mockSession: Session = {
  id: "test-session-1",
  title: "Test Conversation",
  messages: [
    {
      id: "msg-1",
      role: "user",
      content: "Hello, how are you?",
      timestamp: new Date("2025-12-30T10:00:00Z"),
    },
    {
      id: "msg-2",
      role: "assistant",
      content: "I'm doing well, thank you for asking!",
      timestamp: new Date("2025-12-30T10:00:30Z"),
      metadata: {
        tokensGenerated: 15,
        finishReason: "completed",
        durationMs: 1500,
        modelId: "qwen-2.5-coder",
      },
    },
    {
      id: "msg-3",
      role: "user",
      content: "What can you help me with?",
      timestamp: new Date("2025-12-30T10:01:00Z"),
    },
    {
      id: "msg-4",
      role: "assistant",
      content: "I can help you with coding, writing, and more!",
      timestamp: new Date("2025-12-30T10:01:30Z"),
      metadata: {
        tokensGenerated: 20,
        finishReason: "completed",
        durationMs: 2000,
        modelId: "qwen-2.5-coder",
      },
    },
  ],
  createdAt: new Date("2025-12-30T10:00:00Z"),
  updatedAt: new Date("2025-12-30T10:01:30Z"),
};

describe("exportSessionToJson", () => {
  it("returns valid JSON string", () => {
    const result = exportSessionToJson(mockSession);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("includes export metadata", () => {
    const result = exportSessionToJson(mockSession);
    const parsed = JSON.parse(result);

    expect(parsed.meta.exportVersion).toBe("1.0.0");
    expect(parsed.meta.exportedAt).toBeDefined();
    expect(parsed.meta.application).toBe("continuum");
  });

  it("includes session data", () => {
    const result = exportSessionToJson(mockSession);
    const parsed = JSON.parse(result);

    expect(parsed.session.id).toBe(mockSession.id);
    expect(parsed.session.title).toBe(mockSession.title);
    expect(parsed.session.messages).toHaveLength(4);
  });

  it("preserves message metadata", () => {
    const result = exportSessionToJson(mockSession);
    const parsed = JSON.parse(result);

    const assistantMessage = parsed.session.messages[1];
    expect(assistantMessage.metadata).toBeDefined();
    expect(assistantMessage.metadata.tokensGenerated).toBe(15);
    expect(assistantMessage.metadata.modelId).toBe("qwen-2.5-coder");
  });

  it("serializes dates as ISO strings", () => {
    const result = exportSessionToJson(mockSession);
    const parsed = JSON.parse(result);

    expect(parsed.session.createdAt).toBe("2025-12-30T10:00:00.000Z");
    expect(parsed.session.messages[0].timestamp).toBe(
      "2025-12-30T10:00:00.000Z"
    );
  });
});

describe("exportSessionToMarkdown", () => {
  it("includes title as header", () => {
    const result = exportSessionToMarkdown(mockSession);
    expect(result).toContain("# Test Conversation");
  });

  it("includes session metadata", () => {
    const result = exportSessionToMarkdown(mockSession);
    expect(result).toContain("Created:");
    expect(result).toContain("Last updated:");
  });

  it("formats user messages with attribution", () => {
    const result = exportSessionToMarkdown(mockSession);
    expect(result).toContain("**User:**");
    expect(result).toContain("Hello, how are you?");
  });

  it("formats assistant messages with attribution", () => {
    const result = exportSessionToMarkdown(mockSession);
    expect(result).toContain("**AI:**");
    expect(result).toContain("I'm doing well, thank you for asking!");
  });

  it("includes timestamps for each message", () => {
    const result = exportSessionToMarkdown(mockSession);
    // Should include time pattern (locale-dependent format)
    expect(result).toMatch(/\*\d{1,2}:\d{2}/);
  });

  it("preserves message order", () => {
    const result = exportSessionToMarkdown(mockSession);
    const userIndex = result.indexOf("Hello, how are you?");
    const assistantIndex = result.indexOf(
      "I'm doing well, thank you for asking!"
    );

    expect(userIndex).toBeLessThan(assistantIndex);
  });

  it("includes export footer", () => {
    const result = exportSessionToMarkdown(mockSession);
    expect(result).toContain("Exported from Continuum");
  });

  it("handles empty messages array", () => {
    const emptySession: Session = {
      ...mockSession,
      messages: [],
    };

    const result = exportSessionToMarkdown(emptySession);
    expect(result).toContain("# Test Conversation");
    expect(result).not.toContain("**User:**");
    expect(result).not.toContain("**AI:**");
  });
});
