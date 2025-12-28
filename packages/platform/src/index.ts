/**
 * @continuum/platform
 * Platform detection and capability checking for Continuum
 */

export type { PlatformCapabilities, PlatformType } from "./capabilities";
export {
  getPlatform,
  hasLocalInferenceCapability,
  hasWebGPU,
  isDesktop,
} from "./capabilities";
// Download management (Story 2.3)
export type { DownloadProgressCallback } from "./downloads";
export {
  cancelModelDownload,
  checkStorageSpace,
  deleteModel,
  getModelPath,
  getPartialDownloadSize,
  isOnline,
  pauseModelDownload,
  resumeModelDownload,
  startModelDownload,
  subscribeToDownloadProgress,
  subscribeToNetworkStatus,
} from "./downloads";
// Hardware capability detection (Story 2.1)
export type {
  GpuInfo,
  HardwareCapabilities,
  ModelRecommendation,
  ModelRequirements,
} from "./hardware";
export { getHardwareCapabilities, getModelRecommendation } from "./hardware";
export { useIsDesktop } from "./use-is-desktop";
