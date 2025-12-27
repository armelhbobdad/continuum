"use client";

/**
 * Chat Panel Component
 *
 * Contains message list and input area.
 * Composes MessageList and MessageInput.
 *
 * Story 1.3: Basic Chat UI Shell - AC #1 (chat panel with message input)
 * Story 1.4: Local Inference Integration - AC #2, #3, #4, #5, #6 (streaming + abort + errors)
 */

import type { InferenceAdapter, InferenceError } from "@continuum/inference";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSessionStore } from "@/stores/session";
import { AbortButton } from "./abort-button";
import { InferenceErrorDisplay } from "./inference-error";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";

/** Inference state for UI feedback */
interface InferenceState {
  isGenerating: boolean;
  isLoadingModel: boolean;
  error: InferenceError | null;
  lastPrompt: string | null;
}

/** Context for the current generation (for abort) */
interface GenerationContext {
  sessionId: string;
  messageId: string;
  adapter: InferenceAdapter;
  aborted: boolean;
}

/**
 * Chat Panel Component
 *
 * Displays messages and input for the active session.
 * Handles scroll behavior, inference streaming, abort, errors, and empty state.
 */
export function ChatPanel() {
  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const addMessage = useSessionStore((state) => state.addMessage);
  const createSession = useSessionStore((state) => state.createSession);
  const updateMessageContent = useSessionStore(
    (state) => state.updateMessageContent
  );
  const finalizeMessage = useSessionStore((state) => state.finalizeMessage);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [inferenceState, setInferenceState] = useState<InferenceState>({
    isGenerating: false,
    isLoadingModel: false,
    error: null,
    lastPrompt: null,
  });

  // Track current generation for abort (AC4)
  const generationRef = useRef<GenerationContext | null>(null);

  // Get active session
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages ?? [];

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Escape key handler for abort (AC4: Escape to abort)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && generationRef.current) {
        handleAbort();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAbort = useCallback(async () => {
    const ctx = generationRef.current;
    if (!ctx || ctx.aborted) return;

    // Mark as aborted
    ctx.aborted = true;

    // Call adapter abort
    await ctx.adapter.abort();

    // Finalize with aborted status (preserves partial response - AC4)
    finalizeMessage(ctx.sessionId, ctx.messageId, {
      finishReason: "aborted",
    });

    setInferenceState((prev) => ({
      ...prev,
      isGenerating: false,
    }));
  }, [finalizeMessage]);

  // Dismiss error (AC6)
  const handleDismissError = useCallback(() => {
    setInferenceState((prev) => ({ ...prev, error: null }));
  }, []);

  const handleSendMessage = useCallback(
    async (content: string) => {
      let sessionId = activeSessionId;

      // Auto-create session if none exists (AC #5 from Story 1.3)
      if (!sessionId) {
        sessionId = createSession(content);
      }

      // Store prompt for potential retry
      setInferenceState((prev) => ({ ...prev, lastPrompt: content }));

      // Add user message
      addMessage(sessionId, { role: "user", content });

      // Create placeholder for assistant message with pre-generated ID
      const assistantMessageId = crypto.randomUUID();
      addMessage(sessionId, {
        role: "assistant",
        content: "",
        id: assistantMessageId,
      });

      // Clear any previous error
      setInferenceState((prev) => ({ ...prev, error: null }));

      // Dynamic import to avoid loading @tauri-apps/api at module load time
      const { getInferenceAdapterAsync } = await import(
        "@/lib/inference/get-adapter"
      );
      const adapter = await getInferenceAdapterAsync();

      // Set up generation context for abort tracking
      generationRef.current = {
        sessionId,
        messageId: assistantMessageId,
        adapter,
        aborted: false,
      };

      try {
        // Load model if needed (AC3: Cold Model Loading)
        if (!(await adapter.isModelLoaded())) {
          setInferenceState((prev) => ({ ...prev, isLoadingModel: true }));
          await adapter.loadModel();
          setInferenceState((prev) => ({ ...prev, isLoadingModel: false }));
        }

        // Check if aborted during model loading
        if (generationRef.current?.aborted) {
          return;
        }

        // Start generation (AC2: Warm Model Latency, AC5: Inference Completion)
        setInferenceState((prev) => ({ ...prev, isGenerating: true }));

        let fullContent = "";
        const startTime = Date.now();

        for await (const token of adapter.generate({ prompt: content })) {
          // Check abort flag during streaming
          if (generationRef.current?.aborted) {
            break;
          }

          fullContent += token.text;
          updateMessageContent(sessionId, assistantMessageId, fullContent);
        }

        // Only finalize as completed if not aborted
        if (!generationRef.current?.aborted) {
          const durationMs = Date.now() - startTime;
          finalizeMessage(sessionId, assistantMessageId, {
            finishReason: "completed",
            durationMs,
          });
        }
      } catch (err) {
        // Don't show error if aborted
        if (generationRef.current?.aborted) {
          return;
        }

        // Handle inference errors (AC6: Error Handling)
        const inferenceError: InferenceError = {
          code: "UNKNOWN_ERROR",
          userMessage: "Something went wrong. Please try again.",
          technicalDetails: {
            message: err instanceof Error ? err.message : "Unknown error",
          },
        };

        setInferenceState((prev) => ({ ...prev, error: inferenceError }));

        // Update the assistant message to show error
        updateMessageContent(
          sessionId,
          assistantMessageId,
          `Error: ${inferenceError.userMessage}`
        );
        finalizeMessage(sessionId, assistantMessageId, {
          finishReason: "error",
        });
      } finally {
        // Only clear generating if not already cleared by abort
        if (!generationRef.current?.aborted) {
          setInferenceState((prev) => ({
            ...prev,
            isGenerating: false,
            isLoadingModel: false,
          }));
        }
        generationRef.current = null;
      }
    },
    [
      activeSessionId,
      addMessage,
      createSession,
      updateMessageContent,
      finalizeMessage,
    ]
  );

  // Retry last failed message (AC6: recovery)
  const handleRetry = useCallback(() => {
    if (inferenceState.lastPrompt) {
      handleDismissError();
      handleSendMessage(inferenceState.lastPrompt);
    }
  }, [inferenceState.lastPrompt, handleDismissError, handleSendMessage]);

  return (
    <div
      className="flex h-full flex-col"
      data-slot="chat-panel"
      data-testid="chat-panel"
    >
      {/* Message area with scroll */}
      <div className="flex-1 overflow-hidden" ref={scrollRef}>
        {messages.length === 0 ? (
          <div
            className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground"
            data-testid="empty-state"
          >
            <div className="mb-2 text-2xl">👋</div>
            <p className="font-medium text-lg">Start a new conversation</p>
            <p className="mt-1 text-sm">
              Type a message below to begin chatting
            </p>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>

      {/* Loading indicator for model loading */}
      {inferenceState.isLoadingModel && (
        <div
          className="border-t bg-muted/50 px-4 py-2 text-center text-muted-foreground text-sm"
          data-testid="model-loading"
        >
          Loading model...
        </div>
      )}

      {/* Generation status bar with abort button (AC4) */}
      {inferenceState.isGenerating && (
        <div
          className="flex items-center justify-between border-t bg-muted/50 px-4 py-2"
          data-testid="generation-status"
        >
          <span className="text-muted-foreground text-sm">Generating...</span>
          <AbortButton onAbort={handleAbort} />
        </div>
      )}

      {/* Error display with retry (AC6) */}
      {inferenceState.error ? (
        <div className="border-t p-4" data-testid="inference-error">
          <InferenceErrorDisplay
            error={inferenceState.error}
            onDismiss={handleDismissError}
            onRetry={handleRetry}
          />
        </div>
      ) : null}

      {/* Input area */}
      <MessageInput
        disabled={inferenceState.isGenerating || inferenceState.isLoadingModel}
        onSend={handleSendMessage}
      />
    </div>
  );
}
