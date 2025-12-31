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
import type { InferenceAdapter } from "@continuum/inference";
import { useCallback, useRef, useState } from "react";
import {
  selectMessagesForSummarization,
  summarizeMessages,
} from "@/lib/context/summarize";
import { getInferenceAdapterAsync } from "@/lib/inference/get-adapter";
import type { Message, Session } from "@/stores/session";
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
 * Result from consuming the summarization generator
 */
interface GeneratorResult {
  aborted: boolean;
  result: {
    summary: string;
    tokenCount: number;
    durationMs: number;
  } | null;
}

/**
 * Consume the summarization generator with abort handling.
 */
async function consumeGenerator(
  generator: AsyncGenerator<
    string,
    { summary: string; tokenCount: number; durationMs: number }
  >,
  signal: AbortSignal,
  adapter: InferenceAdapter,
  onToken: (text: string, tokensReceived: number) => void
): Promise<GeneratorResult> {
  let tokensReceived = 0;
  let currentText = "";

  while (true) {
    if (signal.aborted) {
      await adapter.abort();
      return { aborted: true, result: null };
    }

    const { value, done } = await generator.next();

    if (done) {
      return { aborted: false, result: value };
    }

    currentText += value;
    tokensReceived++;
    onToken(currentText, tokensReceived);
  }
}

/**
 * Estimate token count for messages (~4 chars per token)
 */
function estimateTokenCount(messages: Message[]): number {
  return messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
}

/**
 * Get the active session if valid for summarization
 */
function getValidSession(
  sessions: Session[],
  activeSessionId: string | null
): Session | null {
  if (!activeSessionId) {
    return null;
  }
  const session = sessions.find((s) => s.id === activeSessionId);
  if (!session || session.messages.length < MIN_KEEP_MESSAGES) {
    return null;
  }
  return session;
}

/**
 * Get messages to summarize from a session
 */
function getMessagesToSummarize(messages: Message[]): Message[] {
  const { toSummarize } = selectMessagesForSummarization(
    messages,
    DEFAULT_SUMMARIZE_PERCENTAGE,
    MIN_KEEP_MESSAGES
  );
  return toSummarize;
}

/**
 * Execute the summarization process
 */
async function executeSummarization(
  toSummarize: Message[],
  signal: AbortSignal,
  onToken: (text: string, tokens: number) => void,
  callbacks: {
    setMessageCount: (count: number) => void;
    setState: (state: SummarizationState) => void;
    setAdapterRef: (adapter: InferenceAdapter) => void;
    resetState: () => void;
    storeResult: (
      summary: string,
      toSummarize: Message[],
      originalTokens: number,
      summaryTokens: number
    ) => void;
  }
): Promise<void> {
  const adapter = await getInferenceAdapterAsync();
  callbacks.setAdapterRef(adapter);

  if (signal.aborted) {
    callbacks.resetState();
    return;
  }

  callbacks.setMessageCount(toSummarize.length);
  const estimatedOriginalTokens = estimateTokenCount(toSummarize);
  callbacks.setState("summarizing");

  const generator = summarizeMessages(toSummarize, adapter);
  const { aborted, result } = await consumeGenerator(
    generator,
    signal,
    adapter,
    onToken
  );

  if (aborted) {
    callbacks.resetState();
    return;
  }

  if (result) {
    callbacks.storeResult(
      result.summary,
      toSummarize,
      estimatedOriginalTokens,
      result.tokenCount
    );
  }
}

/**
 * Hook to manage summarization state and trigger summarization.
 *
 * @returns Summarization state and control functions
 */
export function useSummarization(): UseSummarizationResult {
  const [state, setState] = useState<SummarizationState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [messageCount, setMessageCount] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const adapterRef = useRef<Awaited<
    ReturnType<typeof getInferenceAdapterAsync>
  > | null>(null);

  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const sessions = useSessionStore((s) => s.sessions);
  const storeSummarizedMessages = useSessionStore(
    (s) => s.storeSummarizedMessages
  );

  const resetState = useCallback(() => {
    setState("idle");
    setStreamingText("");
    setProgress(0);
  }, []);

  const handleTokenUpdate = useCallback((text: string, tokens: number) => {
    setStreamingText(text);
    setProgress(Math.min(90, (tokens / 50) * 100));
  }, []);

  const startSummarization = useCallback(async () => {
    const activeSession = getValidSession(sessions, activeSessionId);
    if (!(activeSession && activeSessionId)) {
      return;
    }

    const toSummarize = getMessagesToSummarize(activeSession.messages);
    if (toSummarize.length === 0) {
      return;
    }

    setState("pending");
    setProgress(0);
    setError(null);
    setStreamingText("");

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      await executeSummarization(toSummarize, signal, handleTokenUpdate, {
        setMessageCount,
        setState,
        setAdapterRef: (adapter) => {
          adapterRef.current = adapter;
        },
        resetState,
        storeResult: (summary, messages, originalTokens, summaryTokens) => {
          storeSummarizedMessages(activeSessionId, summary, messages, {
            originalMessageIds: messages.map((m) => m.id),
            summarizedAt: new Date(),
            messageCount: messages.length,
            originalTokenCount: originalTokens,
            summarizedTokenCount: summaryTokens,
          });
          setProgress(100);
          setState("success");
        },
      });
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setState("error");
      }
    } finally {
      abortControllerRef.current = null;
      adapterRef.current = null;
      setStreamingText("");
    }
  }, [
    activeSessionId,
    sessions,
    storeSummarizedMessages,
    resetState,
    handleTokenUpdate,
  ]);

  const dismissPrompt = useCallback(() => {
    setIsDismissed(true);
  }, []);

  const cancelSummarization = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (adapterRef.current) {
      adapterRef.current.abort();
    }
    resetState();
  }, [resetState]);

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
