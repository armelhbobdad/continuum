/**
 * Filter Sessions Utility
 *
 * Provides filtering logic for sessions with search query and filter options.
 * Returns filtered sessions with match ranges for highlighting.
 *
 * Story 3.2: Session Search & Filtering
 * AC #1 (search), AC #2 (highlighting), AC #3 (filters)
 * Task 3: Subtasks 3.1-3.6
 */

import type { Session } from "@/stores/session";

/**
 * Filter options for session filtering.
 * Task 4: Filter logic types
 */
export interface SessionFilterOptions {
  /** Search query for title and message content */
  query?: string;
  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Privacy mode filter (reserved for future use) */
  privacyMode?: string;
  /** Message type filter */
  messageType?: "all" | "with-ai" | "user-only";
}

/**
 * Match range for text highlighting.
 * Task 6: Search result highlighting
 */
export interface MatchRange {
  start: number;
  end: number;
}

/**
 * Filtered session with match ranges for highlighting.
 */
export interface FilteredSession extends Session {
  /** Ranges of matched text in the title for highlighting */
  matchRanges?: MatchRange[];
}

/**
 * Get match ranges for a search term within text.
 * Case-insensitive matching.
 *
 * Task 3.5: Return matches with highlighted ranges
 */
function getMatchRanges(text: string, searchTerm: string): MatchRange[] {
  const ranges: MatchRange[] = [];
  const lowerText = text.toLowerCase();
  const lowerSearch = searchTerm.toLowerCase();
  let pos = 0;

  while (pos < lowerText.length) {
    const index = lowerText.indexOf(lowerSearch, pos);
    if (index === -1) {
      break;
    }
    ranges.push({ start: index, end: index + searchTerm.length });
    // Use searchTerm.length to prevent overlapping ranges
    // e.g., searching "aa" in "aaa" should find one match, not two overlapping ones
    pos = index + searchTerm.length;
  }

  return ranges;
}

/**
 * Count active filters in filter options.
 */
export function countActiveFilters(options: SessionFilterOptions): number {
  let count = 0;
  if (options.query?.trim()) {
    count++;
  }
  if (options.dateRange) {
    count++;
  }
  if (options.privacyMode) {
    count++;
  }
  if (options.messageType && options.messageType !== "all") {
    count++;
  }
  return count;
}

/**
 * Filter sessions based on search query and filter options.
 *
 * Performance: Uses early exit for efficiency.
 * Per NFR9: Must complete within 500ms for 1000 sessions.
 *
 * Task 3: Core filter implementation
 */
export function filterSessions(
  sessions: Session[],
  options: SessionFilterOptions
): FilteredSession[] {
  // Early exit if no filters applied
  if (
    !(options.query?.trim() || options.dateRange || options.privacyMode) &&
    (!options.messageType || options.messageType === "all")
  ) {
    return sessions;
  }

  let filtered = [...sessions];

  // Task 3.3 & 3.4: Text search (case-insensitive)
  if (options.query?.trim()) {
    const searchTerm = options.query.toLowerCase().trim();
    filtered = filtered.filter((session) => {
      // Search in title
      if (session.title.toLowerCase().includes(searchTerm)) {
        return true;
      }
      // Search in messages
      return session.messages.some((m) =>
        m.content.toLowerCase().includes(searchTerm)
      );
    });

    // Task 3.5: Add match ranges for highlighting
    filtered = filtered.map((session) => ({
      ...session,
      matchRanges: getMatchRanges(session.title, options.query?.trim() ?? ""),
    }));
  }

  // Task 4.3: Date range filter
  if (options.dateRange) {
    const { start, end } = options.dateRange;
    filtered = filtered.filter(
      (session) => session.updatedAt >= start && session.updatedAt <= end
    );
  }

  // Task 4.5: Message type filter
  if (options.messageType && options.messageType !== "all") {
    filtered = filtered.filter((session) => {
      const hasAssistant = session.messages.some((m) => m.role === "assistant");
      if (options.messageType === "with-ai") {
        return hasAssistant;
      }
      if (options.messageType === "user-only") {
        return !hasAssistant;
      }
      return true;
    });
  }

  return filtered;
}
