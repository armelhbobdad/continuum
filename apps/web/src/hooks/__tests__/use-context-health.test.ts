/**
 * useContextHealth Hook Tests
 *
 * Story 3.4: Context Health Indicators
 * Task 5: Hook for calculating context health
 * AC: #1, #5
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useContextHealth } from "../use-context-health";

// Mock stores
vi.mock("@/stores/session", () => ({
  useSessionStore: vi.fn(),
}));

vi.mock("@/stores/models", () => ({
  useModelStore: vi.fn(),
}));

// Mock inference package
vi.mock("@continuum/inference", () => ({
  getModelMetadata: vi.fn(),
}));

import { getModelMetadata } from "@continuum/inference";
import { useModelStore } from "@/stores/models";
import { useSessionStore } from "@/stores/session";

const mockUseSessionStore = vi.mocked(useSessionStore);
const mockUseModelStore = vi.mocked(useModelStore);
const mockGetModelMetadata = vi.mocked(getModelMetadata);

describe("useContextHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null health when no active session", () => {
    mockUseSessionStore.mockImplementation((selector) =>
      selector({
        activeSessionId: null,
        sessions: [],
      } as ReturnType<typeof useSessionStore.getState>)
    );
    mockUseModelStore.mockImplementation((selector) =>
      selector({
        selectedModelId: "phi-3-mini",
      } as ReturnType<typeof useModelStore.getState>)
    );
    mockGetModelMetadata.mockReturnValue({
      id: "phi-3-mini",
      contextLength: 4096,
    } as ReturnType<typeof getModelMetadata>);

    const { result } = renderHook(() => useContextHealth());

    expect(result.current.health).toBeNull();
    expect(result.current.metrics).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("calculates health for active session", () => {
    const mockSession = {
      id: "session-1",
      title: "Test",
      messages: [
        {
          id: "1",
          role: "user" as const,
          content: "a".repeat(400),
          timestamp: new Date(),
        },
        {
          id: "2",
          role: "assistant" as const,
          content: "b".repeat(400),
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUseSessionStore.mockImplementation((selector) =>
      selector({
        activeSessionId: "session-1",
        sessions: [mockSession],
      } as ReturnType<typeof useSessionStore.getState>)
    );
    mockUseModelStore.mockImplementation((selector) =>
      selector({
        selectedModelId: "phi-3-mini",
      } as ReturnType<typeof useModelStore.getState>)
    );
    mockGetModelMetadata.mockReturnValue({
      id: "phi-3-mini",
      contextLength: 1000,
    } as ReturnType<typeof getModelMetadata>);

    const { result } = renderHook(() => useContextHealth());

    // 800 chars / 4 = 200 tokens, 200/1000 = 20% = healthy
    expect(result.current.health).not.toBeNull();
    expect(result.current.health?.status).toBe("healthy");
    expect(result.current.health?.percentage).toBe(20);
    expect(result.current.metrics?.totalTokens).toBe(200);
    expect(result.current.metrics?.messageCount).toBe(2);
  });

  it("uses default context length when no model selected", () => {
    const mockSession = {
      id: "session-1",
      title: "Test",
      messages: [
        {
          id: "1",
          role: "user" as const,
          content: "hello",
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUseSessionStore.mockImplementation((selector) =>
      selector({
        activeSessionId: "session-1",
        sessions: [mockSession],
      } as ReturnType<typeof useSessionStore.getState>)
    );
    mockUseModelStore.mockImplementation((selector) =>
      selector({
        selectedModelId: null,
      } as ReturnType<typeof useModelStore.getState>)
    );

    const { result } = renderHook(() => useContextHealth());

    // Should use DEFAULT_CONTEXT_LENGTH (2048)
    expect(result.current.modelContextLength).toBe(2048);
    expect(result.current.health).not.toBeNull();
  });

  it("uses default context length when model metadata not found", () => {
    const mockSession = {
      id: "session-1",
      title: "Test",
      messages: [
        {
          id: "1",
          role: "user" as const,
          content: "hello",
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUseSessionStore.mockImplementation((selector) =>
      selector({
        activeSessionId: "session-1",
        sessions: [mockSession],
      } as ReturnType<typeof useSessionStore.getState>)
    );
    mockUseModelStore.mockImplementation((selector) =>
      selector({
        selectedModelId: "unknown-model",
      } as ReturnType<typeof useModelStore.getState>)
    );
    mockGetModelMetadata.mockReturnValue(undefined);

    const { result } = renderHook(() => useContextHealth());

    expect(result.current.modelContextLength).toBe(2048);
  });

  it("returns correct modelContextLength from model", () => {
    const mockSession = {
      id: "session-1",
      title: "Test",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUseSessionStore.mockImplementation((selector) =>
      selector({
        activeSessionId: "session-1",
        sessions: [mockSession],
      } as ReturnType<typeof useSessionStore.getState>)
    );
    mockUseModelStore.mockImplementation((selector) =>
      selector({
        selectedModelId: "gemma-2b",
      } as ReturnType<typeof useModelStore.getState>)
    );
    mockGetModelMetadata.mockReturnValue({
      id: "gemma-2b",
      contextLength: 8192,
    } as ReturnType<typeof getModelMetadata>);

    const { result } = renderHook(() => useContextHealth());

    expect(result.current.modelContextLength).toBe(8192);
  });

  it("recalculates when session messages change", () => {
    let messages = [
      {
        id: "1",
        role: "user" as const,
        content: "a".repeat(100),
        timestamp: new Date(),
      },
    ];

    const mockSession = () => ({
      id: "session-1",
      title: "Test",
      messages,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockUseSessionStore.mockImplementation((selector) =>
      selector({
        activeSessionId: "session-1",
        sessions: [mockSession()],
      } as ReturnType<typeof useSessionStore.getState>)
    );
    mockUseModelStore.mockImplementation((selector) =>
      selector({
        selectedModelId: "phi-3-mini",
      } as ReturnType<typeof useModelStore.getState>)
    );
    mockGetModelMetadata.mockReturnValue({
      id: "phi-3-mini",
      contextLength: 1000,
    } as ReturnType<typeof getModelMetadata>);

    const { result, rerender } = renderHook(() => useContextHealth());

    // Initial: 100 chars / 4 = 25 tokens
    expect(result.current.metrics?.totalTokens).toBe(25);

    // Simulate message update
    messages = [
      {
        id: "1",
        role: "user" as const,
        content: "a".repeat(400),
        timestamp: new Date(),
      },
    ];
    rerender();

    // After rerender with new mocks, should recalculate
    expect(result.current.metrics?.totalTokens).toBe(100);
  });
});
