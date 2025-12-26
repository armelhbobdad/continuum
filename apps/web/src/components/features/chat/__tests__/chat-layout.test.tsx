/**
 * Chat Layout Component Tests
 *
 * Tests for the ChatLayout component structure and layout.
 * Story 1.3: AC #1 (main view layout)
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ChatLayout } from "../chat-layout";

describe("ChatLayout Component", () => {
  describe("Rendering", () => {
    it("renders with data-slot attribute", () => {
      render(<ChatLayout />);
      const layout = screen.getByTestId("chat-layout");
      expect(layout).toHaveAttribute("data-slot", "chat-layout");
    });

    it("renders sidebar section", () => {
      render(<ChatLayout />);
      expect(screen.getByRole("complementary")).toBeInTheDocument();
    });

    it("renders main content section", () => {
      render(<ChatLayout />);
      expect(screen.getByRole("main")).toBeInTheDocument();
    });
  });

  describe("Layout Structure (AC #1)", () => {
    it("sidebar has correct width class for desktop", () => {
      render(<ChatLayout />);
      const sidebar = screen.getByRole("complementary");
      // w-70 is 280px (70 * 4 = 280)
      expect(sidebar.className).toContain("w-70");
    });

    it("main content has flex-1 for remaining space", () => {
      render(<ChatLayout />);
      const main = screen.getByRole("main");
      expect(main.className).toContain("flex-1");
    });

    it("sidebar is off-screen on mobile by default", () => {
      render(<ChatLayout />);
      const sidebar = screen.getByRole("complementary");
      // Translated off-screen by default on mobile
      expect(sidebar.className).toContain("-translate-x-full");
    });
  });

  describe("Mobile Sidebar Toggle", () => {
    it("renders mobile toggle button", () => {
      render(<ChatLayout />);
      expect(
        screen.getByRole("button", { name: /sessions/i })
      ).toBeInTheDocument();
    });

    it("toggle button opens sidebar on mobile", async () => {
      const user = userEvent.setup();
      render(<ChatLayout />);

      const toggleBtn = screen.getByRole("button", { name: /sessions/i });
      await user.click(toggleBtn);

      const sidebar = screen.getByRole("complementary");
      expect(sidebar.className).toContain("translate-x-0");
    });

    it("toggle button closes sidebar when open", async () => {
      const user = userEvent.setup();
      render(<ChatLayout />);

      // Open sidebar
      const toggleBtn = screen.getByRole("button", { name: /sessions/i });
      await user.click(toggleBtn);

      // Close sidebar
      const closeBtn = screen.getByRole("button", { name: /close/i });
      await user.click(closeBtn);

      const sidebar = screen.getByRole("complementary");
      expect(sidebar.className).toContain("-translate-x-full");
    });

    it("toggle button has aria-expanded attribute", async () => {
      const user = userEvent.setup();
      render(<ChatLayout />);

      const toggleBtn = screen.getByRole("button", { name: /sessions/i });
      expect(toggleBtn).toHaveAttribute("aria-expanded", "false");

      await user.click(toggleBtn);
      expect(screen.getByRole("button", { name: /close/i })).toHaveAttribute(
        "aria-expanded",
        "true"
      );
    });
  });

  describe("Accessibility", () => {
    it("sidebar has aria-label for screen readers", () => {
      render(<ChatLayout />);
      const sidebar = screen.getByRole("complementary");
      expect(sidebar).toHaveAttribute("aria-label", "Chat sessions");
    });

    it("main content has aria-label", () => {
      render(<ChatLayout />);
      const main = screen.getByRole("main");
      expect(main).toHaveAttribute("aria-label", "Chat messages");
    });
  });
});
