/**
 * Relative Time Formatting Utility
 *
 * Formats timestamps as human-readable relative time strings.
 * Handles Date objects and Unix timestamps.
 *
 * Story 1.7: Shared utility for session sidebar timestamps
 * Reused from Story 1.5/1.6 patterns
 */

/**
 * Format a Date as relative time string.
 *
 * Handles clock skew by clamping future timestamps to "just now".
 * Uses natural language: "just now", "2 min ago", "3h ago", "Yesterday", etc.
 *
 * @param date - Date to format
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const timestamp = date.getTime();

  // Handle future timestamps (clock skew edge case)
  if (timestamp > now) {
    return "just now";
  }

  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Older than a week: show date
  return date.toLocaleDateString();
}

/**
 * Format a Unix timestamp (milliseconds) as relative time string.
 *
 * Convenience wrapper for formatRelativeTime that accepts timestamps.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Human-readable relative time string
 */
export function formatRelativeTimestamp(timestamp: number): string {
  return formatRelativeTime(new Date(timestamp));
}
