/**
 * Session Filters Component Tests
 *
 * Story 3.2: Session Search & Filtering
 * AC #3 (session filters)
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SessionFilterOptions } from "@/lib/sessions/filter-sessions";
import { SessionFilters } from "../session-filters";

// Top-level regex patterns for performance
const FILTERS_PATTERN = /filters/i;
const DATE_RANGE_PATTERN = /date range/i;
const MESSAGE_TYPE_PATTERN = /message type/i;
const CLEAR_FILTERS_PATTERN = /clear filters/i;

describe("SessionFilters", () => {
  const defaultFilters: SessionFilterOptions = {};

  it("renders filter panel with toggle button", () => {
    render(
      <SessionFilters filters={defaultFilters} onFiltersChange={vi.fn()} />
    );

    expect(
      screen.getByRole("button", { name: FILTERS_PATTERN })
    ).toBeInTheDocument();
  });

  it("expands filter panel when toggle clicked", async () => {
    const user = userEvent.setup();
    render(
      <SessionFilters filters={defaultFilters} onFiltersChange={vi.fn()} />
    );

    const toggle = screen.getByRole("button", { name: FILTERS_PATTERN });
    await user.click(toggle);

    // Using fieldset for semantic grouping
    expect(screen.getByRole("group")).toBeInTheDocument();
  });

  it("collapses filter panel when toggle clicked again", async () => {
    const user = userEvent.setup();
    render(
      <SessionFilters filters={defaultFilters} onFiltersChange={vi.fn()} />
    );

    const toggle = screen.getByRole("button", { name: FILTERS_PATTERN });
    await user.click(toggle);
    await user.click(toggle);

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("renders date range filter options", async () => {
    const user = userEvent.setup();
    render(
      <SessionFilters filters={defaultFilters} onFiltersChange={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: FILTERS_PATTERN }));

    expect(
      screen.getByRole("combobox", { name: DATE_RANGE_PATTERN })
    ).toBeInTheDocument();
  });

  it("calls onFiltersChange when date range is selected", async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SessionFilters
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
      />
    );

    await user.click(screen.getByRole("button", { name: FILTERS_PATTERN }));
    const dateSelect = screen.getByRole("combobox", {
      name: DATE_RANGE_PATTERN,
    });
    await user.selectOptions(dateSelect, "today");

    expect(onFiltersChange).toHaveBeenCalled();
  });

  it("renders message type filter options", async () => {
    const user = userEvent.setup();
    render(
      <SessionFilters filters={defaultFilters} onFiltersChange={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: FILTERS_PATTERN }));

    expect(
      screen.getByRole("combobox", { name: MESSAGE_TYPE_PATTERN })
    ).toBeInTheDocument();
  });

  it("calls onFiltersChange when message type is selected", async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SessionFilters
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
      />
    );

    await user.click(screen.getByRole("button", { name: FILTERS_PATTERN }));
    const messageTypeSelect = screen.getByRole("combobox", {
      name: MESSAGE_TYPE_PATTERN,
    });
    await user.selectOptions(messageTypeSelect, "with-ai");

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ messageType: "with-ai" })
    );
  });

  it("shows clear filters button when filters are active", async () => {
    const user = userEvent.setup();
    const activeFilters: SessionFilterOptions = { messageType: "with-ai" };
    render(
      <SessionFilters filters={activeFilters} onFiltersChange={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: FILTERS_PATTERN }));

    expect(
      screen.getByRole("button", { name: CLEAR_FILTERS_PATTERN })
    ).toBeInTheDocument();
  });

  it("clears all filters when clear button is clicked", async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup();
    const activeFilters: SessionFilterOptions = { messageType: "with-ai" };
    render(
      <SessionFilters
        filters={activeFilters}
        onFiltersChange={onFiltersChange}
      />
    );

    await user.click(screen.getByRole("button", { name: FILTERS_PATTERN }));
    await user.click(
      screen.getByRole("button", { name: CLEAR_FILTERS_PATTERN })
    );

    expect(onFiltersChange).toHaveBeenCalledWith({});
  });

  it("shows active filter count in toggle button", () => {
    const activeFilters: SessionFilterOptions = {
      messageType: "with-ai",
      dateRange: { start: new Date(), end: new Date() },
    };
    render(
      <SessionFilters filters={activeFilters} onFiltersChange={vi.fn()} />
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("has correct data-slot attribute", () => {
    render(
      <SessionFilters filters={defaultFilters} onFiltersChange={vi.fn()} />
    );

    const container = screen.getByRole("button", {
      name: FILTERS_PATTERN,
    }).parentElement;
    expect(container).toHaveAttribute("data-slot", "session-filters");
  });
});
