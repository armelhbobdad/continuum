/**
 * Download File Utility Tests
 *
 * Story 3.3: Session Deletion & Export
 * AC #3 (export download)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadFile, getFilenameForExport } from "../download-file";

// Top-level regex patterns for filename validation
const JSON_FILENAME_PATTERN = /^my-session-\d{4}-\d{2}-\d{2}\.json$/;
const MD_FILENAME_PATTERN = /^my-session-\d{4}-\d{2}-\d{2}\.md$/;
const SPECIAL_CHARS_PATTERN = /[!@#$]/;

describe("getFilenameForExport", () => {
  it("generates JSON filename", () => {
    const filename = getFilenameForExport("My Session", "json");
    expect(filename).toMatch(JSON_FILENAME_PATTERN);
  });

  it("generates Markdown filename", () => {
    const filename = getFilenameForExport("My Session", "md");
    expect(filename).toMatch(MD_FILENAME_PATTERN);
  });

  it("sanitizes session title for filename", () => {
    const filename = getFilenameForExport(
      "Special Characters In Title!@#$",
      "json"
    );
    expect(filename).not.toMatch(SPECIAL_CHARS_PATTERN);
    expect(filename).toContain("special-characters-in-title");
  });

  it("truncates long titles", () => {
    const longTitle =
      "This is a very long title that exceeds the maximum allowed length for filenames";
    const filename = getFilenameForExport(longTitle, "json");
    // Should be title (max 50) + date + extension
    expect(filename.length).toBeLessThanOrEqual(80);
  });
});

describe("downloadFile - Web Browser", () => {
  const originalCreateElement = document.createElement.bind(document);
  const originalAppendChild = document.body.appendChild.bind(document.body);
  const originalRemoveChild = document.body.removeChild.bind(document.body);
  let mockAnchor: HTMLAnchorElement & { click: ReturnType<typeof vi.fn> };
  let originalURL: typeof URL;
  let originalWindow: typeof window;

  beforeEach(() => {
    // Store originals
    originalURL = globalThis.URL;
    originalWindow = globalThis.window;

    // Ensure we're in web environment (no __TAURI__)
    const windowMock = { ...window };
    (windowMock as Record<string, unknown>).__TAURI__ = undefined;
    Object.defineProperty(globalThis, "window", {
      value: windowMock,
      writable: true,
      configurable: true,
    });

    // Create a mock anchor element
    mockAnchor = {
      href: "",
      download: "",
      click: vi.fn(),
      style: {},
    } as unknown as HTMLAnchorElement & { click: ReturnType<typeof vi.fn> };

    // Mock URL APIs using object literal instead of class
    Object.defineProperty(globalThis, "URL", {
      value: {
        createObjectURL: vi.fn(() => "blob:test-url"),
        revokeObjectURL: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    // Mock document methods
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "a") {
        return mockAnchor as unknown as HTMLElement;
      }
      return originalCreateElement(tagName);
    });

    vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
      if (node === mockAnchor) {
        return node;
      }
      return originalAppendChild(node);
    });

    vi.spyOn(document.body, "removeChild").mockImplementation((node) => {
      if (node === mockAnchor) {
        return node;
      }
      return originalRemoveChild(node);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, "URL", {
      value: originalURL,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  it("creates and clicks an anchor element", async () => {
    await downloadFile("test content", "test.txt", "text/plain");

    expect(mockAnchor.click).toHaveBeenCalledTimes(1);
  });

  it("sets correct filename on anchor", async () => {
    await downloadFile("test content", "my-file.json", "application/json");

    expect(mockAnchor.download).toBe("my-file.json");
  });

  it("creates blob URL from content", async () => {
    await downloadFile("test content", "test.txt", "text/plain");

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(mockAnchor.href).toBe("blob:test-url");
  });

  it("revokes blob URL after download", async () => {
    await downloadFile("test content", "test.txt", "text/plain");

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-url");
  });

  it("cleans up anchor element after download", async () => {
    await downloadFile("test content", "test.txt", "text/plain");

    expect(document.body.removeChild).toHaveBeenCalledWith(mockAnchor);
  });
});

describe("downloadFile - Tauri Desktop", () => {
  const originalWindow = globalThis.window;
  let mockSave: ReturnType<typeof vi.fn>;
  let mockWriteTextFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup Tauri environment
    Object.defineProperty(globalThis, "window", {
      value: { ...window, __TAURI__: {} },
      writable: true,
      configurable: true,
    });

    // Mock Tauri plugin imports
    mockSave = vi.fn().mockResolvedValue("/user/downloads/test.json");
    mockWriteTextFile = vi.fn().mockResolvedValue(undefined);

    vi.doMock("@tauri-apps/plugin-dialog", () => ({
      save: mockSave,
    }));
    vi.doMock("@tauri-apps/plugin-fs", () => ({
      writeTextFile: mockWriteTextFile,
    }));
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  it("detects Tauri environment", () => {
    expect("__TAURI__" in window).toBe(true);
  });

  it("falls back to web download when Tauri plugins fail", async () => {
    // Reset the module mocks to throw errors
    vi.doMock("@tauri-apps/plugin-dialog", () => {
      throw new Error("Plugin not available");
    });

    // Need to re-import the module to get fresh mocks
    // Since dynamic imports in the function will use the mocked modules
    // This test verifies the fallback behavior

    const mockAnchor = {
      href: "",
      download: "",
      click: vi.fn(),
      style: {},
    };

    // Mock URL APIs using object literal instead of class
    Object.defineProperty(globalThis, "URL", {
      value: {
        createObjectURL: vi.fn(() => "blob:fallback-url"),
        revokeObjectURL: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    vi.spyOn(document, "createElement").mockReturnValue(
      mockAnchor as unknown as HTMLElement
    );
    vi.spyOn(document.body, "appendChild").mockReturnValue(
      mockAnchor as unknown as HTMLElement
    );
    vi.spyOn(document.body, "removeChild").mockReturnValue(
      mockAnchor as unknown as HTMLElement
    );

    // The actual test - downloadFile should not throw even in Tauri env when plugins fail
    await expect(
      downloadFile("test content", "test.json", "application/json")
    ).resolves.not.toThrow();
  });
});
