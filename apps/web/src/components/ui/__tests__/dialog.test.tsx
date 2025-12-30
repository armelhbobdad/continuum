import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../dialog";

describe("Dialog", () => {
  it("renders trigger button", () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText("Open Dialog")).toBeInTheDocument();
  });

  it("opens dialog when trigger is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
          <DialogDescription>Test Description</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByText("Open Dialog"));

    await waitFor(() => {
      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test Description")).toBeInTheDocument();
    });
  });

  it("closes dialog when close button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
          <DialogClose>Close</DialogClose>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByText("Open Dialog"));

    await waitFor(() => {
      expect(screen.getByText("Test Title")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Close"));

    await waitFor(() => {
      expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
    });
  });

  it("renders with default size variant", async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByText("Open Dialog"));

    await waitFor(() => {
      const content = screen.getByRole("dialog");
      expect(content).toHaveClass("max-w-md");
    });
  });

  it("renders with sm size variant", async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent size="sm">
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByText("Open Dialog"));

    await waitFor(() => {
      const content = screen.getByRole("dialog");
      expect(content).toHaveClass("max-w-sm");
    });
  });

  it("renders with lg size variant", async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent size="lg">
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByText("Open Dialog"));

    await waitFor(() => {
      const content = screen.getByRole("dialog");
      expect(content).toHaveClass("max-w-lg");
    });
  });

  it("renders backdrop with aria-hidden", async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByText("Open Dialog"));

    await waitFor(() => {
      const backdrop = document.querySelector('[data-slot="dialog-backdrop"]');
      expect(backdrop).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("has correct data-slot attributes", async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
          <DialogDescription>Test Description</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    expect(
      document.querySelector('[data-slot="dialog-trigger"]')
    ).toBeInTheDocument();

    await user.click(screen.getByText("Open Dialog"));

    await waitFor(() => {
      expect(
        document.querySelector('[data-slot="dialog-content"]')
      ).toBeInTheDocument();
      expect(
        document.querySelector('[data-slot="dialog-title"]')
      ).toBeInTheDocument();
      expect(
        document.querySelector('[data-slot="dialog-description"]')
      ).toBeInTheDocument();
    });
  });
});
