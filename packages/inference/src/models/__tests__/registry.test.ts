/**
 * Model Registry Tests
 * Story 2.2: Model Catalog & Cards
 *
 * Tests for the static model registry and metadata functions.
 * AC1: Model Catalog Display
 */

import { describe, expect, it } from "bun:test";

import { getModelMetadata, listModels, MODEL_REGISTRY } from "../registry";

describe("Model Registry", () => {
  describe("listModels", () => {
    it("should return all models", () => {
      const models = listModels();
      // Minimum 3 models per story requirements
      expect(models.length).toBeGreaterThanOrEqual(3);
    });

    it("should return copy to prevent mutation", () => {
      const models1 = listModels();
      const models2 = listModels();
      expect(models1).not.toBe(models2);
      expect(models1).toEqual(models2);
    });
  });

  describe("getModelMetadata", () => {
    it("should return model by ID", () => {
      const model = getModelMetadata("phi-3-mini");
      expect(model).toBeDefined();
      expect(model?.name).toBe("Phi-3 Mini");
    });

    it("should return undefined for unknown model", () => {
      const model = getModelMetadata("unknown-model");
      expect(model).toBeUndefined();
    });
  });

  describe("Model Metadata Structure", () => {
    it.each(MODEL_REGISTRY)("$name should have valid structure", (model) => {
      // Required fields
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(model.version).toBeTruthy();
      expect(model.description).toBeTruthy();

      // Requirements
      expect(model.requirements.ramMb).toBeGreaterThan(0);
      expect(model.requirements.storageMb).toBeGreaterThan(0);
      expect(model.requirements.gpuVramMb).toBeGreaterThanOrEqual(0);

      // Arrays
      expect(model.capabilities.length).toBeGreaterThan(0);
      expect(Array.isArray(model.limitations)).toBe(true);
      expect(Array.isArray(model.vulnerabilities)).toBe(true);

      // Context length
      expect(model.contextLength).toBeGreaterThan(0);

      // License
      expect(model.license.name).toBeTruthy();
      expect(model.license.url).toMatch(/^https?:\/\//);
      expect(typeof model.license.commercial).toBe("boolean");

      // Download info
      expect(model.downloadUrl).toMatch(/^https?:\/\//);
      expect(model.sha256).toBeTruthy();

      // Tokenizer URL (direct HuggingFace download link)
      expect(model.tokenizerUrl).toBeTruthy();
      expect(model.tokenizerUrl).toMatch(
        /^https:\/\/huggingface\.co\/.*\/tokenizer\.json$/
      );
    });
  });

  describe("Model Vulnerability Structure", () => {
    it("should have valid vulnerability structure when present", () => {
      const models = listModels();
      for (const model of models) {
        for (const vuln of model.vulnerabilities) {
          expect(vuln.id).toBeTruthy();
          expect(["low", "medium", "high", "critical"]).toContain(
            vuln.severity
          );
          expect(vuln.description).toBeTruthy();
          expect(vuln.moreInfoUrl).toMatch(/^https?:\/\//);
        }
      }
    });
  });

  describe("Type Safety", () => {
    it("should have correct type for capabilities", () => {
      const validCapabilities = [
        "general-chat",
        "code-generation",
        "summarization",
        "translation",
        "creative-writing",
      ];
      const models = listModels();
      for (const model of models) {
        for (const cap of model.capabilities) {
          expect(validCapabilities).toContain(cap);
        }
      }
    });

    it("should have correct type for limitations", () => {
      const validLimitations = [
        "no-image-understanding",
        "no-code-execution",
        "limited-context",
        "english-only",
      ];
      const models = listModels();
      for (const model of models) {
        for (const lim of model.limitations) {
          expect(validLimitations).toContain(lim);
        }
      }
    });
  });
});
