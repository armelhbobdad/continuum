/**
 * @continuum/inference
 * Inference types and adapter interface for local AI inference
 */

// Adapters
export { KalosmAdapter } from "./adapters/kalosm";
export { StubAdapter } from "./adapters/stub";
// Types
export type {
  InferenceAdapter,
  InferenceCapabilities,
  InferenceError,
  InferenceErrorCode,
  InferenceFinishReason,
  InferenceRequest,
  InferenceResponse,
  InferenceStatus,
  InferenceToken,
} from "./types";
// Utilities
export { createInferenceError, INFERENCE_ERROR_MESSAGES } from "./types";
