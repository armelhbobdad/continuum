/**
 * Inference Types Package
 * Defines interfaces and types for the inference adapter pattern.
 * AC: All - Foundation for local inference integration
 */

/** Token emitted during streaming generation */
export interface InferenceToken {
  text: string;
  logprob?: number;
}

/** Request parameters for text generation */
export interface InferenceRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

/** Finish reasons for generation */
export type InferenceFinishReason =
  | "completed"
  | "aborted"
  | "max_tokens"
  | "stop_sequence"
  | "error";

/** Response from completed generation */
export interface InferenceResponse {
  text: string;
  tokensGenerated: number;
  finishReason: InferenceFinishReason;
}

/** Error codes for inference failures - mapped to user-friendly messages */
export type InferenceErrorCode =
  | "MODEL_NOT_FOUND"
  | "OOM_ERROR"
  | "INFERENCE_TIMEOUT"
  | "GENERATION_ABORTED"
  | "MODEL_LOAD_FAILED"
  | "UNKNOWN_ERROR";

/**
 * Inference error with user-friendly message
 * Per project-context.md: UserError pattern with userMessage and technicalDetails
 */
export interface InferenceError {
  code: InferenceErrorCode;
  userMessage: string;
  technicalDetails?: Record<string, unknown>;
}

/** Model status states */
export type InferenceStatus =
  | "unloaded"
  | "loading"
  | "loaded"
  | "generating"
  | "error";

/** Adapter capabilities for UI adaptation */
export interface InferenceCapabilities {
  supportsStreaming: boolean;
  supportsAbort: boolean;
  maxContextLength: number;
  modelName: string;
}

/**
 * Core inference adapter interface
 * Implemented by platform-specific adapters (Kalosm for desktop, WebLLM for web)
 *
 * ADR-INF-001: Use adapter pattern with platform-specific implementations
 * Source: architecture/core-architectural-decisions.md - Platform Abstraction
 */
export interface InferenceAdapter {
  /**
   * Generate tokens from prompt. Returns async iterator for streaming.
   * AC2: Warm model latency - first token within 2 seconds
   * AC5: Generation rate >= 10 tokens/second
   */
  generate(request: InferenceRequest): AsyncIterable<InferenceToken>;

  /**
   * Abort ongoing generation. Safe to call if not generating.
   * AC4: Inference stops immediately on abort
   */
  abort(): Promise<void>;

  /**
   * Check if model is loaded and ready.
   * Used to determine if cold start is needed (AC3)
   */
  isModelLoaded(): Promise<boolean>;

  /**
   * Load model if not already loaded.
   * AC3: Model loads within 10 seconds
   *
   * Story 2.4: Accepts optional modelId for loading specific models.
   * Desktop uses modelId to load from app_data_dir/models/{modelId}.gguf
   *
   * @param modelId - Optional model identifier to load
   */
  loadModel(modelId?: string): Promise<void>;

  /**
   * Get adapter capabilities for UI adaptation.
   * Enables feature detection for streaming, abort support, etc.
   */
  getCapabilities(): InferenceCapabilities;

  /**
   * Get current inference status for UI state management.
   * Used to show loading indicators and generation state.
   */
  getStatus(): InferenceStatus;
}

/**
 * Error message mapping for user-friendly display
 * AC6: User-friendly error messages with recovery suggestions
 * Source: story Dev Notes - Error Mapping section
 */
export const INFERENCE_ERROR_MESSAGES: Record<
  InferenceErrorCode,
  { userMessage: string; recoveryHint: string }
> = {
  MODEL_NOT_FOUND: {
    userMessage: "Model not available. Try downloading it first.",
    recoveryHint: "Go to Models > Models to download a model.",
  },
  OOM_ERROR: {
    userMessage: "Not enough memory for this model. Try a smaller model.",
    recoveryHint: "Close other applications or switch to a smaller model.",
  },
  INFERENCE_TIMEOUT: {
    userMessage: "Response took too long. Try a shorter prompt.",
    recoveryHint: "Retry with a simpler question or shorter context.",
  },
  GENERATION_ABORTED: {
    userMessage: "Generation stopped.",
    recoveryHint: "You can continue the conversation or start a new one.",
  },
  MODEL_LOAD_FAILED: {
    userMessage: "Couldn't load the model. Please restart and try again.",
    recoveryHint:
      "Check if the model file is corrupted and re-download if needed.",
  },
  UNKNOWN_ERROR: {
    userMessage: "Something went wrong. Please try again.",
    recoveryHint: "If this persists, check the logs for more details.",
  },
};

/**
 * Create a typed inference error with user-friendly message
 */
export function createInferenceError(
  code: InferenceErrorCode,
  technicalDetails?: Record<string, unknown>
): InferenceError {
  const { userMessage } = INFERENCE_ERROR_MESSAGES[code];
  return {
    code,
    userMessage,
    technicalDetails,
  };
}

// ============================================================================
// Story 2.5: Model Integrity Verification Types
// ============================================================================

/** Result from Rust verification command */
export interface VerificationResult {
  verified: boolean;
  computedHash: string;
  expectedHash: string;
  fileSize: number;
}

/** Verification status stored in model store */
export interface VerificationInfo {
  verified: boolean;
  timestamp: number; // Unix timestamp for JSON serialization
  hash: string;
}

/** Verification status for UI display */
export type VerificationStatus =
  | "verified"
  | "unverified"
  | "failed"
  | "verifying";

/** Quarantined file information from Rust backend */
export interface QuarantinedFile {
  id: string;
  modelId: string;
  timestamp: string;
  expectedHash: string;
  actualHash: string;
  filePath: string;
  fileSizeMb: number;
}
