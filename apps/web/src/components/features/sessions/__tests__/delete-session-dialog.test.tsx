/**
 * Delete Session Dialog Tests
 *
 * Story 3.3: Session Deletion & Export
 * AC #1 (confirmation dialog), AC #2 (deletion)
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DeleteSessionDialog } from "../delete-session-dialog";

describe("DeleteSessionDialog", () => {
  it("renders nothing when not open", () => {
    render(
      <DeleteSessionDialog
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open={false}
        sessionTitle="Test Session"
      />
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("renders dialog with alertdialog role when open", async () => {
    render(
      <DeleteSessionDialog
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open={true}
        sessionTitle="Test Session"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
  });

  it("displays session title in warning message", async () => {
    render(
      <DeleteSessionDialog
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open={true}
        sessionTitle="My Important Session"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/my important session/i)).toBeInTheDocument();
    });
  });

  it("displays permanent deletion warning", async () => {
    render(
      <DeleteSessionDialog
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open={true}
        sessionTitle="Test Session"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });
  });

  it("calls onConfirm when delete button clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <DeleteSessionDialog
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        open={true}
        sessionTitle="Test Session"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /delete/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <DeleteSessionDialog
        onCancel={onCancel}
        onConfirm={vi.fn()}
        open={true}
        sessionTitle="Test Session"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
