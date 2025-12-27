import { describe, expect, it, vi } from "vitest";
import type {
  InferenceAdapter,
  InferenceCapabilities,
  InferenceError,
  InferenceErrorCode,
  InferenceRequest,
  InferenceResponse,
  InferenceStatus,
  InferenceToken,
} from "../types";

describe("InferenceToken", () => {
  it("should accept valid token with text only", () => {
    const token: InferenceToken = { text: "hello" };
    expect(token.text).toBe("hello");
    expect(token.logprob).toBeUndefined();
  });

  it("should accept token with optional logprob", () => {
    const token: InferenceToken = { text: "world", logprob: -0.5 };
    expect(token.text).toBe("world");
    expect(token.logprob).toBe(-0.5);
  });
});

describe("InferenceRequest", () => {
  it("should accept minimal request with prompt only", () => {
    const request: InferenceRequest = { prompt: "What is 2+2?" };
    expect(request.prompt).toBe("What is 2+2?");
    expect(request.maxTokens).toBeUndefined();
  });

  it("should accept full request with all options", () => {
    const request: InferenceRequest = {
      prompt: "Hello",
      maxTokens: 100,
      temperature: 0.7,
      stopSequences: ["END", "STOP"],
    };
    expect(request.maxTokens).toBe(100);
    expect(request.temperature).toBe(0.7);
    expect(request.stopSequences).toEqual(["END", "STOP"]);
  });
});

describe("InferenceResponse", () => {
  it("should accept completed response", () => {
    const response: InferenceResponse = {
      text: "The answer is 4",
      tokensGenerated: 5,
      finishReason: "completed",
    };
    expect(response.finishReason).toBe("completed");
    expect(response.tokensGenerated).toBe(5);
  });

  it("should accept aborted response", () => {
    const response: InferenceResponse = {
      text: "Partial",
      tokensGenerated: 2,
      finishReason: "aborted",
    };
    expect(response.finishReason).toBe("aborted");
  });
});

describe("InferenceError", () => {
  it("should include user-friendly message", () => {
    const error: InferenceError = {
      code: "MODEL_NOT_FOUND",
      userMessage: "Model not available. Try downloading it first.",
      technicalDetails: { modelName: "phi-3" },
    };
    expect(error.code).toBe("MODEL_NOT_FOUND");
    expect(error.userMessage).toBeDefined();
  });

  it("should support all error codes", () => {
    const codes: InferenceErrorCode[] = [
      "MODEL_NOT_FOUND",
      "OOM_ERROR",
      "INFERENCE_TIMEOUT",
      "GENERATION_ABORTED",
      "MODEL_LOAD_FAILED",
      "UNKNOWN_ERROR",
    ];
    for (const code of codes) {
      const error: InferenceError = {
        code,
        userMessage: "Test message",
      };
      expect(error.code).toBe(code);
    }
  });
});

describe("InferenceCapabilities", () => {
  it("should define model capabilities", () => {
    const caps: InferenceCapabilities = {
      supportsStreaming: true,
      supportsAbort: true,
      maxContextLength: 4096,
      modelName: "Phi-3",
    };
    expect(caps.supportsStreaming).toBe(true);
    expect(caps.supportsAbort).toBe(true);
    expect(caps.maxContextLength).toBe(4096);
    expect(caps.modelName).toBe("Phi-3");
  });
});

describe("InferenceStatus", () => {
  it("should support all status values", () => {
    const statuses: InferenceStatus[] = [
      "unloaded",
      "loading",
      "loaded",
      "generating",
      "error",
    ];
    for (const status of statuses) {
      expect([
        "unloaded",
        "loading",
        "loaded",
        "generating",
        "error",
      ]).toContain(status);
    }
  });
});

describe("InferenceAdapter", () => {
  it("should define required methods", async () => {
    const mockAdapter: InferenceAdapter = {
      generate: vi.fn().mockImplementation(async function* () {
        yield { text: "Hello" };
        yield { text: " World" };
      }),
      abort: vi.fn().mockResolvedValue(undefined),
      isModelLoaded: vi.fn().mockResolvedValue(true),
      loadModel: vi.fn().mockResolvedValue(undefined),
      getCapabilities: vi.fn().mockReturnValue({
        supportsStreaming: true,
        supportsAbort: true,
        maxContextLength: 4096,
        modelName: "Test",
      }),
      getStatus: vi.fn().mockReturnValue("loaded"),
    };

    expect(mockAdapter.generate).toBeDefined();
    expect(mockAdapter.abort).toBeDefined();
    expect(mockAdapter.isModelLoaded).toBeDefined();
    expect(mockAdapter.loadModel).toBeDefined();
    expect(mockAdapter.getCapabilities).toBeDefined();
    expect(mockAdapter.getStatus).toBeDefined();

    // Test generate returns async iterable
    const tokens: InferenceToken[] = [];
    for await (const token of mockAdapter.generate({ prompt: "test" })) {
      tokens.push(token);
    }
    expect(tokens).toHaveLength(2);
    expect(tokens[0]?.text).toBe("Hello");
  });

  it("should support abort during generation", async () => {
    const mockAdapter: InferenceAdapter = {
      generate: vi.fn().mockImplementation(async function* () {
        yield { text: "Hello" };
      }),
      abort: vi.fn().mockResolvedValue(undefined),
      isModelLoaded: vi.fn().mockResolvedValue(true),
      loadModel: vi.fn().mockResolvedValue(undefined),
      getCapabilities: vi.fn().mockReturnValue({
        supportsStreaming: true,
        supportsAbort: true,
        maxContextLength: 4096,
        modelName: "Test",
      }),
      getStatus: vi.fn().mockReturnValue("generating"),
    };

    await mockAdapter.abort();
    expect(mockAdapter.abort).toHaveBeenCalled();
  });
});
