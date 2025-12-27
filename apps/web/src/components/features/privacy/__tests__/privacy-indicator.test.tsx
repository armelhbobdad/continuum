/**
 * Privacy Indicator Component Tests
 *
 * Tests for the PrivacyIndicator component rendering and styling.
 * Story 1.2: AC #1 (indicator visibility), AC #3 (mode switch performance)
 */
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePrivacyStore } from "@/stores/privacy";
import { PrivacyIndicator } from "../privacy-indicator";

describe("PrivacyIndicator Component", () => {
  beforeEach(() => {
    // Reset store to initial state
    usePrivacyStore.setState({
      mode: "local-only",
      jazzKey: `jazz-local-only-${Date.now()}`,
    });
  });

  describe("Rendering", () => {
    it("renders with data-slot attribute", () => {
      render(<PrivacyIndicator />);
      // Default is button, use getByRole("button")
      const indicator = screen.getByRole("button");
      expect(indicator).toHaveAttribute("data-slot", "privacy-indicator");
    });

    it("displays mode label", () => {
      render(<PrivacyIndicator />);
      expect(screen.getByText("Local-only")).toBeInTheDocument();
    });

    it("renders as span with role=status when as='span'", () => {
      render(<PrivacyIndicator as="span" />);
      const indicator = screen.getByRole("status");
      expect(indicator).toBeInTheDocument();
      expect(indicator.tagName.toLowerCase()).toBe("span");
    });
  });

  describe("Mode-Specific Styling", () => {
    it("applies emerald styling for local-only mode", () => {
      usePrivacyStore.setState({ mode: "local-only" });
      render(<PrivacyIndicator />);

      const indicator = screen.getByRole("button");
      expect(indicator.className).toContain("emerald");
    });

    it("applies sky styling for trusted-network mode", () => {
      usePrivacyStore.setState({ mode: "trusted-network" });
      render(<PrivacyIndicator />);

      const indicator = screen.getByRole("button");
      expect(indicator.className).toContain("sky");
    });

    it("applies slate styling for cloud-enhanced mode", () => {
      usePrivacyStore.setState({ mode: "cloud-enhanced" });
      render(<PrivacyIndicator />);

      const indicator = screen.getByRole("button");
      expect(indicator.className).toContain("slate");
    });
  });

  describe("Labels and Descriptions", () => {
    it("shows Local-only label for local-only mode", () => {
      usePrivacyStore.setState({ mode: "local-only" });
      render(<PrivacyIndicator />);
      expect(screen.getByText("Local-only")).toBeInTheDocument();
    });

    it("shows Hybrid label for trusted-network mode", () => {
      usePrivacyStore.setState({ mode: "trusted-network" });
      render(<PrivacyIndicator />);
      expect(screen.getByText("Hybrid")).toBeInTheDocument();
    });

    it("shows Cloud label for cloud-enhanced mode", () => {
      usePrivacyStore.setState({ mode: "cloud-enhanced" });
      render(<PrivacyIndicator />);
      expect(screen.getByText("Cloud")).toBeInTheDocument();
    });
  });

  describe("Accessibility (AC #1)", () => {
    it("button has descriptive aria-label including dashboard action", () => {
      render(<PrivacyIndicator />);
      const indicator = screen.getByRole("button");
      const ariaLabel = indicator.getAttribute("aria-label");

      expect(ariaLabel).toContain("Privacy mode");
      expect(ariaLabel).toContain("Local-only");
      expect(ariaLabel).toContain("Click to open Privacy Dashboard");
    });

    it("span variant has role=status for screen reader announcements", () => {
      render(<PrivacyIndicator as="span" />);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("span variant has aria-live=polite for mode change announcements", () => {
      render(<PrivacyIndicator as="span" />);
      const indicator = screen.getByRole("status");
      expect(indicator).toHaveAttribute("aria-live", "polite");
    });

    it("span variant does not include dashboard action in aria-label", () => {
      render(<PrivacyIndicator as="span" />);
      const indicator = screen.getByRole("status");
      const ariaLabel = indicator.getAttribute("aria-label");

      expect(ariaLabel).toContain("Privacy mode");
      expect(ariaLabel).not.toContain("Click to open");
    });

    it("updates aria-label when mode changes", () => {
      const { rerender } = render(<PrivacyIndicator />);

      // Wrap state update in act to avoid React warnings
      act(() => {
        usePrivacyStore.setState({ mode: "cloud-enhanced" });
      });
      rerender(<PrivacyIndicator />);

      const indicator = screen.getByRole("button");
      const ariaLabel = indicator.getAttribute("aria-label");

      expect(ariaLabel).toContain("Cloud");
      expect(ariaLabel).toContain("Maximum power");
    });
  });

  describe("Click Interaction", () => {
    it("calls onClick handler when clicked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<PrivacyIndicator onClick={handleClick} />);

      await user.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("is keyboard accessible (Enter/Space)", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<PrivacyIndicator onClick={handleClick} />);

      const indicator = screen.getByRole("button");
      indicator.focus();

      await user.keyboard("{Enter}");
      expect(handleClick).toHaveBeenCalledTimes(1);

      await user.keyboard(" ");
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe("Performance (AC #3)", () => {
    it("mode switch updates indicator within 500ms", () => {
      const { rerender } = render(<PrivacyIndicator />);

      const start = performance.now();
      // Wrap state update in act to avoid React warnings
      act(() => {
        usePrivacyStore.setState({ mode: "cloud-enhanced" });
      });
      rerender(<PrivacyIndicator />);
      const end = performance.now();

      expect(screen.getByText("Cloud")).toBeInTheDocument();
      expect(end - start).toBeLessThan(500);
    });
  });
});
