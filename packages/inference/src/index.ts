/**
 * @continuum/inference
 * Inference types and adapter interface for local AI inference
 */

// Adapters
export { KalosmAdapter } from "./adapters/kalosm";
export { StubAdapter } from "./adapters/stub";
export {
  getModelMetadata,
  listModels,
  MODEL_REGISTRY,
} from "./models/registry";
// Model Registry (Story 2.2)
export type {
  ModelCapability,
  ModelLicense,
  ModelLimitation,
  ModelMetadata,
  ModelVulnerability,
} from "./models/types";
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
