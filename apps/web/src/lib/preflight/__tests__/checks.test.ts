/**
 * Pre-Flight Check Functions Tests
 *
 * Tests for individual check functions and the runAllChecks aggregator.
 * Covers Tauri (desktop) and web fallback scenarios.
 *
 * Story 4.3: Pre-Flight Readiness Checklist
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("Pre-Flight Checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Default to non-Tauri (web) environment
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("checkModelStatus", () => {
    it("returns ready when model is downloaded and verified in Tauri", async () => {
      // Mock Tauri environment
      vi.stubGlobal("window", { __TAURI__: true });

      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue({
        ready: true,
        model: "Phi-4",
        verified: true,
      });

      const { checkModelStatus } = await import("../checks");
      const result = await checkModelStatus();

      expect(result.status).toBe("ready");
      expect(result.message).toContain("Phi-4");
      expect(result.message).toContain("verified");
      expect(result.category).toBe("model");
    });

    it("returns warning when model downloaded but not verified", async () => {
      vi.stubGlobal("window", { __TAURI__: true });

      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue({
        ready: true,
        model: "Phi-4",
        verified: false,
      });

      const { checkModelStatus } = await import("../checks");
      const result = await checkModelStatus();

      expect(result.status).toBe("warning");
      expect(result.message).toContain("not verified");
      expect(result.action).toBeDefined();
      expect(result.action?.label).toBe("Verify");
    });

    it("returns critical when no model downloaded in web", async () => {
      const { checkModelStatus } = await import("../checks");
      const result = await checkModelStatus();

      expect(result.status).toBe("critical");
      expect(result.message).toContain("No model");
      expect(result.action?.label).toBe("Download");
      expect(result.action?.href).toBe("/models");
    });

    it("returns warning when Tauri invoke fails", async () => {
      vi.stubGlobal("window", { __TAURI__: true });

      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockRejectedValue(new Error("Command not found"));

      const { checkModelStatus } = await import("../checks");
      const result = await checkModelStatus();

      expect(result.status).toBe("warning");
      expect(result.message).toContain("Unable to check");
    });
  });

  describe("checkStorageSpace", () => {
    it("returns ready when storage >= 5GB in Tauri", async () => {
      vi.stubGlobal("window", { __TAURI__: true });

      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue({ available_gb: 10.5 });

      const { checkStorageSpace } = await import("../checks");
      const result = await checkStorageSpace();

      expect(result.status).toBe("ready");
      expect(result.message).toContain("10.5");
      expect(result.message).toContain("GB");
    });

    it("returns warning when storage 2-5GB", async () => {
      vi.stubGlobal("window", { __TAURI__: true });

      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue({ available_gb: 3.2 });

      const { checkStorageSpace } = await import("../checks");
      const result = await checkStorageSpace();

      expect(result.status).toBe("warning");
      expect(result.message).toContain("3.2");
      expect(result.details).toContain("freeing up space");
    });

    it("returns critical when storage < 2GB", async () => {
      vi.stubGlobal("window", { __TAURI__: true });

      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue({ available_gb: 1.5 });

      const { checkStorageSpace } = await import("../checks");
      const result = await checkStorageSpace();

      expect(result.status).toBe("critical");
      expect(result.message).toContain("insufficient");
      expect(result.details).toContain("2GB");
    });

    it("uses Storage API fallback in web with estimate", async () => {
      const mockEstimate = vi.fn().mockResolvedValue({
        quota: 10 * 1024 ** 3, // 10GB quota
        usage: 2 * 1024 ** 3, // 2GB used
      });

      vi.stubGlobal("window", {});
      vi.stubGlobal("navigator", {
        storage: { estimate: mockEstimate },
      });

      const { checkStorageSpace } = await import("../checks");
      const result = await checkStorageSpace();

      expect(result.status).toBe("ready");
      expect(result.message).toContain("GB");
    });

    it("returns ready with generic message when no Storage API", async () => {
      vi.stubGlobal("navigator", {});

      const { checkStorageSpace } = await import("../checks");
      const result = await checkStorageSpace();

      expect(result.status).toBe("ready");
      expect(result.message).toBe("Storage available");
      expect(result.details).toContain("unavailable");
    });
  });

  describe("checkRamAvailability", () => {
    it("returns ready when RAM meets requirements in Tauri", async () => {
      vi.stubGlobal("window", { __TAURI__: true });

      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue({
        available_gb: 16,
        required_gb: 6,
      });

      const { checkRamAvailability } = await import("../checks");
      const result = await checkRamAvailability();

      expect(result.status).toBe("ready");
      expect(result.message).toContain("16");
      expect(result.message).toContain("6");
    });

    it("returns critical when RAM insufficient", async () => {
      vi.stubGlobal("window", { __TAURI__: true });

      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue({
        available_gb: 4,
        required_gb: 8,
      });

      const { checkRamAvailability } = await import("../checks");
      const result = await checkRamAvailability();

      expect(result.status).toBe("critical");
      expect(result.action?.label).toBe("Choose Model");
      expect(result.action?.href).toBe("/models");
    });

    it("uses device memory API in web when available", async () => {
      vi.stubGlobal("navigator", { deviceMemory: 8 });

      const { checkRamAvailability } = await import("../checks");
      const result = await checkRamAvailability();

      expect(result.status).toBe("ready");
      expect(result.message).toContain("8");
    });

    it("returns warning for low device memory", async () => {
      vi.stubGlobal("navigator", { deviceMemory: 2 });

      const { checkRamAvailability } = await import("../checks");
      const result = await checkRamAvailability();

      expect(result.status).toBe("warning");
    });
  });

  describe("checkKnowledgeSync", () => {
    it("returns ready with no knowledge bases configured", async () => {
      const { checkKnowledgeSync } = await import("../checks");
      const result = await checkKnowledgeSync();

      expect(result.status).toBe("ready");
      expect(result.message).toContain("No knowledge bases");
      expect(result.details).toContain("Optional");
    });
  });

  describe("checkGpuCapability", () => {
    it("returns null in web environment (not applicable)", async () => {
      const { checkGpuCapability } = await import("../checks");
      const result = await checkGpuCapability();

      expect(result).toBeNull();
    });

    it("returns ready when GPU with CUDA available in Tauri", async () => {
      vi.stubGlobal("window", { __TAURI__: true });

      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue({
        has_gpu: true,
        vram_gb: 8,
        name: "NVIDIA RTX 4070",
        cuda_available: true,
      });

      const { checkGpuCapability } = await import("../checks");
      const result = await checkGpuCapability();

      expect(result?.status).toBe("ready");
      expect(result?.message).toContain("NVIDIA RTX 4070");
      expect(result?.message).toContain("8");
    });

    it("returns warning when GPU without CUDA", async () => {
      vi.stubGlobal("window", { __TAURI__: true });

      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue({
        has_gpu: true,
        cuda_available: false,
      });

      const { checkGpuCapability } = await import("../checks");
      const result = await checkGpuCapability();

      expect(result?.status).toBe("warning");
      expect(result?.message).toContain("CUDA unavailable");
      expect(result?.details).toContain("CPU inference");
    });

    it("returns warning when no GPU detected", async () => {
      vi.stubGlobal("window", { __TAURI__: true });

      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockResolvedValue({ has_gpu: false });

      const { checkGpuCapability } = await import("../checks");
      const result = await checkGpuCapability();

      expect(result?.status).toBe("warning");
      expect(result?.message).toContain("No dedicated GPU");
    });
  });

  describe("runAllChecks", () => {
    it("runs all checks in parallel and returns results", async () => {
      const { runAllChecks } = await import("../checks");
      const results = await runAllChecks();

      // Should have at least model, storage, ram, knowledge checks
      expect(results.length).toBeGreaterThanOrEqual(4);

      // All results should have required fields
      for (const result of results) {
        expect(result.id).toBeDefined();
        expect(result.category).toBeDefined();
        expect(result.name).toBeDefined();
        expect(result.status).toBeDefined();
        expect(result.message).toBeDefined();
      }
    });

    it("filters out null results (e.g., GPU on web)", async () => {
      const { runAllChecks } = await import("../checks");
      const results = await runAllChecks();

      // All results should be valid checks, not null
      for (const result of results) {
        expect(result).not.toBeNull();
      }
    });
  });

  describe("calculateOverallStatus", () => {
    it("returns ready when all checks pass", async () => {
      const { calculateOverallStatus } = await import("../checks");

      const checks = [
        {
          id: "1",
          category: "model" as const,
          name: "Model",
          status: "ready" as const,
          message: "",
        },
        {
          id: "2",
          category: "storage" as const,
          name: "Storage",
          status: "ready" as const,
          message: "",
        },
      ];

      expect(calculateOverallStatus(checks)).toBe("ready");
    });

    it("returns warning when any check has warning", async () => {
      const { calculateOverallStatus } = await import("../checks");

      const checks = [
        {
          id: "1",
          category: "model" as const,
          name: "Model",
          status: "ready" as const,
          message: "",
        },
        {
          id: "2",
          category: "storage" as const,
          name: "Storage",
          status: "warning" as const,
          message: "",
        },
      ];

      expect(calculateOverallStatus(checks)).toBe("warning");
    });

    it("returns critical when any check is critical", async () => {
      const { calculateOverallStatus } = await import("../checks");

      const checks = [
        {
          id: "1",
          category: "model" as const,
          name: "Model",
          status: "critical" as const,
          message: "",
        },
        {
          id: "2",
          category: "storage" as const,
          name: "Storage",
          status: "warning" as const,
          message: "",
        },
        {
          id: "3",
          category: "ram" as const,
          name: "RAM",
          status: "ready" as const,
          message: "",
        },
      ];

      expect(calculateOverallStatus(checks)).toBe("critical");
    });

    it("prioritizes critical over warning", async () => {
      const { calculateOverallStatus } = await import("../checks");

      const checks = [
        {
          id: "1",
          category: "model" as const,
          name: "Model",
          status: "warning" as const,
          message: "",
        },
        {
          id: "2",
          category: "storage" as const,
          name: "Storage",
          status: "critical" as const,
          message: "",
        },
      ];

      // Critical should take precedence
      expect(calculateOverallStatus(checks)).toBe("critical");
    });

    it("handles empty checks array", async () => {
      const { calculateOverallStatus } = await import("../checks");
      expect(calculateOverallStatus([])).toBe("ready");
    });

    it("ignores checking status in overall calculation", async () => {
      const { calculateOverallStatus } = await import("../checks");

      const checks = [
        {
          id: "1",
          category: "model" as const,
          name: "Model",
          status: "checking" as const,
          message: "",
        },
        {
          id: "2",
          category: "storage" as const,
          name: "Storage",
          status: "ready" as const,
          message: "",
        },
      ];

      // Checking status should be treated as neutral
      expect(calculateOverallStatus(checks)).toBe("ready");
    });
  });
});
