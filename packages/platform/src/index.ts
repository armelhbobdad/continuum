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
export { useIsDesktop } from "./use-is-desktop";
