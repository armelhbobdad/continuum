/**
 * Summarization Service
 *
 * Story 3.5: Auto-Summarization & Context Management
 * Task 2: Create Summarization Service
 *
 * Provides message summarization using the inference adapter,
 * with streaming token output and error handling.
 *
 * AC #2: Summarization condenses older messages
 * AC #5: Original messages are preserved (handled by caller)
 * AC #6: Summarization works with privacy modes (uses local inference)
 */

import type { InferenceAdapter, InferenceRequest } from "@continuum/inference";
import type { Message } from "@/stores/session";

/**
 * Result from message selection algorithm
 */
export interface MessageSelectionResult {
  /** Messages to summarize (oldest) */
  toSummarize: Message[];
  /** Messages to keep as-is (newest) */
  toKeep: Message[];
}

/**
 * Options for summarization
 */
export interface SummarizeOptions {
  /** Maximum tokens for summary generation */
  maxTokens?: number;
  /** Temperature for generation (0-1, lower = more focused) */
  temperature?: number;
}

/**
 * Result from summarization generator
 */
export interface SummarizationResult {
  /** Final summary text */
  summary: string;
  /** Number of tokens generated */
  tokenCount: number;
  /** Duration of generation in ms */
  durationMs: number;
}

/**
 * Error thrown during summarization
 */
export class SummarizationError extends Error {
  name = "SummarizationError";
  details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown>) {
    super(message);
    this.details = details;
  }
}

/**
 * Select which messages to summarize based on target percentage.
 *
 * Strategy: Keep minimum recent messages, summarize oldest N% of remaining.
 * This ensures conversation continuity while reducing context size.
 *
 * @param messages - All messages in session
 * @param targetPercentage - Fraction of messages to summarize (0-1)
 * @param minKeep - Minimum number of recent messages to keep
 * @returns Messages split into toSummarize and toKeep arrays
 */
export function selectMessagesForSummarization(
  messages: Message[],
  targetPercentage: number,
  minKeep: number
): MessageSelectionResult {
  // Handle edge cases
  if (messages.length === 0) {
    return { toSummarize: [], toKeep: [] };
  }

  if (messages.length <= minKeep) {
    return { toSummarize: [], toKeep: messages };
  }

  // Calculate how many to summarize
  const targetCount = Math.floor(messages.length * targetPercentage);

  // Ensure we keep at least minKeep
  const maxToSummarize = messages.length - minKeep;
  const summarizeCount = Math.min(targetCount, maxToSummarize);

  if (summarizeCount <= 0) {
    return { toSummarize: [], toKeep: messages };
  }

  // Split: oldest N messages go to summarize, rest kept
  const toSummarize = messages.slice(0, summarizeCount);
  const toKeep = messages.slice(summarizeCount);

  return { toSummarize, toKeep };
}

/**
 * Format messages for the summarization prompt.
 * Includes role labels and content for context preservation.
 */
function formatMessagesForPrompt(messages: Message[]): string {
  return messages
    .map((m) => {
      const role = m.role === "user" ? "User" : "Assistant";
      return `${role}: ${m.content}`;
    })
    .join("\n\n");
}

/**
 * Summarization prompt template.
 * Optimized for context preservation while reducing token count.
 */
const SUMMARIZATION_PROMPT = `You are a conversation summarizer. Create a concise summary of the following conversation that preserves:
- Key topics discussed
- Important decisions or conclusions
- Essential context for continuing the conversation

Write the summary in a clear, narrative style. Be concise but comprehensive.

Conversation:
`;

/**
 * Summarize messages using the inference adapter.
 *
 * Returns an async generator that yields tokens as they're generated.
 * The final value (when done=true) is the complete SummarizationResult.
 *
 * @param messages - Messages to summarize
 * @param adapter - Inference adapter to use
 * @param options - Optional generation parameters
 * @yields Individual tokens during generation
 * @returns SummarizationResult with final summary and metrics
 * @throws SummarizationError if generation fails
 */
export async function* summarizeMessages(
  messages: Message[],
  adapter: InferenceAdapter,
  options: SummarizeOptions = {}
): AsyncGenerator<string, SummarizationResult, undefined> {
  const startTime = performance.now();
  const formattedMessages = formatMessagesForPrompt(messages);
  const prompt = `${SUMMARIZATION_PROMPT}${formattedMessages}\n\nSummary:`;

  const request: InferenceRequest = {
    prompt,
    maxTokens: options.maxTokens ?? 256,
    temperature: options.temperature ?? 0.7,
  };

  let summary = "";
  let tokenCount = 0;

  try {
    const generator = adapter.generate(request);

    for await (const token of generator) {
      summary += token.text;
      tokenCount++;
      yield token.text;
    }

    const durationMs = performance.now() - startTime;

    return {
      summary,
      tokenCount,
      durationMs,
    };
  } catch (error) {
    throw new SummarizationError(
      error instanceof Error ? error.message : "Summarization failed",
      {
        messagesCount: messages.length,
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }
}
