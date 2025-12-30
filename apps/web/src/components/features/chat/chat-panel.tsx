"use client";

/**
 * Chat Panel Component
 *
 * Contains message list and input area.
 * Composes MessageList and MessageInput.
 *
 * Story 1.3: Basic Chat UI Shell - AC #1 (chat panel with message input)
 * Story 1.4: Local Inference Integration - AC #2, #3, #4, #5, #6 (streaming + abort + errors)
 * Story 1.5: Inference Badge & Streaming UI - AC #1, #2 (badge + streaming message)
 * Story 2.4: Model Selection & Switching - AC #2, #3, #5 (model switching + auto-selection)
 */

import type { InferenceAdapter, InferenceError } from "@continuum/inference";
import { getModelMetadata } from "@continuum/inference";
import { useCallback, useEffect, useRef, useState } from "react";
import { useModelSwitch } from "@/hooks/use-model-switch";
import {
  autoSelectModel,
  getAutoSelectFailureMessage,
  needsAutoSelection,
} from "@/lib/inference/auto-select-model";
import { useHardwareStore } from "@/stores/hardware";
import { useModelStore } from "@/stores/models";
import { useSessionStore } from "@/stores/session";
import type { StreamingMetadata } from "@/types/inference";
import { AbortButton } from "./abort-button";
import { ChatModelSelector } from "./chat-model-selector";
import { InferenceErrorDisplay } from "./inference-error";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";

/** Inference state for UI feedback */
interface InferenceState {
  isGenerating: boolean;
  isLoadingModel: boolean;
  isSwitchingModel: boolean;
  error: InferenceError | null;
  lastPrompt: string | null;
}

/** Context for the current generation (for abort) */
interface GenerationContext {
  sessionId: string;
  messageId: string;
  adapter: InferenceAdapter;
  aborted: boolean;
  streamingMetadata: StreamingMetadata;
  modelId: string;
}

/**
 * Chat Panel Component
 *
 * Displays messages and input for the active session.
 * Handles scroll behavior, inference streaming, abort, errors, and empty state.
 * Story 2.4: Integrates model selection and auto-selection.
 */
export function ChatPanel() {
  // Session store hooks
  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const addMessage = useSessionStore((state) => state.addMessage);
  const createSession = useSessionStore((state) => state.createSession);
  const updateMessageContent = useSessionStore(
    (state) => state.updateMessageContent
  );
  const setMessageInferenceMetadata = useSessionStore(
    (state) => state.setMessageInferenceMetadata
  );
  const finalizeMessage = useSessionStore((state) => state.finalizeMessage);

  // Model store hooks (Story 2.4)
  const selectedModelId = useModelStore((state) => state.selectedModelId);
  const downloadedModels = useModelStore((state) => state.downloadedModels);
  const availableModels = useModelStore((state) => state.availableModels);
  const selectModel = useModelStore((state) => state.selectModel);

  // Hardware store hooks (Story 2.4)
  const hardwareCapabilities = useHardwareStore((state) => state.capabilities);

  // Model switch hook (Story 2.4)
  const { isSwitching, switchingTo } = useModelSwitch();

  const scrollRef = useRef<HTMLDivElement>(null);

  const [inferenceState, setInferenceState] = useState<InferenceState>({
    isGenerating: false,
    isLoadingModel: false,
    isSwitchingModel: false,
    error: null,
    lastPrompt: null,
  });

  // Track streaming metadata for UI (Story 1.5)
  const [streamingMetadata, setStreamingMetadata] =
    useState<StreamingMetadata | null>(null);

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
  }, []);

  // Handle abort callback - defined before the useEffect that uses it
  const handleAbort = useCallback(async () => {
    const ctx = generationRef.current;
    if (!ctx || ctx.aborted) {
      return;
    }

    // Mark as aborted
    ctx.aborted = true;

    // Call adapter abort
    await ctx.adapter.abort();

    // Save inference metadata before clearing (Story 1.5)
    if (ctx.streamingMetadata) {
      setMessageInferenceMetadata(ctx.sessionId, ctx.messageId, {
        source: ctx.streamingMetadata.source,
        modelName: ctx.streamingMetadata.modelName,
        startTime: ctx.streamingMetadata.startTime,
        tokenCount: ctx.streamingMetadata.tokenCount,
        duration: Date.now() - ctx.streamingMetadata.startTime,
      });
    }

    // Finalize with aborted status (preserves partial response - AC4)
    finalizeMessage(ctx.sessionId, ctx.messageId, {
      finishReason: "aborted",
      modelId: ctx.modelId,
    });

    // Clear streaming metadata
    setStreamingMetadata(null);

    setInferenceState((prev) => ({
      ...prev,
      isGenerating: false,
    }));
  }, [finalizeMessage, setMessageInferenceMetadata]);

  // Escape key handler for abort (AC4: Escape to abort)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && generationRef.current) {
        handleAbort();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleAbort]);

  // Dismiss error (AC6)
  const handleDismissError = useCallback(() => {
    setInferenceState((prev) => ({ ...prev, error: null }));
  }, []);

  const handleSendMessage = useCallback(
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex streaming logic required for chat functionality
    async (content: string) => {
      let sessionId = activeSessionId;

      // Auto-create session if none exists (AC #5 from Story 1.3)
      if (!sessionId) {
        sessionId = createSession(content);
      }

      // Store prompt for potential retry
      setInferenceState((prev) => ({ ...prev, lastPrompt: content }));

      // Story 2.4 Task 9.4: Auto-select model if needed
      let modelIdToUse = selectedModelId;

      if (needsAutoSelection(selectedModelId, downloadedModels)) {
        const autoSelectResult = autoSelectModel(
          downloadedModels,
          availableModels,
          hardwareCapabilities
        );

        if (!autoSelectResult.success) {
          // Show error if auto-selection failed
          const failureMessage = getAutoSelectFailureMessage(
            autoSelectResult.reason ?? "no-downloaded-models"
          );
          const inferenceError: InferenceError = {
            code: "MODEL_NOT_FOUND",
            userMessage: failureMessage,
          };
          setInferenceState((prev) => ({ ...prev, error: inferenceError }));
          return;
        }

        // Use auto-selected model and persist as user preference (Task 7.5)
        modelIdToUse = autoSelectResult.modelId;
        if (modelIdToUse) {
          selectModel(modelIdToUse);
        }
      }

      // Final check - must have a model
      if (!modelIdToUse) {
        const inferenceError: InferenceError = {
          code: "MODEL_NOT_FOUND",
          userMessage:
            "No model selected. Please download and select a model first.",
        };
        setInferenceState((prev) => ({ ...prev, error: inferenceError }));
        return;
      }

      // Get model metadata for display name (Story 2.4 Task 8.3)
      const modelMeta = getModelMetadata(modelIdToUse);
      const modelDisplayName = modelMeta?.name ?? modelIdToUse;

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
      const { isDesktop } = await import("@continuum/platform");
      const adapter = await getInferenceAdapterAsync();

      const startTime = Date.now();

      // Determine inference source based on platform and adapter (Story 1.5)
      // Local: Kalosm on desktop, Stub: fallback on web, Cloud: future provider
      const inferenceSource: "local" | "stub" | `cloud:${string}` = isDesktop()
        ? "local"
        : "stub";

      // Create streaming metadata (Story 1.5 + Story 2.4 model name)
      const metadata: StreamingMetadata = {
        messageId: assistantMessageId,
        source: inferenceSource,
        modelName: modelDisplayName,
        startTime,
        tokenCount: 0,
      };

      // Set up generation context for abort tracking (includes modelId for Task 8.1)
      generationRef.current = {
        sessionId,
        messageId: assistantMessageId,
        adapter,
        aborted: false,
        streamingMetadata: metadata,
        modelId: modelIdToUse,
      };

      // Update streaming state for UI
      setStreamingMetadata(metadata);

      try {
        // Load model if needed (AC3: Cold Model Loading)
        // Story 2.4 Task 9.2: Pass modelId to loadModel
        if (!(await adapter.isModelLoaded())) {
          setInferenceState((prev) => ({ ...prev, isLoadingModel: true }));
          await adapter.loadModel(modelIdToUse);
          setInferenceState((prev) => ({ ...prev, isLoadingModel: false }));
        }

        // Check if aborted during model loading
        if (generationRef.current?.aborted) {
          return;
        }

        // Start generation (AC2: Warm Model Latency, AC5: Inference Completion)
        setInferenceState((prev) => ({ ...prev, isGenerating: true }));

        let fullContent = "";
        let tokenCount = 0;

        for await (const token of adapter.generate({ prompt: content })) {
          // Check abort flag during streaming
          if (generationRef.current?.aborted) {
            break;
          }

          fullContent += token.text;
          tokenCount += 1;

          // Update streaming metadata with token count (Story 1.5)
          if (generationRef.current) {
            generationRef.current.streamingMetadata.tokenCount = tokenCount;
          }
          setStreamingMetadata((prev) =>
            prev ? { ...prev, tokenCount } : null
          );

          updateMessageContent(sessionId, assistantMessageId, fullContent);
        }

        // Only finalize as completed if not aborted
        if (!generationRef.current?.aborted) {
          const durationMs = Date.now() - startTime;

          // Save inference metadata to message (Story 1.5 Task 5.4)
          setMessageInferenceMetadata(sessionId, assistantMessageId, {
            source: inferenceSource,
            modelName: modelDisplayName,
            startTime,
            tokenCount,
            duration: durationMs,
          });

          // Finalize with modelId (Story 2.4 Task 8.1)
          finalizeMessage(sessionId, assistantMessageId, {
            finishReason: "completed",
            durationMs,
            tokensGenerated: tokenCount,
            modelId: modelIdToUse,
          });

          // Clear streaming metadata
          setStreamingMetadata(null);
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
          modelId: modelIdToUse,
        });
      } finally {
        // Only clear generating if not already cleared by abort
        if (!generationRef.current?.aborted) {
          setInferenceState((prev) => ({
            ...prev,
            isGenerating: false,
            isLoadingModel: false,
          }));
          // Clear streaming metadata on completion or error
          setStreamingMetadata(null);
        }
        generationRef.current = null;
      }
    },
    [
      activeSessionId,
      addMessage,
      createSession,
      updateMessageContent,
      setMessageInferenceMetadata,
      finalizeMessage,
      selectedModelId,
      downloadedModels,
      availableModels,
      hardwareCapabilities,
      selectModel,
    ]
  );

  // Retry last failed message (AC6: recovery)
  const handleRetry = useCallback(() => {
    if (inferenceState.lastPrompt) {
      handleDismissError();
      handleSendMessage(inferenceState.lastPrompt);
    }
  }, [inferenceState.lastPrompt, handleDismissError, handleSendMessage]);

  // Task 9.3: Determine if input should be disabled and why
  const isInputDisabled =
    inferenceState.isGenerating || inferenceState.isLoadingModel || isSwitching;

  const getDisabledReason = (): string | undefined => {
    if (isSwitching && switchingTo) {
      return `Switching to ${switchingTo}...`;
    }
    if (inferenceState.isLoadingModel) {
      return "Loading model...";
    }
    if (inferenceState.isGenerating) {
      return "Generating response...";
    }
    return;
  };

  return (
    <div
      className="flex h-full flex-col"
      data-slot="chat-panel"
      data-testid="chat-panel"
    >
      {/* Model selector header (Story 2.4 Task 9.5) */}
      <div
        className="flex items-center justify-between border-b px-4 py-2"
        data-testid="chat-header"
      >
        <ChatModelSelector disabled={isInputDisabled} />
      </div>

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
          <MessageList
            messages={messages}
            streamingMetadata={streamingMetadata}
          />
        )}
      </div>

      {/* Switching indicator (Story 2.4 Task 9.3) */}
      {Boolean(isSwitching) && (
        <div
          className="border-t bg-amber-50 px-4 py-2 text-center text-amber-700 text-sm dark:bg-amber-950/20 dark:text-amber-400"
          data-testid="model-switching"
        >
          Switching to {switchingTo}...
        </div>
      )}

      {/* Loading indicator for model loading */}
      {inferenceState.isLoadingModel && !isSwitching && (
        <div
          className="border-t bg-muted/50 px-4 py-2 text-center text-muted-foreground text-sm"
          data-testid="model-loading"
        >
          Loading model...
        </div>
      )}

      {/* Generation status bar with abort button (AC4) */}
      {Boolean(inferenceState.isGenerating) && (
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

      {/* Input area (Task 9.3: disabled with reason during switching) */}
      <MessageInput
        disabled={isInputDisabled}
        disabledReason={getDisabledReason()}
        onSend={handleSendMessage}
      />
    </div>
  );
}
