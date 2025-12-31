/**
 * Download File Utility
 *
 * Cross-platform file download supporting both web browser and Tauri desktop.
 * - Web: Uses Blob URL with anchor click pattern
 * - Tauri: Uses native save dialog via @tauri-apps/plugin-dialog
 *
 * Story 3.3: Session Deletion & Export
 * AC #3 (export download)
 */

/**
 * Check if running in Tauri desktop environment.
 */
function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/**
 * Generate a filename for session export.
 *
 * Format: {sanitized-title}-{YYYY-MM-DD}.{extension}
 * Sanitizes title by removing special characters and limiting length.
 */
export function getFilenameForExport(
  sessionTitle: string,
  extension: "json" | "md"
): string {
  // Sanitize title: lowercase, replace spaces with dashes, remove special chars
  const sanitized = sessionTitle
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 50);

  // Format date as YYYY-MM-DD
  const date = new Date().toISOString().split("T")[0];

  return `${sanitized}-${date}.${extension}`;
}

/**
 * Download content as a file in the browser.
 *
 * Creates a temporary Blob URL, triggers download via anchor click,
 * then cleans up the URL to prevent memory leaks.
 */
function downloadFileWeb(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}

/**
 * Get file filter based on extension for save dialog.
 */
function getFileFilter(
  extension: string
): Array<{ name: string; extensions: string[] }> {
  if (extension === "json") {
    return [{ name: "JSON Files", extensions: ["json"] }];
  }
  if (extension === "md") {
    return [{ name: "Markdown Files", extensions: ["md"] }];
  }
  return [{ name: "All Files", extensions: ["*"] }];
}

/**
 * Download content using Tauri native save dialog.
 *
 * Dynamic imports to avoid bundling Tauri plugins in web builds.
 * Falls back to web download if save dialog is cancelled or plugins unavailable.
 */
async function downloadFileTauri(
  content: string,
  filename: string,
  mimeType: string
): Promise<void> {
  try {
    // Dynamic import with webpackIgnore to prevent bundling in web builds
    // These plugins only exist in the Tauri desktop build
    const { save } = await import(
      /* webpackIgnore: true */ "@tauri-apps/plugin-dialog"
    );
    const { writeTextFile } = await import(
      /* webpackIgnore: true */ "@tauri-apps/plugin-fs"
    );

    const extension = filename.split(".").pop() ?? "";
    const filters = getFileFilter(extension);

    const path = await save({
      defaultPath: filename,
      filters,
    });

    if (path) {
      await writeTextFile(path, content);
    }
    // If user cancelled (path is null), do nothing
  } catch {
    // Fallback to web download if Tauri plugins unavailable
    downloadFileWeb(content, filename, mimeType);
  }
}

/**
 * Download content as a file.
 *
 * Uses Tauri native save dialog on desktop, browser download on web.
 * Returns a Promise for consistent async handling across platforms.
 */
export async function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): Promise<void> {
  if (isTauriEnvironment()) {
    await downloadFileTauri(content, filename, mimeType);
  } else {
    downloadFileWeb(content, filename, mimeType);
  }
}

/**
 * Download session as JSON.
 */
export async function downloadSessionJson(
  content: string,
  sessionTitle: string
): Promise<void> {
  const filename = getFilenameForExport(sessionTitle, "json");
  await downloadFile(content, filename, "application/json");
}

/**
 * Download session as Markdown.
 */
export async function downloadSessionMarkdown(
  content: string,
  sessionTitle: string
): Promise<void> {
  const filename = getFilenameForExport(sessionTitle, "md");
  await downloadFile(content, filename, "text/markdown");
}
