import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getPlatform,
  hasLocalInferenceCapability,
  hasWebGPU,
  isDesktop,
  type PlatformCapabilities,
  type PlatformType,
} from "../capabilities";

// Store original values for cleanup
let originalTauri: unknown;
let originalTauriInternals: unknown;
let originalNavigator: Navigator | undefined;

// Mock window.__TAURI__ detection
const mockTauri = (enabled: boolean) => {
  if (enabled) {
    // @ts-expect-error - mocking Tauri detection
    globalThis.__TAURI__ = { version: "2.0.0" };
    // @ts-expect-error - mocking Tauri internals
    globalThis.__TAURI_INTERNALS__ = {};
  } else {
    // @ts-expect-error - mocking Tauri detection
    delete globalThis.__TAURI__;
    // @ts-expect-error - mocking Tauri internals
    delete globalThis.__TAURI_INTERNALS__;
  }
};

// Mock navigator.gpu for WebGPU detection
const mockWebGPU = (enabled: boolean) => {
  if (enabled) {
    // @ts-expect-error - mocking WebGPU
    globalThis.navigator = { gpu: {} };
  } else {
    // @ts-expect-error - mocking navigator without WebGPU
    globalThis.navigator = {};
  }
};

describe("capabilities", () => {
  beforeEach(() => {
    // @ts-expect-error - storing original Tauri value
    originalTauri = globalThis.__TAURI__;
    // @ts-expect-error - storing original Tauri internals
    originalTauriInternals = globalThis.__TAURI_INTERNALS__;
    originalNavigator =
      typeof globalThis.navigator !== "undefined"
        ? globalThis.navigator
        : undefined;
  });

  afterEach(() => {
    // Restore original values
    if (originalTauri !== undefined) {
      // @ts-expect-error - restoring Tauri value
      globalThis.__TAURI__ = originalTauri;
    } else {
      // @ts-expect-error - cleaning up
      delete globalThis.__TAURI__;
    }

    if (originalTauriInternals !== undefined) {
      // @ts-expect-error - restoring Tauri internals
      globalThis.__TAURI_INTERNALS__ = originalTauriInternals;
    } else {
      // @ts-expect-error - cleaning up
      delete globalThis.__TAURI_INTERNALS__;
    }

    if (originalNavigator !== undefined) {
      // @ts-expect-error - restoring navigator
      globalThis.navigator = originalNavigator;
    }
  });

  describe("isDesktop", () => {
    it("should return true when Tauri is available", () => {
      mockTauri(true);
      expect(isDesktop()).toBe(true);
    });

    it("should return false when Tauri is not available", () => {
      mockTauri(false);
      expect(isDesktop()).toBe(false);
    });
  });

  describe("hasWebGPU", () => {
    it("should return true when navigator.gpu exists", () => {
      mockTauri(false);
      mockWebGPU(true);
      expect(hasWebGPU()).toBe(true);
    });

    it("should return false when navigator.gpu is absent", () => {
      mockTauri(false);
      mockWebGPU(false);
      expect(hasWebGPU()).toBe(false);
    });
  });

  describe("hasLocalInferenceCapability", () => {
    it("should return true for desktop (Kalosm)", () => {
      mockTauri(true);
      expect(hasLocalInferenceCapability()).toBe(true);
    });

    it("should return true for web with WebGPU", () => {
      mockTauri(false);
      mockWebGPU(true);
      expect(hasLocalInferenceCapability()).toBe(true);
    });

    it("should return false for web without WebGPU", () => {
      mockTauri(false);
      mockWebGPU(false);
      expect(hasLocalInferenceCapability()).toBe(false);
    });
  });

  describe("getPlatform", () => {
    it("should detect desktop platform when Tauri is available", () => {
      mockTauri(true);
      const platform = getPlatform();

      expect(platform.type).toBe("desktop");
      expect(platform.hasLocalInference).toBe(true);
      expect(platform.isTauri).toBe(true);
      expect(platform.isOfflineCapable).toBe(true);
    });

    it("should detect web platform when Tauri is not available", () => {
      mockTauri(false);
      mockWebGPU(false);
      const platform = getPlatform();

      expect(platform.type).toBe("web");
      expect(platform.isTauri).toBe(false);
      expect(platform.isOfflineCapable).toBe(false);
    });

    it("should detect web platform with local inference when WebGPU available", () => {
      mockTauri(false);
      mockWebGPU(true);
      const platform = getPlatform();

      expect(platform.type).toBe("web");
      expect(platform.hasLocalInference).toBe(true);
      expect(platform.hasWebGPU).toBe(true);
    });

    it("should return all required properties", () => {
      mockTauri(true);
      const platform = getPlatform();

      expect(platform).toHaveProperty("type");
      expect(platform).toHaveProperty("hasLocalInference");
      expect(platform).toHaveProperty("hasWebGPU");
      expect(platform).toHaveProperty("isTauri");
      expect(platform).toHaveProperty("isOfflineCapable");
    });
  });

  describe("PlatformType", () => {
    it("should only allow valid platform types", () => {
      const validTypes: PlatformType[] = ["desktop", "web"];
      for (const type of validTypes) {
        expect(["desktop", "web"]).toContain(type);
      }
    });
  });

  describe("PlatformCapabilities interface", () => {
    it("should satisfy interface contract for desktop", () => {
      mockTauri(true);
      const platform: PlatformCapabilities = getPlatform();

      expect(typeof platform.type).toBe("string");
      expect(typeof platform.hasLocalInference).toBe("boolean");
      expect(typeof platform.hasWebGPU).toBe("boolean");
      expect(typeof platform.isTauri).toBe("boolean");
      expect(typeof platform.isOfflineCapable).toBe("boolean");
    });
  });
});
