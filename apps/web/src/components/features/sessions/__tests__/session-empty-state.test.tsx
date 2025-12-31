/**
 * Session Empty State Component Tests
 *
 * Story 3.2: Session Search & Filtering
 * AC #4 (empty search state)
 * Task 5.4: Empty state component
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SessionEmptyState } from "../session-empty-state";

// Top-level regex patterns for performance
const NO_SESSIONS_MATCH_PATTERN = /no sessions match/i;
const NO_SESSIONS_MATCH_TEST_PATTERN = /no sessions match "test"/i;
const CLEAR_SEARCH_PATTERN = /clear search/i;
const XSS_TEST_PATTERN =
  /no sessions match "<script>alert\('xss'\)<\/script>"/i;

describe("SessionEmptyState", () => {
  it("renders default empty state when no search query", () => {
    render(<SessionEmptyState />);

    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
    expect(
      screen.queryByText(NO_SESSIONS_MATCH_PATTERN)
    ).not.toBeInTheDocument();
  });

  it("renders search empty state when search query provided", () => {
    render(<SessionEmptyState searchQuery="test" />);

    expect(
      screen.getByText(NO_SESSIONS_MATCH_TEST_PATTERN)
    ).toBeInTheDocument();
    expect(screen.queryByText("No conversations yet")).not.toBeInTheDocument();
  });

  it("shows clear search button when onClearSearch provided", () => {
    render(<SessionEmptyState onClearSearch={vi.fn()} searchQuery="test" />);

    expect(
      screen.getByRole("button", { name: CLEAR_SEARCH_PATTERN })
    ).toBeInTheDocument();
  });

  it("does not show clear search button when onClearSearch not provided", () => {
    render(<SessionEmptyState searchQuery="test" />);

    expect(
      screen.queryByRole("button", { name: CLEAR_SEARCH_PATTERN })
    ).not.toBeInTheDocument();
  });

  it("calls onClearSearch when clear button clicked", async () => {
    const onClearSearch = vi.fn();
    const user = userEvent.setup();

    render(
      <SessionEmptyState onClearSearch={onClearSearch} searchQuery="test" />
    );

    await user.click(
      screen.getByRole("button", { name: CLEAR_SEARCH_PATTERN })
    );

    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });

  it("renders search icon when search query provided", () => {
    render(<SessionEmptyState searchQuery="test" />);

    // The icon is hidden from accessibility tree but should be in DOM
    const container = screen.getByText(NO_SESSIONS_MATCH_PATTERN).parentElement;
    expect(
      container?.querySelector('[aria-hidden="true"]')
    ).toBeInTheDocument();
  });

  it("has correct data-slot attribute", () => {
    render(<SessionEmptyState />);

    const container = screen
      .getByText("No conversations yet")
      .closest("[data-slot]");
    expect(container).toHaveAttribute("data-slot", "session-empty-state");
  });

  it("applies correct styling", () => {
    render(<SessionEmptyState searchQuery="test" />);

    const container = screen
      .getByText(NO_SESSIONS_MATCH_PATTERN)
      .closest("[data-slot]");
    expect(container).toHaveClass("flex");
    expect(container).toHaveClass("flex-col");
    expect(container).toHaveClass("items-center");
    expect(container).toHaveClass("justify-center");
  });

  it("escapes special characters in search query", () => {
    render(<SessionEmptyState searchQuery="<script>alert('xss')</script>" />);

    // Should render as text, not HTML
    expect(screen.getByText(XSS_TEST_PATTERN)).toBeInTheDocument();
  });
});
