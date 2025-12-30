/**
 * Session Search Component Tests
 *
 * Story 3.2: Session Search & Filtering
 * AC #1 (session search), AC #5 (search reset)
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionSearch } from "../session-search";

// Top-level regex patterns for performance
const CLEAR_SEARCH_PATTERN = /clear search/i;
const RESULTS_FOUND_PATTERN = /results? found/;

describe("SessionSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders search input with correct ARIA attributes", () => {
    render(<SessionSearch onSearch={vi.fn()} />);

    const input = screen.getByRole("searchbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-label", "Search sessions");
    expect(input).toHaveAttribute("placeholder", "Search sessions...");
  });

  it("debounces search input by 300ms", async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<SessionSearch onSearch={onSearch} />);

    const input = screen.getByRole("searchbox");
    await user.type(input, "test");

    // Should not be called immediately
    expect(onSearch).not.toHaveBeenCalledWith("test");

    // Advance timers by 300ms (debounce delay)
    await vi.advanceTimersByTimeAsync(300);

    // Now it should be called
    expect(onSearch).toHaveBeenCalledWith("test");
  });

  it("clears search when Escape is pressed", async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<SessionSearch onSearch={onSearch} />);

    const input = screen.getByRole("searchbox");
    await user.type(input, "test");
    await vi.advanceTimersByTimeAsync(300);

    await user.keyboard("{Escape}");

    expect(input).toHaveValue("");
    expect(onSearch).toHaveBeenLastCalledWith("");
  });

  it("clears search when clear button is clicked", async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<SessionSearch onSearch={onSearch} />);

    const input = screen.getByRole("searchbox");
    await user.type(input, "test");
    await vi.advanceTimersByTimeAsync(300);

    const clearButton = screen.getByRole("button", {
      name: CLEAR_SEARCH_PATTERN,
    });
    await user.click(clearButton);

    expect(input).toHaveValue("");
    expect(onSearch).toHaveBeenLastCalledWith("");
  });

  it("shows clear button only when input has value", async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<SessionSearch onSearch={onSearch} />);

    // Clear button should not be visible initially
    expect(
      screen.queryByRole("button", { name: CLEAR_SEARCH_PATTERN })
    ).not.toBeInTheDocument();

    const input = screen.getByRole("searchbox");
    await user.type(input, "test");

    // Clear button should now be visible
    expect(
      screen.getByRole("button", { name: CLEAR_SEARCH_PATTERN })
    ).toBeInTheDocument();
  });

  it("displays result count to screen readers", () => {
    render(<SessionSearch onSearch={vi.fn()} resultCount={5} />);

    expect(screen.getByText("5 results found")).toBeInTheDocument();
  });

  it("shows singular result text for one result", () => {
    render(<SessionSearch onSearch={vi.fn()} resultCount={1} />);

    expect(screen.getByText("1 result found")).toBeInTheDocument();
  });

  it("does not show result count when not provided", () => {
    render(<SessionSearch onSearch={vi.fn()} />);

    expect(screen.queryByText(RESULTS_FOUND_PATTERN)).not.toBeInTheDocument();
  });

  it("links input to result count via aria-describedby", () => {
    render(<SessionSearch onSearch={vi.fn()} resultCount={5} />);

    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("aria-describedby", "search-result-count");
  });

  it("announces result count changes via aria-live", () => {
    render(<SessionSearch onSearch={vi.fn()} resultCount={5} />);

    const resultCount = screen.getByText("5 results found");
    expect(resultCount).toHaveAttribute("aria-live", "polite");
  });

  it("applies filled state variant when query has value", async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<SessionSearch onSearch={onSearch} />);

    const input = screen.getByRole("searchbox");
    expect(input).toHaveClass("border-border");

    await user.type(input, "test");

    // Should apply filled state variant
    expect(input).toHaveClass("border-primary/50");
  });

  it("has correct data-slot attribute", () => {
    render(<SessionSearch onSearch={vi.fn()} />);

    const container = screen.getByRole("searchbox").parentElement;
    expect(container).toHaveAttribute("data-slot", "session-search");
  });

  it("invokes onClearSearch callback when provided", async () => {
    const onSearch = vi.fn();
    const onClearSearch = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<SessionSearch onClearSearch={onClearSearch} onSearch={onSearch} />);

    const input = screen.getByRole("searchbox");
    await user.type(input, "test");
    await vi.advanceTimersByTimeAsync(300);

    await user.keyboard("{Escape}");

    expect(onClearSearch).toHaveBeenCalled();
  });
});
