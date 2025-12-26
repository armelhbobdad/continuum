import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Track mock state
let mockIsDesktopValue = true;
let mockHasLocalValue = true;

// Mock @continuum/platform
vi.mock("@continuum/platform", () => ({
  isDesktop: () => mockIsDesktopValue,
  hasLocalInferenceCapability: () => mockHasLocalValue,
}));

// Mock @continuum/inference adapters
vi.mock("@continuum/inference", () => ({
  KalosmAdapter: class MockKalosmAdapter {
    name = "KalosmAdapter";
  },
  StubAdapter: class MockStubAdapter {
    name = "StubAdapter";
  },
}));

describe("getInferenceAdapter", () => {
  beforeEach(async () => {
    // Reset mocks to default values
    mockIsDesktopValue = true;
    mockHasLocalValue = true;

    // Reset the adapter cache before each test
    const mod = await import("../get-adapter");
    mod.resetAdapterCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return KalosmAdapter for desktop platform", async () => {
    mockIsDesktopValue = true;

    const { getInferenceAdapter, resetAdapterCache } = await import(
      "../get-adapter"
    );
    resetAdapterCache(); // Ensure fresh start
    const adapter = getInferenceAdapter();

    expect(adapter).toBeDefined();
    expect((adapter as unknown as { name: string }).name).toBe("KalosmAdapter");
  });

  it("should return StubAdapter for web platform without local inference", async () => {
    mockIsDesktopValue = false;
    mockHasLocalValue = false;

    const { getInferenceAdapter, resetAdapterCache } = await import(
      "../get-adapter"
    );
    resetAdapterCache(); // Ensure fresh start
    const adapter = getInferenceAdapter();

    expect((adapter as unknown as { name: string }).name).toBe("StubAdapter");
  });

  it("should cache the adapter instance (singleton)", async () => {
    mockIsDesktopValue = true;

    const { getInferenceAdapter, resetAdapterCache } = await import(
      "../get-adapter"
    );
    resetAdapterCache();
    const adapter1 = getInferenceAdapter();
    const adapter2 = getInferenceAdapter();

    expect(adapter1).toBe(adapter2);
  });

  it("should reset cache correctly", async () => {
    mockIsDesktopValue = true;

    const { getInferenceAdapter, resetAdapterCache } = await import(
      "../get-adapter"
    );
    resetAdapterCache();
    const adapter1 = getInferenceAdapter();

    resetAdapterCache();
    mockIsDesktopValue = false;

    const adapter2 = getInferenceAdapter();

    // After reset and platform change, should get different adapter type
    expect((adapter1 as unknown as { name: string }).name).toBe(
      "KalosmAdapter"
    );
    expect((adapter2 as unknown as { name: string }).name).toBe("StubAdapter");
  });
});
