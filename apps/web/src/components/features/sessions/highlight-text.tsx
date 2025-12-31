"use client";

/**
 * Highlight Text Component
 *
 * Renders text with highlighted search matches using semantic mark elements.
 *
 * Story 3.2: Session Search & Filtering
 * AC #2 (search result highlighting)
 * Task 6: Subtasks 6.1-6.4
 */

import type { MatchRange } from "@/lib/sessions/filter-sessions";

export interface HighlightTextProps {
  /** Text to display */
  text: string;
  /** Ranges to highlight */
  ranges: MatchRange[];
}

/**
 * HighlightText renders text with highlighted portions.
 *
 * Uses semantic <mark> elements for accessibility.
 * Styled with yellow background for dark/light mode.
 */
export function HighlightText({ text, ranges }: HighlightTextProps) {
  if (ranges.length === 0) {
    return <>{text}</>;
  }

  const segments: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const range of ranges) {
    // Text before highlight
    if (range.start > lastIndex) {
      segments.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex, range.start)}
        </span>
      );
    }
    // Highlighted text
    segments.push(
      <mark
        className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800"
        key={`mark-${range.start}`}
      >
        {text.slice(range.start, range.end)}
      </mark>
    );
    lastIndex = range.end;
  }

  // Remaining text after last highlight
  if (lastIndex < text.length) {
    segments.push(
      <span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>
    );
  }

  return <>{segments}</>;
}
