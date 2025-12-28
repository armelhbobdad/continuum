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
// Hardware capability detection (Story 2.1)
export type {
  GpuInfo,
  HardwareCapabilities,
  ModelRecommendation,
  ModelRequirements,
} from "./hardware";
export { getHardwareCapabilities, getModelRecommendation } from "./hardware";
export { useIsDesktop } from "./use-is-desktop";
