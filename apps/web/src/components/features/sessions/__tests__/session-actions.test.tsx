/**
 * Session Actions Component Tests
 *
 * Story 3.3: Session Deletion & Export
 * AC #1 (delete), AC #2 (deletion), AC #3 (export)
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "@/stores/session";
import { SessionActions } from "../session-actions";

const mockSession: Session = {
  id: "test-session-1",
  title: "Test Session",
  messages: [],
  createdAt: new Date("2025-12-30T10:00:00Z"),
  updatedAt: new Date("2025-12-30T12:00:00Z"),
};

describe("SessionActions", () => {
  it("renders actions menu trigger", () => {
    render(
      <SessionActions
        onDelete={vi.fn()}
        onExportJson={vi.fn()}
        onExportMarkdown={vi.fn()}
        session={mockSession}
      />
    );

    expect(
      screen.getByRole("button", { name: /actions for/i })
    ).toBeInTheDocument();
  });

  it("opens menu on trigger click", async () => {
    const user = userEvent.setup();

    render(
      <SessionActions
        onDelete={vi.fn()}
        onExportJson={vi.fn()}
        onExportMarkdown={vi.fn()}
        session={mockSession}
      />
    );

    await user.click(screen.getByRole("button", { name: /actions for/i }));

    await waitFor(() => {
      expect(screen.getByText("Export as JSON")).toBeInTheDocument();
      expect(screen.getByText("Export as Markdown")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
  });

  it("calls onExportJson when JSON export clicked", async () => {
    const user = userEvent.setup();
    const onExportJson = vi.fn();

    render(
      <SessionActions
        onDelete={vi.fn()}
        onExportJson={onExportJson}
        onExportMarkdown={vi.fn()}
        session={mockSession}
      />
    );

    await user.click(screen.getByRole("button", { name: /actions for/i }));

    await waitFor(() => {
      expect(screen.getByText("Export as JSON")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Export as JSON"));

    expect(onExportJson).toHaveBeenCalledTimes(1);
  });

  it("calls onExportMarkdown when Markdown export clicked", async () => {
    const user = userEvent.setup();
    const onExportMarkdown = vi.fn();

    render(
      <SessionActions
        onDelete={vi.fn()}
        onExportJson={vi.fn()}
        onExportMarkdown={onExportMarkdown}
        session={mockSession}
      />
    );

    await user.click(screen.getByRole("button", { name: /actions for/i }));

    await waitFor(() => {
      expect(screen.getByText("Export as Markdown")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Export as Markdown"));

    expect(onExportMarkdown).toHaveBeenCalledTimes(1);
  });

  it("opens delete confirmation dialog when delete clicked", async () => {
    const user = userEvent.setup();

    render(
      <SessionActions
        onDelete={vi.fn()}
        onExportJson={vi.fn()}
        onExportMarkdown={vi.fn()}
        session={mockSession}
      />
    );

    await user.click(screen.getByRole("button", { name: /actions for/i }));

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
  });

  it("calls onDelete when delete confirmed", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <SessionActions
        onDelete={onDelete}
        onExportJson={vi.fn()}
        onExportMarkdown={vi.fn()}
        session={mockSession}
      />
    );

    // Open menu and click delete
    await user.click(screen.getByRole("button", { name: /actions for/i }));
    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Delete"));

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    // Confirm delete
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("closes dialog when cancel clicked", async () => {
    const user = userEvent.setup();

    render(
      <SessionActions
        onDelete={vi.fn()}
        onExportJson={vi.fn()}
        onExportMarkdown={vi.fn()}
        session={mockSession}
      />
    );

    // Open menu and click delete
    await user.click(screen.getByRole("button", { name: /actions for/i }));
    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Delete"));

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    // Click cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("has session title in aria-label for trigger", () => {
    render(
      <SessionActions
        onDelete={vi.fn()}
        onExportJson={vi.fn()}
        onExportMarkdown={vi.fn()}
        session={mockSession}
      />
    );

    expect(
      screen.getByRole("button", { name: /actions for test session/i })
    ).toBeInTheDocument();
  });
});
