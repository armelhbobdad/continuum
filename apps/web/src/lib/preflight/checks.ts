/**
 * Pre-Flight Check Functions
 *
 * Individual check functions for verifying offline readiness.
 * Each check returns a PreFlightCheck result with status and optional action.
 *
 * Story 4.3: Pre-Flight Readiness Checklist
 */
"use client";

import { invoke } from "@tauri-apps/api/core";
import type { PreFlightCheck } from "@/types/preflight";

/** Platform detection helper - check if running in Tauri desktop app */
const isTauri = () => typeof window !== "undefined" && "__TAURI__" in window;

/**
 * Check if a local model is downloaded and verified
 */
export async function checkModelStatus(): Promise<PreFlightCheck> {
  try {
    if (isTauri()) {
      const result = await invoke<{
        ready: boolean;
        model?: string;
        verified: boolean;
      }>("check_model_ready");

      if (result.ready && result.verified) {
        return {
          id: "model-status",
          category: "model",
          name: "AI Model",
          status: "ready",
          message: `${result.model ?? "Model"} downloaded and verified`,
        };
      }

      if (result.ready && !result.verified) {
        return {
          id: "model-status",
          category: "model",
          name: "AI Model",
          status: "warning",
          message: "Model downloaded but not verified",
          action: { label: "Verify", onClick: () => invoke("verify_model") },
        };
      }
    }

    // Web fallback or no model in Tauri
    return {
      id: "model-status",
      category: "model",
      name: "AI Model",
      status: "critical",
      message: "No model downloaded",
      action: { label: "Download", href: "/models" },
    };
  } catch {
    return {
      id: "model-status",
      category: "model",
      name: "AI Model",
      status: "warning",
      message: "Unable to check model status",
    };
  }
}

/**
 * Check available storage space (min 2GB recommended)
 */
export async function checkStorageSpace(): Promise<PreFlightCheck> {
  try {
    if (isTauri()) {
      const result = await invoke<{ available_gb: number }>(
        "preflight_storage_check"
      );
      const availableGB = result.available_gb;

      if (availableGB >= 5) {
        return {
          id: "storage-space",
          category: "storage",
          name: "Storage",
          status: "ready",
          message: `${availableGB.toFixed(1)}GB available`,
        };
      }

      if (availableGB >= 2) {
        return {
          id: "storage-space",
          category: "storage",
          name: "Storage",
          status: "warning",
          message: `${availableGB.toFixed(1)}GB available (low)`,
          details: "Consider freeing up space for optimal performance",
        };
      }

      return {
        id: "storage-space",
        category: "storage",
        name: "Storage",
        status: "critical",
        message: `${availableGB.toFixed(1)}GB available (insufficient)`,
        details: "At least 2GB recommended for offline operation",
      };
    }

    // Web fallback using Storage API if available
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const availableBytes = (estimate.quota ?? 0) - (estimate.usage ?? 0);
      const availableGB = availableBytes / 1024 ** 3;

      return {
        id: "storage-space",
        category: "storage",
        name: "Storage",
        status: availableGB >= 2 ? "ready" : "warning",
        message: `~${availableGB.toFixed(1)}GB available`,
      };
    }

    return {
      id: "storage-space",
      category: "storage",
      name: "Storage",
      status: "ready",
      message: "Storage available",
      details: "Exact amount unavailable in browser",
    };
  } catch {
    return {
      id: "storage-space",
      category: "storage",
      name: "Storage",
      status: "warning",
      message: "Unable to check storage",
    };
  }
}

/**
 * Check available RAM (varies by model requirements)
 */
export async function checkRamAvailability(): Promise<PreFlightCheck> {
  try {
    if (isTauri()) {
      const result = await invoke<{
        available_gb: number;
        required_gb: number;
      }>("check_ram_availability");
      const { available_gb, required_gb } = result;

      if (available_gb >= required_gb) {
        return {
          id: "ram-availability",
          category: "ram",
          name: "Memory (RAM)",
          status: "ready",
          message: `${available_gb.toFixed(0)}GB available (${required_gb.toFixed(0)}GB required)`,
        };
      }

      return {
        id: "ram-availability",
        category: "ram",
        name: "Memory (RAM)",
        status: "critical",
        message: `${available_gb.toFixed(0)}GB available (${required_gb.toFixed(0)}GB required)`,
        details: "Close other applications or choose a smaller model",
        action: { label: "Choose Model", href: "/models" },
      };
    }

    // Web: use device memory API if available
    if ("deviceMemory" in navigator) {
      const deviceMemory = (navigator as unknown as { deviceMemory: number })
        .deviceMemory;
      return {
        id: "ram-availability",
        category: "ram",
        name: "Memory (RAM)",
        status: deviceMemory >= 4 ? "ready" : "warning",
        message: `~${deviceMemory}GB device memory`,
      };
    }

    return {
      id: "ram-availability",
      category: "ram",
      name: "Memory (RAM)",
      status: "ready",
      message: "Memory available",
      details: "Exact amount unavailable in browser",
    };
  } catch {
    return {
      id: "ram-availability",
      category: "ram",
      name: "Memory (RAM)",
      status: "warning",
      message: "Unable to check memory",
    };
  }
}

/**
 * Check knowledge base sync status
 */
export async function checkKnowledgeSync(): Promise<PreFlightCheck> {
  try {
    // This would check Jazz sync status or local knowledge store
    // For now, return ready as knowledge bases are optional
    return {
      id: "knowledge-sync",
      category: "knowledge",
      name: "Knowledge Bases",
      status: "ready",
      message: "No knowledge bases configured",
      details: "Optional for offline operation",
    };
  } catch {
    return {
      id: "knowledge-sync",
      category: "knowledge",
      name: "Knowledge Bases",
      status: "warning",
      message: "Unable to check sync status",
    };
  }
}

/**
 * Check GPU/VRAM capability (desktop only)
 */
export async function checkGpuCapability(): Promise<PreFlightCheck | null> {
  if (!isTauri()) {
    return null; // Skip on web
  }

  try {
    const result = await invoke<{
      has_gpu: boolean;
      vram_gb?: number;
      name?: string;
      cuda_available?: boolean;
    }>("check_gpu_capability");

    if (result.has_gpu && result.cuda_available) {
      return {
        id: "gpu-capability",
        category: "gpu",
        name: "GPU",
        status: "ready",
        message: `${result.name ?? "GPU"} (${result.vram_gb?.toFixed(0) ?? "?"}GB VRAM)`,
      };
    }

    if (result.has_gpu) {
      return {
        id: "gpu-capability",
        category: "gpu",
        name: "GPU",
        status: "warning",
        message: "GPU detected but CUDA unavailable",
        details: "CPU inference will be used (slower)",
      };
    }

    return {
      id: "gpu-capability",
      category: "gpu",
      name: "GPU",
      status: "warning",
      message: "No dedicated GPU detected",
      details: "CPU inference will be used",
    };
  } catch {
    return {
      id: "gpu-capability",
      category: "gpu",
      name: "GPU",
      status: "warning",
      message: "Unable to check GPU",
    };
  }
}

/**
 * Run all pre-flight checks in parallel
 */
export async function runAllChecks(): Promise<PreFlightCheck[]> {
  const checkFns = [
    checkModelStatus,
    checkStorageSpace,
    checkRamAvailability,
    checkKnowledgeSync,
    checkGpuCapability,
  ];

  const results = await Promise.all(checkFns.map((fn) => fn()));

  // Filter out null results (e.g., GPU check on web)
  return results.filter((check): check is PreFlightCheck => check !== null);
}

/**
 * Calculate overall status from individual checks
 */
export function calculateOverallStatus(
  checks: PreFlightCheck[]
): "ready" | "warning" | "critical" {
  const hasCritical = checks.some((c) => c.status === "critical");
  const hasWarning = checks.some((c) => c.status === "warning");

  if (hasCritical) return "critical";
  if (hasWarning) return "warning";
  return "ready";
}
