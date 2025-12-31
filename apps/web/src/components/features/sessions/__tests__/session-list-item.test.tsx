/**
 * SessionListItem Component Tests
 *
 * Tests for individual session list item with CVA variants.
 * Story 3.1: Session History & Navigation
 * AC #1 (session display), AC #3 (session selection)
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/stores/session";
import { SessionListItem } from "../session-list-item";

// Top-level regex patterns for performance
const JUST_NOW_PATTERN = /just now/i;
const FIVE_MIN_AGO_PATTERN = /5 min ago/i;
const YESTERDAY_PATTERN = /yesterday/i;
const ACTIONS_FOR_PATTERN = /actions for/i;

// Mock session for testing
function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "test-session-id",
    title: "Test Session",
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("SessionListItem Component", () => {
  const defaultProps = {
    session: createMockSession(),
    isActive: false,
    onSelect: vi.fn(),
    style: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders session title", () => {
      render(<SessionListItem {...defaultProps} />);
      expect(screen.getByText("Test Session")).toBeInTheDocument();
    });

    it("renders with data-slot attribute", () => {
      render(<SessionListItem {...defaultProps} />);
      const item = screen.getByRole("option");
      expect(item).toHaveAttribute("data-slot", "session-list-item");
    });

    it("renders with data-session-id attribute", () => {
      render(<SessionListItem {...defaultProps} />);
      const item = screen.getByRole("option");
      expect(item).toHaveAttribute("data-session-id", "test-session-id");
    });

    it("displays relative timestamp", () => {
      const session = createMockSession();
      render(<SessionListItem {...defaultProps} session={session} />);

      // Should show "just now" for recently created session
      expect(screen.getByText(JUST_NOW_PATTERN)).toBeInTheDocument();
    });

    it("truncates titles longer than 50 characters with ellipsis", () => {
      const longTitle =
        "This is a very long session title that exceeds fifty characters limit";
      const session = createMockSession({ title: longTitle });
      render(<SessionListItem {...defaultProps} session={session} />);

      // Should show first 50 chars + ellipsis
      const truncatedTitle = `${longTitle.slice(0, 50)}...`;
      expect(screen.getByText(truncatedTitle)).toBeInTheDocument();
    });

    it("shows full title for titles under 50 characters", () => {
      const shortTitle = "Short title";
      const session = createMockSession({ title: shortTitle });
      render(<SessionListItem {...defaultProps} session={session} />);

      expect(screen.getByText(shortTitle)).toBeInTheDocument();
    });

    it("shows full title in tooltip via title attribute", () => {
      const longTitle =
        "This is a very long session title that exceeds fifty characters limit";
      const session = createMockSession({ title: longTitle });
      render(<SessionListItem {...defaultProps} session={session} />);

      const titleElement = screen.getByTitle(longTitle);
      expect(titleElement).toBeInTheDocument();
    });
  });

  describe("CVA Variants", () => {
    it("applies default variant when not active", () => {
      render(<SessionListItem {...defaultProps} isActive={false} />);
      const item = screen.getByRole("option");

      // Default variant should have hover styles but not bg-muted
      expect(item).not.toHaveClass("bg-muted");
    });

    it("applies selected variant when active", () => {
      render(<SessionListItem {...defaultProps} isActive={true} />);
      const item = screen.getByRole("option");

      // Selected variant should have bg-muted and font-medium
      expect(item).toHaveClass("bg-muted");
      expect(item).toHaveClass("font-medium");
    });
  });

  describe("Unsaved Changes Indicator", () => {
    it("shows indicator when hasUnsavedChanges is true", () => {
      render(
        <SessionListItem {...defaultProps} hasUnsavedChanges isActive={true} />
      );

      const indicator = screen.getByLabelText("Unsaved changes");
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass("bg-amber-500");
    });

    it("does not show indicator when hasUnsavedChanges is false", () => {
      render(
        <SessionListItem
          {...defaultProps}
          hasUnsavedChanges={false}
          isActive={true}
        />
      );

      expect(
        screen.queryByLabelText("Unsaved changes")
      ).not.toBeInTheDocument();
    });
  });

  describe("Selection", () => {
    it("calls onSelect when clicked", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<SessionListItem {...defaultProps} onSelect={onSelect} />);

      await user.click(screen.getByRole("option"));

      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("has role='option'", () => {
      render(<SessionListItem {...defaultProps} />);
      expect(screen.getByRole("option")).toBeInTheDocument();
    });

    it("has aria-selected='true' when active", () => {
      render(<SessionListItem {...defaultProps} isActive={true} />);
      expect(screen.getByRole("option")).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    it("has aria-selected='false' when not active", () => {
      render(<SessionListItem {...defaultProps} isActive={false} />);
      expect(screen.getByRole("option")).toHaveAttribute(
        "aria-selected",
        "false"
      );
    });

    it("is a focusable div element with tabindex for keyboard accessibility", () => {
      render(<SessionListItem {...defaultProps} />);
      const item = screen.getByRole("option");
      expect(item.tagName).toBe("DIV");
      expect(item).toHaveAttribute("tabindex", "0");
    });
  });

  describe("Styling", () => {
    it("applies passed style prop for virtualization", () => {
      const style = {
        position: "absolute" as const,
        top: 0,
        left: 0,
        width: "100%",
        height: "56px",
        transform: "translateY(112px)",
      };
      render(<SessionListItem {...defaultProps} style={style} />);

      const item = screen.getByRole("option");
      expect(item).toHaveStyle({ position: "absolute" });
      expect(item).toHaveStyle({ transform: "translateY(112px)" });
    });
  });

  describe("Session Actions (Story 3.3)", () => {
    it("renders actions menu when action handlers provided", () => {
      render(
        <SessionListItem
          {...defaultProps}
          onDelete={vi.fn()}
          onExportJson={vi.fn()}
          onExportMarkdown={vi.fn()}
        />
      );

      expect(
        screen.getByRole("button", { name: ACTIONS_FOR_PATTERN })
      ).toBeInTheDocument();
    });

    it("does not render actions menu when no action handlers provided", () => {
      render(<SessionListItem {...defaultProps} />);

      expect(
        screen.queryByRole("button", { name: ACTIONS_FOR_PATTERN })
      ).not.toBeInTheDocument();
    });

    it("actions menu has group class parent for hover visibility", () => {
      render(
        <SessionListItem
          {...defaultProps}
          onDelete={vi.fn()}
          onExportJson={vi.fn()}
          onExportMarkdown={vi.fn()}
        />
      );

      const item = screen.getByRole("option");
      expect(item).toHaveClass("group");
    });
  });

  describe("Older Timestamps", () => {
    it("shows appropriate format for older sessions", () => {
      const oldDate = new Date();
      oldDate.setMinutes(oldDate.getMinutes() - 5);

      const session = createMockSession({ updatedAt: oldDate });
      render(<SessionListItem {...defaultProps} session={session} />);

      expect(screen.getByText(FIVE_MIN_AGO_PATTERN)).toBeInTheDocument();
    });

    it("shows 'Yesterday' for day-old sessions", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const session = createMockSession({ updatedAt: yesterday });
      render(<SessionListItem {...defaultProps} session={session} />);

      expect(screen.getByText(YESTERDAY_PATTERN)).toBeInTheDocument();
    });
  });
});
