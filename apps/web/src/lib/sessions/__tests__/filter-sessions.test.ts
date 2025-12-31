/**
 * Filter Sessions Utility Tests
 *
 * Story 3.2: Session Search & Filtering
 * AC #1 (search), AC #2 (highlighting), AC #3 (filters)
 * Task 3: Subtasks 3.1-3.6
 */

import { describe, expect, it } from "vitest";
import type { Session } from "@/stores/session";
import {
  countActiveFilters,
  filterSessions,
  type SessionFilterOptions,
} from "../filter-sessions";

const mockSessions: Session[] = [
  {
    id: "1",
    title: "Privacy Discussion",
    messages: [
      {
        id: "m1",
        role: "user" as const,
        content: "How does encryption work?",
        timestamp: new Date("2025-12-30T10:00:00"),
      },
    ],
    createdAt: new Date("2025-12-01"),
    updatedAt: new Date("2025-12-30"),
  },
  {
    id: "2",
    title: "Coding Help",
    messages: [
      {
        id: "m2",
        role: "user" as const,
        content: "Help with React",
        timestamp: new Date("2025-12-29T10:00:00"),
      },
      {
        id: "m3",
        role: "assistant" as const,
        content: "Sure, let me help.",
        timestamp: new Date("2025-12-29T10:01:00"),
      },
    ],
    createdAt: new Date("2025-12-15"),
    updatedAt: new Date("2025-12-29"),
  },
  {
    id: "3",
    title: "General Chat",
    messages: [
      {
        id: "m4",
        role: "user" as const,
        content: "Hello there",
        timestamp: new Date("2025-12-20T10:00:00"),
      },
    ],
    createdAt: new Date("2025-12-20"),
    updatedAt: new Date("2025-12-20"),
  },
];

describe("filterSessions", () => {
  describe("text search", () => {
    it("filters by title (case-insensitive)", () => {
      const result = filterSessions(mockSessions, { query: "privacy" });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Privacy Discussion");
    });

    it("filters by message content", () => {
      const result = filterSessions(mockSessions, { query: "encryption" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1");
    });

    it("handles empty query", () => {
      const result = filterSessions(mockSessions, { query: "" });
      expect(result).toHaveLength(3);
    });

    it("handles whitespace-only query", () => {
      const result = filterSessions(mockSessions, { query: "   " });
      expect(result).toHaveLength(3);
    });

    it("returns match ranges for highlighting", () => {
      const result = filterSessions(mockSessions, { query: "privacy" });
      expect(result[0].matchRanges).toEqual([{ start: 0, end: 7 }]);
    });

    it("finds multiple matches in title", () => {
      const sessions: Session[] = [
        {
          id: "test",
          title: "Test test testing",
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const result = filterSessions(sessions, { query: "test" });
      expect(result[0].matchRanges).toHaveLength(3);
    });

    it("does not produce overlapping match ranges", () => {
      // Searching "aa" in "aaa" should find 1 match at [0,2], not overlapping [0,2] and [1,3]
      const sessions: Session[] = [
        {
          id: "overlap-test",
          title: "aaa",
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const result = filterSessions(sessions, { query: "aa" });
      expect(result[0].matchRanges).toHaveLength(1);
      expect(result[0].matchRanges).toEqual([{ start: 0, end: 2 }]);
    });

    it("finds non-overlapping consecutive matches", () => {
      // "aaaa" with query "aa" should find 2 matches: [0,2] and [2,4]
      const sessions: Session[] = [
        {
          id: "consecutive-test",
          title: "aaaa",
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const result = filterSessions(sessions, { query: "aa" });
      expect(result[0].matchRanges).toHaveLength(2);
      expect(result[0].matchRanges).toEqual([
        { start: 0, end: 2 },
        { start: 2, end: 4 },
      ]);
    });
  });

  describe("message type filter", () => {
    it("filters by message type - with AI", () => {
      const result = filterSessions(mockSessions, { messageType: "with-ai" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("filters by message type - user only", () => {
      const result = filterSessions(mockSessions, { messageType: "user-only" });
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.id)).toEqual(["1", "3"]);
    });

    it("returns all sessions when message type is 'all'", () => {
      const result = filterSessions(mockSessions, { messageType: "all" });
      expect(result).toHaveLength(3);
    });
  });

  describe("date range filter", () => {
    it("filters by date range", () => {
      const result = filterSessions(mockSessions, {
        dateRange: {
          start: new Date("2025-12-29"),
          end: new Date("2025-12-31"),
        },
      });
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.id)).toEqual(["1", "2"]);
    });

    it("excludes sessions outside date range", () => {
      const result = filterSessions(mockSessions, {
        dateRange: {
          start: new Date("2025-12-01"),
          end: new Date("2025-12-15"),
        },
      });
      expect(result).toHaveLength(0);
    });
  });

  describe("combined filters", () => {
    it("combines text search with message type filter", () => {
      const result = filterSessions(mockSessions, {
        query: "help",
        messageType: "with-ai",
      });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Coding Help");
    });

    it("returns empty when no matches", () => {
      const result = filterSessions(mockSessions, {
        query: "nonexistent",
        messageType: "with-ai",
      });
      expect(result).toHaveLength(0);
    });
  });

  describe("performance", () => {
    it("performs search under 500ms for 1000 sessions", () => {
      const manySessions: Session[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        title: `Session ${i} with some content`,
        messages: [
          {
            id: `m${i}`,
            role: "user" as const,
            content: `Message ${i}`,
            timestamp: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const start = performance.now();
      filterSessions(manySessions, { query: "session 500" });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
    });
  });
});

describe("countActiveFilters", () => {
  it("returns 0 for empty options", () => {
    expect(countActiveFilters({})).toBe(0);
  });

  it("counts query as active filter", () => {
    expect(countActiveFilters({ query: "test" })).toBe(1);
  });

  it("ignores empty query", () => {
    expect(countActiveFilters({ query: "" })).toBe(0);
  });

  it("ignores whitespace-only query", () => {
    expect(countActiveFilters({ query: "   " })).toBe(0);
  });

  it("counts date range as active filter", () => {
    expect(
      countActiveFilters({
        dateRange: { start: new Date(), end: new Date() },
      })
    ).toBe(1);
  });

  it("counts message type as active filter", () => {
    expect(countActiveFilters({ messageType: "with-ai" })).toBe(1);
  });

  it("ignores 'all' message type", () => {
    expect(countActiveFilters({ messageType: "all" })).toBe(0);
  });

  it("counts multiple active filters", () => {
    const options: SessionFilterOptions = {
      query: "test",
      dateRange: { start: new Date(), end: new Date() },
      messageType: "with-ai",
    };
    expect(countActiveFilters(options)).toBe(3);
  });
});
