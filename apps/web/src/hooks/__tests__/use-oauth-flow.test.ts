import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OAuthProgress, OAuthState } from "@/types";
import { DEFAULT_OAUTH_PROGRESS } from "@/types";
import { useOAuthFlow } from "../use-oauth-flow";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock Tauri Shell Plugin
vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn(),
}));

// Import the mocked modules
import { invoke } from "@tauri-apps/api/core";
import { open as shellOpen } from "@tauri-apps/plugin-shell";

const mockInvoke = vi.mocked(invoke);
const mockShellOpen = vi.mocked(shellOpen);

// Mock window.__TAURI__ to indicate desktop environment
const mockTauriWindow = () => {
  (window as unknown as Record<string, unknown>).__TAURI__ = true;
};

const clearTauriWindow = () => {
  (window as unknown as Record<string, unknown>).__TAURI__ = undefined;
};

// Helper to create progress with state
const createProgress = (state: OAuthState, step = 1): OAuthProgress => ({
  state,
  step_description: "Test step",
  current_step: step,
  total_steps: 3,
  started_at: Date.now(),
  timeout_at: null,
  cancellable: true,
});

describe("useOAuthFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockTauriWindow();
    mockShellOpen.mockResolvedValue(undefined);
  });

  afterEach(() => {
    clearTauriWindow();
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("starts with idle progress", () => {
      mockInvoke.mockResolvedValue(DEFAULT_OAUTH_PROGRESS);

      const { result } = renderHook(() => useOAuthFlow());

      expect(result.current.progress.state.type).toBe("Idle");
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.isFailed).toBe(false);
    });

    it("has no error initially", () => {
      mockInvoke.mockResolvedValue(DEFAULT_OAUTH_PROGRESS);

      const { result } = renderHook(() => useOAuthFlow());

      expect(result.current.error).toBeNull();
      expect(result.current.errorMessage).toBeNull();
    });
  });

  describe("startOAuth", () => {
    it("starts OAuth flow and opens browser with auth URL", async () => {
      const authUrl =
        "https://accounts.google.com/o/oauth2/v2/auth?client_id=...";
      const awaitingProgress = createProgress({
        type: "AwaitingDeepLink",
        started_at: Date.now(),
        timeout_at: Date.now() + 30_000,
      });

      mockInvoke
        .mockResolvedValueOnce(DEFAULT_OAUTH_PROGRESS) // Initial fetch
        .mockResolvedValueOnce(authUrl) // start_oauth_flow
        .mockResolvedValueOnce(awaitingProgress); // Progress poll

      const { result } = renderHook(() => useOAuthFlow());

      await act(async () => {
        await result.current.startOAuth("google");
      });

      expect(mockInvoke).toHaveBeenCalledWith("start_oauth_flow", {
        provider: "google",
      });
      expect(mockShellOpen).toHaveBeenCalledWith(authUrl);
    });

    it("polls for progress after starting flow", async () => {
      const authUrl = "https://example.com/auth";
      const awaitingProgress = createProgress({
        type: "AwaitingDeepLink",
        started_at: Date.now(),
        timeout_at: Date.now() + 30_000,
      });

      mockInvoke
        .mockResolvedValueOnce(DEFAULT_OAUTH_PROGRESS)
        .mockResolvedValueOnce(authUrl)
        .mockResolvedValue(awaitingProgress);

      const { result } = renderHook(() => useOAuthFlow());

      await act(async () => {
        await result.current.startOAuth();
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.progress.state.type).toBe("AwaitingDeepLink");
    });

    it("handles start error gracefully", async () => {
      mockInvoke
        .mockResolvedValueOnce(DEFAULT_OAUTH_PROGRESS)
        .mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useOAuthFlow());

      await act(async () => {
        await result.current.startOAuth();
      });

      expect(result.current.error?.type).toBe("InternalError");
      expect(result.current.errorMessage).toContain("Network error");
    });
  });

  describe("progress polling", () => {
    it("updates progress when polling", async () => {
      vi.useRealTimers(); // Use real timers for this test

      const authUrl = "https://example.com/auth";
      const step1Progress = createProgress(
        {
          type: "AwaitingDeepLink",
          started_at: Date.now(),
          timeout_at: Date.now() + 30_000,
        },
        1
      );

      mockInvoke
        .mockResolvedValueOnce(DEFAULT_OAUTH_PROGRESS) // Initial
        .mockResolvedValueOnce(authUrl) // start
        .mockResolvedValue(step1Progress); // All subsequent polls

      const { result } = renderHook(() => useOAuthFlow());

      await act(async () => {
        await result.current.startOAuth();
      });

      expect(result.current.currentStep).toBe(1);
      expect(result.current.isLoading).toBe(true);
    });

    it("stops polling when flow completes", async () => {
      vi.useRealTimers();

      const authUrl = "https://example.com/auth";
      const completedProgress = createProgress({ type: "Complete" }, 3);

      mockInvoke
        .mockResolvedValueOnce(DEFAULT_OAUTH_PROGRESS)
        .mockResolvedValueOnce(authUrl)
        .mockResolvedValue(completedProgress);

      const { result } = renderHook(() => useOAuthFlow());

      await act(async () => {
        await result.current.startOAuth();
      });

      expect(result.current.isComplete).toBe(true);
      expect(result.current.currentStep).toBe(3);
    });

    it("stops polling when flow fails", async () => {
      vi.useRealTimers();

      const authUrl = "https://example.com/auth";
      const failedProgress = createProgress(
        { type: "Failed", error: { type: "DeepLinkTimeout" } },
        1
      );

      mockInvoke
        .mockResolvedValueOnce(DEFAULT_OAUTH_PROGRESS)
        .mockResolvedValueOnce(authUrl)
        .mockResolvedValue(failedProgress);

      const { result } = renderHook(() => useOAuthFlow());

      await act(async () => {
        await result.current.startOAuth();
      });

      expect(result.current.isFailed).toBe(true);
      expect(result.current.error?.type).toBe("DeepLinkTimeout");
    });
  });

  describe("cancelOAuth", () => {
    it("cancels OAuth flow and resets state", async () => {
      const authUrl = "https://example.com/auth";
      const awaitingProgress = createProgress({
        type: "AwaitingDeepLink",
        started_at: Date.now(),
        timeout_at: Date.now() + 30_000,
      });

      mockInvoke
        .mockResolvedValueOnce(DEFAULT_OAUTH_PROGRESS)
        .mockResolvedValueOnce(authUrl)
        .mockResolvedValueOnce(awaitingProgress)
        .mockResolvedValueOnce(undefined); // cancel

      const { result } = renderHook(() => useOAuthFlow());

      await act(async () => {
        await result.current.startOAuth();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await result.current.cancelOAuth();
      });

      expect(result.current.progress.state.type).toBe("Idle");
      expect(result.current.isLoading).toBe(false);
      expect(mockInvoke).toHaveBeenCalledWith("cancel_oauth_flow");
    });
  });

  describe("fallback methods", () => {
    it("fallbackToLocalServer triggers local server mode", async () => {
      vi.useRealTimers();

      const localServerProgress = createProgress(
        {
          type: "AwaitingLocalServer",
          port: 9876,
          started_at: Date.now(),
          timeout_at: Date.now() + 30_000,
        },
        2
      );
      const authUrl =
        "https://example.com/auth?redirect_uri=http://localhost:9876";

      mockInvoke
        .mockResolvedValueOnce(DEFAULT_OAUTH_PROGRESS) // Initial fetch on mount
        .mockResolvedValueOnce({ port: 9876, authorization_url: authUrl }) // fallback_to_local_server returns { port, authorization_url }
        .mockResolvedValue(localServerProgress); // progress polls

      const { result } = renderHook(() => useOAuthFlow());

      // Wait for initial fetch
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      await act(async () => {
        await result.current.fallbackToLocalServer();
      });

      expect(mockInvoke).toHaveBeenCalledWith("fallback_to_local_server");
      expect(mockShellOpen).toHaveBeenCalledWith(authUrl);
    });
  });

  describe("retryOAuth", () => {
    it("retries OAuth flow after failure", async () => {
      vi.useRealTimers();

      const authUrl = "https://example.com/auth";
      const awaitingProgress = createProgress({
        type: "AwaitingDeepLink",
        started_at: Date.now(),
        timeout_at: Date.now() + 30_000,
      });

      // For retry, we need:
      // 1. Initial progress (idle) - on mount
      // 2. cancel_oauth_flow (returns undefined)
      // 3. start_oauth_flow (returns authUrl)
      // 4. Progress poll (returns awaiting)
      mockInvoke
        .mockResolvedValueOnce(DEFAULT_OAUTH_PROGRESS) // Initial fetch on mount
        .mockResolvedValueOnce(undefined) // cancel_oauth_flow
        .mockResolvedValueOnce(authUrl) // start_oauth_flow
        .mockResolvedValue(awaitingProgress); // All subsequent polls

      const { result } = renderHook(() => useOAuthFlow());

      // Wait for initial fetch to complete
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      await act(async () => {
        await result.current.retryOAuth();
        // Wait for all async operations to settle
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(result.current.progress.state.type).toBe("AwaitingDeepLink");
      expect(mockInvoke).toHaveBeenCalledWith("cancel_oauth_flow");
      expect(mockInvoke).toHaveBeenCalledWith("start_oauth_flow", {
        provider: null,
      });
    });
  });

  describe("non-Tauri environment", () => {
    beforeEach(() => {
      clearTauriWindow();
    });

    it("sets error when trying to start OAuth in browser", async () => {
      const { result } = renderHook(() => useOAuthFlow());

      await act(async () => {
        await result.current.startOAuth();
      });

      expect(result.current.error?.type).toBe("InternalError");
      expect(result.current.errorMessage).toContain("desktop app");
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });
});
