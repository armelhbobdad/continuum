/**
 * Hardware Capability Detection Tests
 * Story 2.1: Hardware Capability Detection
 * Tests for AC1-AC7
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  GpuInfo,
  HardwareCapabilities,
  ModelRequirements,
} from "../hardware";

// Desktop detection mock state
const mockInvokeResponses: Map<string, unknown> = new Map();
let invokeCallCount = 0;
const invokeCallArgs: string[] = [];

// Mock @tauri-apps/api/core module for desktop detection tests
vi.mock("@tauri-apps/api/core", () => ({
  invoke: async (cmd: string) => {
    invokeCallArgs.push(cmd);
    invokeCallCount += 1;
    return mockInvokeResponses.get(cmd) ?? null;
  },
}));

import { getHardwareCapabilities, getModelRecommendation } from "../hardware";

// Helper to create a complete StorageManager mock
function createStorageMock(
  estimateFn: () => Promise<{ quota: number; usage: number }>
): StorageManager {
  return {
    estimate: estimateFn,
    getDirectory: vi.fn().mockRejectedValue(new Error("Not implemented")),
    persist: vi.fn().mockResolvedValue(false),
    persisted: vi.fn().mockResolvedValue(false),
  };
}

// Store original values for cleanup
let originalTauri: unknown;
let originalTauriInternals: unknown;
let originalNavigator: typeof navigator;

// Mock Tauri detection
const mockTauri = (enabled: boolean) => {
  if (enabled) {
    // @ts-expect-error - mocking Tauri detection
    globalThis.__TAURI__ = { version: "2.0.0" };
    // @ts-expect-error - mocking Tauri internals
    globalThis.__TAURI_INTERNALS__ = {};
  } else {
    // @ts-expect-error - mocking Tauri detection
    globalThis.__TAURI__ = undefined;
    // @ts-expect-error - mocking Tauri internals
    globalThis.__TAURI_INTERNALS__ = undefined;
  }
};

describe("Hardware Capability Detection", () => {
  beforeEach(() => {
    // @ts-expect-error - storing original Tauri value
    originalTauri = globalThis.__TAURI__;
    // @ts-expect-error - storing original Tauri internals
    originalTauriInternals = globalThis.__TAURI_INTERNALS__;
    originalNavigator = globalThis.navigator;

    // Reset mock state
    mockInvokeResponses.clear();
    invokeCallCount = 0;
    invokeCallArgs.length = 0;
  });

  afterEach(() => {
    // Restore original values
    if (originalTauri !== undefined) {
      // @ts-expect-error - restoring Tauri value
      globalThis.__TAURI__ = originalTauri;
    } else {
      // @ts-expect-error - cleaning up
      globalThis.__TAURI__ = undefined;
    }

    if (originalTauriInternals !== undefined) {
      // @ts-expect-error - restoring Tauri internals
      globalThis.__TAURI_INTERNALS__ = originalTauriInternals;
    } else {
      // @ts-expect-error - cleaning up
      globalThis.__TAURI_INTERNALS__ = undefined;
    }

    globalThis.navigator = originalNavigator;
  });

  describe("getModelRecommendation", () => {
    const createHardware = (
      ram: number,
      gpu: GpuInfo | null = null,
      storage = 100_000
    ): HardwareCapabilities => ({
      ram,
      cpuCores: 4,
      storageAvailable: storage,
      gpu,
      detectedBy: "desktop" as const,
      detectedAt: new Date(),
    });

    describe("Recommendation Thresholds (AC4)", () => {
      it('should return "recommended" when RAM > 1.5x model requirement', () => {
        // Arrange - 16GB RAM, model needs 8GB (2x ratio)
        const hardware = createHardware(16_384);
        const requirements: ModelRequirements = {
          ramMb: 8192,
          gpuVramMb: 0,
          storageMb: 5000,
        };

        // Act
        const recommendation = getModelRecommendation(requirements, hardware);

        // Assert
        expect(recommendation).toBe("recommended");
      });

      it('should return "may-be-slow" when RAM is between 1.0x and 1.5x', () => {
        // Arrange - 12GB RAM, model needs 10GB (1.2x ratio)
        const hardware = createHardware(12_288);
        const requirements: ModelRequirements = {
          ramMb: 10_240,
          gpuVramMb: 0,
          storageMb: 5000,
        };

        // Act
        const recommendation = getModelRecommendation(requirements, hardware);

        // Assert
        expect(recommendation).toBe("may-be-slow");
      });

      it('should return "not-recommended" when RAM < model requirement', () => {
        // Arrange - 4GB RAM, model needs 8GB
        const hardware = createHardware(4096);
        const requirements: ModelRequirements = {
          ramMb: 8192,
          gpuVramMb: 0,
          storageMb: 5000,
        };

        // Act
        const recommendation = getModelRecommendation(requirements, hardware);

        // Assert
        expect(recommendation).toBe("not-recommended");
      });
    });

    describe("8GB RAM Warning Threshold - FR32 (AC5)", () => {
      it('should flag models >6GB as "may-be-slow" on 8GB system', () => {
        // Arrange - 8GB RAM, model needs 7GB (FR32 warning case)
        const hardware = createHardware(8192);
        const requirements: ModelRequirements = {
          ramMb: 7168, // 7GB
          gpuVramMb: 0,
          storageMb: 5000,
        };

        // Act
        const recommendation = getModelRecommendation(requirements, hardware);

        // Assert
        expect(recommendation).toBe("may-be-slow");
      });

      it('should allow models <=6GB as "recommended" on 8GB system', () => {
        // Arrange - 8GB RAM, model needs 4GB (fits well)
        const hardware = createHardware(8192);
        const requirements: ModelRequirements = {
          ramMb: 4096, // 4GB
          gpuVramMb: 0,
          storageMb: 5000,
        };

        // Act
        const recommendation = getModelRecommendation(requirements, hardware);

        // Assert
        expect(recommendation).toBe("recommended");
      });

      it('should flag 6GB model as "may-be-slow" on 8GB system (ratio < 1.5x)', () => {
        // Arrange - 8GB RAM, model needs exactly 6GB
        // Ratio: 8192/6144 = 1.33x (below 1.5x threshold for "recommended")
        // FR32 doesn't apply since model <= 6GB threshold
        // Result determined by ratio check: 1.0 < 1.33 < 1.5 → "may-be-slow"
        const hardware = createHardware(8192);
        const requirements: ModelRequirements = {
          ramMb: 6144, // 6GB exactly (at FR32 threshold, not exceeding)
          gpuVramMb: 0,
          storageMb: 5000,
        };

        // Act
        const recommendation = getModelRecommendation(requirements, hardware);

        // Assert - ratio 1.33x is between 1.0 and 1.5, so "may-be-slow"
        expect(recommendation).toBe("may-be-slow");
      });
    });

    describe("GPU Requirements (AC4)", () => {
      it('should return "recommended" when GPU VRAM meets requirements', () => {
        // Arrange - 16GB RAM, 24GB VRAM GPU
        const gpu: GpuInfo = {
          name: "NVIDIA RTX 4090",
          vram: 24_576,
          computeCapable: true,
        };
        const hardware = createHardware(16_384, gpu);
        const requirements: ModelRequirements = {
          ramMb: 8192,
          gpuVramMb: 12_000, // Needs 12GB VRAM
          storageMb: 5000,
        };

        // Act
        const recommendation = getModelRecommendation(requirements, hardware);

        // Assert
        expect(recommendation).toBe("recommended");
      });

      it('should return "may-be-slow" when GPU unavailable but model needs GPU', () => {
        // Arrange - no GPU, model needs VRAM
        const hardware = createHardware(16_384, null);
        const requirements: ModelRequirements = {
          ramMb: 8192,
          gpuVramMb: 8000, // Needs GPU
          storageMb: 5000,
        };

        // Act
        const recommendation = getModelRecommendation(requirements, hardware);

        // Assert
        expect(recommendation).toBe("may-be-slow");
      });

      it('should return "may-be-slow" when GPU VRAM insufficient', () => {
        // Arrange - 8GB VRAM GPU, model needs 12GB
        const gpu: GpuInfo = {
          name: "NVIDIA RTX 3070",
          vram: 8192,
          computeCapable: true,
        };
        const hardware = createHardware(16_384, gpu);
        const requirements: ModelRequirements = {
          ramMb: 8192,
          gpuVramMb: 12_000, // Needs more VRAM than available
          storageMb: 5000,
        };

        // Act
        const recommendation = getModelRecommendation(requirements, hardware);

        // Assert
        expect(recommendation).toBe("may-be-slow");
      });
    });

    describe("Storage Requirements", () => {
      it('should return "not-recommended" when storage insufficient', () => {
        // Arrange - only 2GB storage, model needs 10GB
        const hardware = createHardware(16_384, null, 2048);
        const requirements: ModelRequirements = {
          ramMb: 8192,
          gpuVramMb: 0,
          storageMb: 10_240, // Needs 10GB
        };

        // Act
        const recommendation = getModelRecommendation(requirements, hardware);

        // Assert
        expect(recommendation).toBe("not-recommended");
      });
    });

    describe("CPU-Only Inference (AC4 edge case)", () => {
      it('should return "recommended" for CPU-only model on capable system', () => {
        // Arrange - no GPU, model doesn't need GPU
        const hardware = createHardware(32_768, null); // 32GB RAM, no GPU
        const requirements: ModelRequirements = {
          ramMb: 16_384,
          gpuVramMb: 0, // CPU-only model
          storageMb: 5000,
        };

        // Act
        const recommendation = getModelRecommendation(requirements, hardware);

        // Assert
        expect(recommendation).toBe("recommended");
      });
    });
  });

  describe("getHardwareCapabilities - Web Fallback (AC7)", () => {
    beforeEach(() => {
      // Ensure we're in web mode
      mockTauri(false);
    });

    it("should use navigator.deviceMemory when available", async () => {
      // Arrange - simulate browser with deviceMemory
      globalThis.navigator = {
        deviceMemory: 8,
        hardwareConcurrency: 8,
        storage: createStorageMock(async () => ({
          quota: 1_073_741_824, // 1GB
          usage: 104_857_600, // 100MB
        })),
      } as unknown as Navigator;

      // Act
      const capabilities = await getHardwareCapabilities();

      // Assert
      expect(capabilities.ram).toBe(8192); // 8GB * 1024
      expect(capabilities.detectedBy).toBe("web");
    });

    it("should use conservative defaults when deviceMemory unavailable", async () => {
      // Arrange - simulate browser without deviceMemory
      globalThis.navigator = {
        hardwareConcurrency: 4,
        storage: createStorageMock(async () => {
          throw new Error("Not available");
        }),
      } as unknown as Navigator;

      // Act
      const capabilities = await getHardwareCapabilities();

      // Assert - conservative defaults per ADR-HARDWARE-004
      expect(capabilities.ram).toBe(4096); // 4GB default
      expect(capabilities.storageAvailable).toBe(10_240); // 10GB default
      expect(capabilities.gpu).toBeNull();
      expect(capabilities.detectedBy).toBe("web");
    });

    it("should detect hardwareConcurrency for CPU cores", async () => {
      // Arrange
      globalThis.navigator = {
        hardwareConcurrency: 16,
        storage: createStorageMock(async () => ({
          quota: 10_000_000_000,
          usage: 0,
        })),
      } as unknown as Navigator;

      // Act
      const capabilities = await getHardwareCapabilities();

      // Assert
      expect(capabilities.cpuCores).toBe(16);
    });

    it("should calculate available storage from quota and usage", async () => {
      // Arrange
      globalThis.navigator = {
        hardwareConcurrency: 4,
        storage: createStorageMock(async () => ({
          quota: 10_737_418_240, // 10GB in bytes
          usage: 1_073_741_824, // 1GB in bytes
        })),
      } as unknown as Navigator;

      // Act
      const capabilities = await getHardwareCapabilities();

      // Assert - should have 9GB available (10GB - 1GB)
      expect(capabilities.storageAvailable).toBe(9216); // 9GB in MB
    });

    it("should use storage default when estimate fails", async () => {
      // Arrange
      globalThis.navigator = {
        hardwareConcurrency: 4,
        storage: createStorageMock(async () => {
          throw new Error("Secure context required");
        }),
      } as unknown as Navigator;

      // Act
      const capabilities = await getHardwareCapabilities();

      // Assert
      expect(capabilities.storageAvailable).toBe(10_240); // 10GB default
    });

    it("should return null for GPU in web mode", async () => {
      // Arrange
      globalThis.navigator = {
        hardwareConcurrency: 4,
        storage: createStorageMock(async () => ({
          quota: 10_000_000_000,
          usage: 0,
        })),
      } as unknown as Navigator;

      // Act
      const capabilities = await getHardwareCapabilities();

      // Assert - no reliable GPU detection in web
      expect(capabilities.gpu).toBeNull();
    });

    it("should include detection timestamp", async () => {
      // Arrange
      globalThis.navigator = {
        hardwareConcurrency: 4,
        storage: createStorageMock(async () => ({
          quota: 10_000_000_000,
          usage: 0,
        })),
      } as unknown as Navigator;

      const before = new Date();

      // Act
      const capabilities = await getHardwareCapabilities();

      const after = new Date();

      // Assert
      expect(capabilities.detectedAt).toBeInstanceOf(Date);
      expect(capabilities.detectedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(capabilities.detectedAt.getTime()).toBeLessThanOrEqual(
        after.getTime()
      );
    });
  });

  describe("getHardwareCapabilities - Desktop Detection (AC1, AC2, AC3)", () => {
    beforeEach(() => {
      // Enable Tauri detection
      mockTauri(true);
      // Reset mock state
      mockInvokeResponses.clear();
      invokeCallCount = 0;
      invokeCallArgs.length = 0;
    });

    it("should detect desktop hardware via Tauri commands (AC1, AC3)", async () => {
      // Arrange - mock Tauri invoke responses
      mockInvokeResponses.set("get_system_info", {
        ram_mb: 16_384,
        cpu_cores: 8,
        storage_available_mb: 512_000,
      });
      mockInvokeResponses.set("get_gpu_info", {
        name: "NVIDIA RTX 4090",
        vram_mb: 24_576,
        compute_capable: true,
      });

      // Act
      const capabilities = await getHardwareCapabilities();

      // Assert
      expect(capabilities.ram).toBe(16_384);
      expect(capabilities.cpuCores).toBe(8);
      expect(capabilities.storageAvailable).toBe(512_000);
      expect(capabilities.detectedBy).toBe("desktop");
      expect(invokeCallArgs).toContain("get_system_info");
      expect(invokeCallArgs).toContain("get_gpu_info");
    });

    it("should detect GPU via Tauri command (AC2)", async () => {
      // Arrange
      mockInvokeResponses.set("get_system_info", {
        ram_mb: 32_768,
        cpu_cores: 16,
        storage_available_mb: 1_000_000,
      });
      mockInvokeResponses.set("get_gpu_info", {
        name: "NVIDIA RTX 4090",
        vram_mb: 24_576,
        compute_capable: true,
      });

      // Act
      const capabilities = await getHardwareCapabilities();

      // Assert
      expect(capabilities.gpu).not.toBeNull();
      expect(capabilities.gpu?.name).toBe("NVIDIA RTX 4090");
      expect(capabilities.gpu?.vram).toBe(24_576);
      expect(capabilities.gpu?.computeCapable).toBe(true);
    });

    it("should handle no GPU gracefully (AC2 fallback)", async () => {
      // Arrange - nvidia-smi not available or no GPU
      mockInvokeResponses.set("get_system_info", {
        ram_mb: 8192,
        cpu_cores: 4,
        storage_available_mb: 256_000,
      });
      mockInvokeResponses.set("get_gpu_info", null);

      // Act
      const capabilities = await getHardwareCapabilities();

      // Assert
      expect(capabilities.gpu).toBeNull();
      expect(capabilities.ram).toBe(8192);
    });

    it("should detect storage via Tauri command (AC3)", async () => {
      // Arrange
      mockInvokeResponses.set("get_system_info", {
        ram_mb: 16_384,
        cpu_cores: 8,
        storage_available_mb: 2_000_000, // 2TB available
      });
      mockInvokeResponses.set("get_gpu_info", null);

      // Act
      const capabilities = await getHardwareCapabilities();

      // Assert
      expect(capabilities.storageAvailable).toBe(2_000_000);
    });

    it("should call both Tauri commands in parallel", async () => {
      // Arrange
      mockInvokeResponses.set("get_system_info", {
        ram_mb: 16_384,
        cpu_cores: 8,
        storage_available_mb: 512_000,
      });
      mockInvokeResponses.set("get_gpu_info", null);

      // Act
      await getHardwareCapabilities();

      // Assert - both commands should be called
      expect(invokeCallCount).toBe(2);
    });
  });
});
