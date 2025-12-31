/**
 * Session Export Utilities
 *
 * Export sessions to JSON and Markdown formats.
 * JSON includes versioned metadata for programmatic use.
 * Markdown provides human-readable format with attribution.
 *
 * Story 3.3: Session Deletion & Export
 * AC #3 (export format selection)
 */

import type { Session } from "@/stores/session";

/** Export metadata included in JSON exports */
interface ExportMeta {
  exportVersion: string;
  exportedAt: string;
  application: string;
}

/** Structure of JSON export */
interface SessionExport {
  meta: ExportMeta;
  session: Session;
}

const EXPORT_VERSION = "1.0.0";
const APPLICATION_NAME = "continuum";

/**
 * Export session to versioned JSON format.
 *
 * Includes export metadata (version, timestamp, application)
 * for future import compatibility and provenance.
 */
export function exportSessionToJson(session: Session): string {
  const exportData: SessionExport = {
    meta: {
      exportVersion: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      application: APPLICATION_NAME,
    },
    session,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Format timestamp for markdown display.
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format time only for message timestamps.
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Export session to human-readable Markdown format.
 *
 * Format:
 * - Title as H1 header
 * - Session metadata (created, updated)
 * - Messages with User/AI attribution and timestamps
 * - Export footer
 */
export function exportSessionToMarkdown(session: Session): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${session.title}`);
  lines.push("");

  // Session metadata
  lines.push(`**Created:** ${formatTimestamp(session.createdAt)}`);
  lines.push(`**Last updated:** ${formatTimestamp(session.updatedAt)}`);
  lines.push("");

  // Messages
  if (session.messages.length > 0) {
    lines.push("---");
    lines.push("");

    for (const message of session.messages) {
      const attribution = message.role === "user" ? "User" : "AI";
      const time = formatTime(message.timestamp);

      lines.push(`**${attribution}:** *${time}*`);
      lines.push("");
      lines.push(message.content);
      lines.push("");
    }
  }

  // Export footer
  lines.push("---");
  lines.push("");
  lines.push(`*Exported from Continuum on ${formatTimestamp(new Date())}*`);

  return lines.join("\n");
}
