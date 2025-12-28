/**
 * @continuum/inference
 * Inference types and adapter interface for local AI inference
 */

// Adapters
export { KalosmAdapter } from "./adapters/kalosm";
export { StubAdapter } from "./adapters/stub";

// Download Types (Story 2.3)
export type {
  DownloadError,
  DownloadErrorCode,
  DownloadProgress,
  DownloadRequest,
  DownloadStatus,
  StorageCheckResult,
} from "./downloads/types";
export {
  calculateProgressPercent,
  createDownloadError,
  DOWNLOAD_ERROR_MESSAGES,
  formatBytes,
  formatEta,
  formatSpeed,
} from "./downloads/types";
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
