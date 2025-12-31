/**
 * useSummarization Hook
 *
 * Story 3.5: Auto-Summarization & Context Management
 * Task 5: Hook to manage summarization state and trigger summarization.
 *
 * Handles:
 * - Triggering summarization when user requests
 * - Streaming progress updates
 * - Storing results in session store
 * - Error handling
 * - Abort capability via AbortController
 *
 * AC #1: Trigger summarization on user action
 * AC #2: Show streaming progress
 *
 * Task 5.4: State machine with idle|pending|summarizing|success|error
 * Task 5.6: Abort capability via AbortController
 */
import { useCallback, useRef, useState } from "react";
import {
  selectMessagesForSummarization,
  summarizeMessages,
} from "@/lib/context/summarize";
import { getInferenceAdapterAsync } from "@/lib/inference/get-adapter";
import { useSessionStore } from "@/stores/session";

/**
 * Summarization state machine states (Task 5.4)
 */
export type SummarizationState =
  | "idle"
  | "pending"
  | "summarizing"
  | "success"
  | "error";

/**
 * Result returned by useSummarization hook.
 */
export interface UseSummarizationResult {
  /** Current state machine state (Task 5.4) */
  state: SummarizationState;
  /** True while summarization is in progress (derived from state) */
  isSummarizing: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Error if summarization failed */
  error: Error | null;
  /** True if user dismissed the prompt for this session */
  isDismissed: boolean;
  /** Streaming summary text during generation */
  streamingText: string;
  /** Number of messages being summarized */
  messageCount: number;
  /** Start summarization process */
  startSummarization: () => Promise<void>;
  /** Dismiss the summarization prompt */
  dismissPrompt: () => void;
  /** Cancel ongoing summarization (Task 5.6) */
  cancelSummarization: () => void;
}

/**
 * Default percentage of oldest messages to summarize.
 */
const DEFAULT_SUMMARIZE_PERCENTAGE = 0.5;

/**
 * Minimum messages to keep unsummarized.
 */
const MIN_KEEP_MESSAGES = 4;

/**
 * Hook to manage summarization state and trigger summarization.
 *
 * @returns Summarization state and control functions
 */
export function useSummarization(): UseSummarizationResult {
  // Task 5.4: State machine implementation
  const [state, setState] = useState<SummarizationState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [messageCount, setMessageCount] = useState(0);

  // Task 5.6: AbortController ref for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const adapterRef = useRef<Awaited<
    ReturnType<typeof getInferenceAdapterAsync>
  > | null>(null);

  // Get session store data
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const sessions = useSessionStore((s) => s.sessions);
  const storeSummarizedMessages = useSessionStore(
    (s) => s.storeSummarizedMessages
  );

  const startSummarization = useCallback(async () => {
    // Get active session
    const activeSession = sessions.find((s) => s.id === activeSessionId);
    if (!(activeSession && activeSessionId)) {
      return;
    }

    const messages = activeSession.messages;
    if (messages.length < MIN_KEEP_MESSAGES) {
      return; // Not enough messages to summarize
    }

    // Task 5.4: Transition to pending state
    setState("pending");
    setProgress(0);
    setError(null);
    setStreamingText("");

    // Task 5.6: Create abort controller for this summarization
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Get inference adapter
      const adapter = await getInferenceAdapterAsync();
      adapterRef.current = adapter;

      // Check if aborted during adapter loading
      if (signal.aborted) {
        setState("idle");
        return;
      }

      // Select messages to summarize
      const { toSummarize } = selectMessagesForSummarization(
        messages,
        DEFAULT_SUMMARIZE_PERCENTAGE,
        MIN_KEEP_MESSAGES
      );

      if (toSummarize.length === 0) {
        setState("idle");
        return;
      }

      // Set message count for UI
      setMessageCount(toSummarize.length);

      // Estimate original token count (rough: ~4 chars per token)
      const estimatedOriginalTokens = toSummarize.reduce(
        (sum, m) => sum + Math.ceil(m.content.length / 4),
        0
      );

      // Task 5.4: Transition to summarizing state
      setState("summarizing");

      // Stream summarization
      const generator = summarizeMessages(toSummarize, adapter);

      let tokensReceived = 0;
      let currentText = "";
      let result: {
        summary: string;
        tokenCount: number;
        durationMs: number;
      } | null = null;

      // Consume the generator with abort check (Task 5.6)
      while (true) {
        // Check abort signal before each iteration
        if (signal.aborted) {
          // Call adapter abort to stop generation
          await adapter.abort();
          setState("idle");
          setStreamingText("");
          setProgress(0);
          return;
        }

        const { value, done } = await generator.next();

        if (done) {
          result = value;
          break;
        }

        // Value is a token string - accumulate for streaming display
        currentText += value;
        setStreamingText(currentText);
        tokensReceived++;

        // Update progress (estimate based on tokens received)
        // Assume ~50 tokens for a typical summary
        const estimatedProgress = Math.min(90, (tokensReceived / 50) * 100);
        setProgress(estimatedProgress);
      }

      // Store the result
      if (result) {
        storeSummarizedMessages(activeSessionId, result.summary, toSummarize, {
          originalMessageIds: toSummarize.map((m) => m.id),
          summarizedAt: new Date(),
          messageCount: toSummarize.length,
          originalTokenCount: estimatedOriginalTokens,
          summarizedTokenCount: result.tokenCount,
        });
        setProgress(100);
        // Task 5.4: Transition to success state
        setState("success");
      }
    } catch (err) {
      // Don't set error if aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setError(err instanceof Error ? err : new Error(String(err)));
        // Task 5.4: Transition to error state
        setState("error");
      }
    } finally {
      // Clean up refs
      abortControllerRef.current = null;
      adapterRef.current = null;
      setStreamingText("");
    }
  }, [activeSessionId, sessions, storeSummarizedMessages]);

  const dismissPrompt = useCallback(() => {
    setIsDismissed(true);
  }, []);

  // Task 5.6: Proper abort implementation
  const cancelSummarization = useCallback(() => {
    // Abort the controller to signal cancellation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Also call adapter abort directly if available
    if (adapterRef.current) {
      adapterRef.current.abort();
    }
    setState("idle");
    setStreamingText("");
    setProgress(0);
  }, []);

  // Derive isSummarizing from state for backward compatibility
  const isSummarizing = state === "pending" || state === "summarizing";

  return {
    state,
    isSummarizing,
    progress,
    error,
    isDismissed,
    streamingText,
    messageCount,
    startSummarization,
    dismissPrompt,
    cancelSummarization,
  };
}
