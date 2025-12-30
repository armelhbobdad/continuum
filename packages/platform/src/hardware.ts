/**
 * Hardware Capability Detection
 * Story 2.1: Hardware Capability Detection
 *
 * Detects system hardware (RAM, GPU, storage) for model recommendations.
 * Desktop: Uses Tauri commands with sysinfo crate.
 * Web: Uses navigator APIs with conservative fallbacks.
 *
 * ADR-HARDWARE-001: Memory-only store pattern (no persistence)
 * ADR-HARDWARE-002: sysinfo crate for Rust detection
 * ADR-HARDWARE-004: Conservative web fallbacks
 */

import { isDesktop } from "./capabilities";

// ============================================================================
// Types (Task 1.1-1.3)
// ============================================================================

/** GPU information (if detected) */
export interface GpuInfo {
  /** GPU name (e.g., "NVIDIA RTX 4090") */
  name: string;
  /** Video RAM in MB */
  vram: number;
  /** Whether GPU supports CUDA (NVIDIA) or Metal (Apple) */
  computeCapable: boolean;
}

/** Complete hardware capability profile */
export interface HardwareCapabilities {
  /** Available RAM in MB */
  ram: number;
  /** CPU core count */
  cpuCores: number;
  /** Available storage in MB */
  storageAvailable: number;
  /** GPU information (null if no GPU detected) */
  gpu: GpuInfo | null;
  /** Platform that detected capabilities */
  detectedBy: "desktop" | "web";
  /** Timestamp of detection */
  detectedAt: Date;
}

/** Model recommendation based on hardware */
export type ModelRecommendation =
  | "recommended"
  | "may-be-slow"
  | "not-recommended";

/** Model requirements for recommendation calculation */
export interface ModelRequirements {
  /** Minimum RAM in MB */
  ramMb: number;
  /** GPU VRAM in MB (0 if CPU-only) */
  gpuVramMb: number;
  /** Storage needed in MB */
  storageMb: number;
}

// ============================================================================
// Tauri Response Types (internal)
// ============================================================================

/** Rust SystemInfo struct from get_system_info command */
interface TauriSystemInfo {
  ram_mb: number;
  cpu_cores: number;
  storage_available_mb: number;
}

/** Rust GpuInfo struct from get_gpu_info command */
interface TauriGpuInfo {
  name: string;
  vram_mb: number;
  compute_capable: boolean;
}

// ============================================================================
// Hardware Detection (Task 1.4, Task 3)
// ============================================================================

/**
 * Get hardware capabilities for current platform.
 * Desktop: Uses Tauri commands with sysinfo crate.
 * Web: Uses navigator APIs with conservative fallbacks.
 *
 * @returns Promise<HardwareCapabilities> - Detected hardware profile
 */
// biome-ignore lint/suspicious/useAwait: Returns awaited promise from called function
export async function getHardwareCapabilities(): Promise<HardwareCapabilities> {
  if (isDesktop()) {
    return getDesktopCapabilities();
  }
  return getWebCapabilities();
}

/**
 * Get desktop hardware capabilities via Tauri commands.
 * Uses sysinfo crate for cross-platform detection.
 */
async function getDesktopCapabilities(): Promise<HardwareCapabilities> {
  // Dynamic import to avoid loading @tauri-apps/api at module load time
  // This prevents SSR/hydration issues in Next.js
  const { invoke } = await import("@tauri-apps/api/core");

  const [systemInfo, gpuInfo] = await Promise.all([
    invoke<TauriSystemInfo>("get_system_info"),
    invoke<TauriGpuInfo | null>("get_gpu_info"),
  ]);

  return {
    ram: systemInfo.ram_mb,
    cpuCores: systemInfo.cpu_cores,
    storageAvailable: systemInfo.storage_available_mb,
    gpu: gpuInfo
      ? {
          name: gpuInfo.name,
          vram: gpuInfo.vram_mb,
          computeCapable: gpuInfo.compute_capable,
        }
      : null,
    detectedBy: "desktop" as const,
    detectedAt: new Date(),
  };
}

/**
 * Get web hardware capabilities via navigator APIs.
 * Uses conservative defaults when APIs unavailable (ADR-HARDWARE-004).
 * Returns conservative defaults during SSR (navigator unavailable).
 */
async function getWebCapabilities(): Promise<HardwareCapabilities> {
  // Conservative defaults per ADR-HARDWARE-004
  let ram = 4096; // 4GB default
  let storageAvailable = 10_240; // 10GB default
  const cpuCores = 4; // Default CPU cores

  // SSR guard - return defaults if navigator is unavailable
  if (typeof navigator === "undefined") {
    return {
      ram,
      cpuCores,
      storageAvailable,
      gpu: null,
      detectedBy: "web" as const,
      detectedAt: new Date(),
    };
  }

  // Try navigator.deviceMemory (Chrome only, returns GB)
  if ("deviceMemory" in navigator) {
    const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory;
    if (typeof deviceMemory === "number") {
      ram = deviceMemory * 1024; // Convert GB to MB
    }
  }

  // Try navigator.storage.estimate()
  try {
    const estimate = await navigator.storage.estimate();
    if (estimate.quota !== undefined && estimate.usage !== undefined) {
      // Convert bytes to MB
      storageAvailable = Math.floor(
        (estimate.quota - estimate.usage) / 1024 / 1024
      );
    }
  } catch {
    // Secure context required, use default
  }

  return {
    ram,
    cpuCores: navigator.hardwareConcurrency ?? cpuCores,
    storageAvailable,
    gpu: null, // No reliable GPU detection in web
    detectedBy: "web" as const,
    detectedAt: new Date(),
  };
}

// ============================================================================
// Model Recommendation Logic (Task 1.5, Task 5)
// ============================================================================

/** FR32: 8GB RAM warning threshold in MB */
const LOW_RAM_THRESHOLD_MB = 8192;

/** FR32: Model size warning threshold for low RAM systems (6GB) */
const MODEL_WARNING_THRESHOLD_MB = 6144;

/** RAM ratio for "recommended" classification */
const RECOMMENDED_RAM_RATIO = 1.5;

/**
 * Get recommendation for a model based on hardware capabilities.
 * FR32: Warn when model >6GB on 8GB system.
 *
 * @param requirements - Model's hardware requirements
 * @param hardware - Detected hardware capabilities
 * @returns ModelRecommendation - 'recommended' | 'may-be-slow' | 'not-recommended'
 */
export function getModelRecommendation(
  requirements: ModelRequirements,
  hardware: HardwareCapabilities
): ModelRecommendation {
  const ramRatio = hardware.ram / requirements.ramMb;

  // Check storage first - can't run if not enough space
  const storageSufficient = hardware.storageAvailable >= requirements.storageMb;
  if (!storageSufficient) {
    return "not-recommended";
  }

  // Check if RAM is insufficient (ratio < 1.0)
  if (ramRatio < 1.0) {
    return "not-recommended";
  }

  // Check GPU requirements
  let gpuSufficient = true;
  if (requirements.gpuVramMb > 0) {
    gpuSufficient =
      hardware.gpu !== null && hardware.gpu.vram >= requirements.gpuVramMb;
  }

  // FR32: 8GB RAM warning for >6GB models
  const isLowRamSystem = hardware.ram <= LOW_RAM_THRESHOLD_MB;
  const modelExceedsWarningThreshold =
    requirements.ramMb > MODEL_WARNING_THRESHOLD_MB;

  // If low RAM system and model exceeds warning threshold, always warn
  if (isLowRamSystem && modelExceedsWarningThreshold) {
    return "may-be-slow";
  }

  // If GPU insufficient for GPU-requiring model, warn
  if (!gpuSufficient) {
    return "may-be-slow";
  }

  // If RAM ratio is high enough, recommend
  if (ramRatio >= RECOMMENDED_RAM_RATIO) {
    return "recommended";
  }

  // Between 1.0x and 1.5x RAM - may be slow
  return "may-be-slow";
}
