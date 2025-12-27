/**
 * Privacy Health Check Component Tests
 *
 * Tests for the PrivacyHealthCheck component rendering and health calculation.
 * Story 1.6: AC #2 (health indicator states)
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePrivacyStore } from "@/stores/privacy";
import {
  calculateHealthStatus,
  PrivacyHealthCheck,
} from "../privacy-health-check";

describe("PrivacyHealthCheck Component", () => {
  beforeEach(() => {
    // Reset store to initial state
    usePrivacyStore.setState({
      mode: "local-only",
      jazzKey: `jazz-local-only-${Date.now()}`,
      networkLog: [],
      isDashboardOpen: false,
    });
  });

  describe("Rendering", () => {
    it("renders with data-slot attribute", () => {
      render(<PrivacyHealthCheck />);

      expect(
        document.querySelector('[data-slot="privacy-health-check"]')
      ).toBeInTheDocument();
    });

    it("has role=status for screen readers", () => {
      render(<PrivacyHealthCheck />);

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("has aria-live=polite for announcements", () => {
      render(<PrivacyHealthCheck />);

      const indicator = screen.getByRole("status");
      expect(indicator).toHaveAttribute("aria-live", "polite");
    });

    it("has descriptive aria-label", () => {
      render(<PrivacyHealthCheck />);

      const indicator = screen.getByRole("status");
      const ariaLabel = indicator.getAttribute("aria-label");

      expect(ariaLabel).toContain("Privacy health");
      expect(ariaLabel).toContain("Privacy Protected");
    });
  });

  describe("Green State (Secure) - AC #2", () => {
    it("shows Privacy Protected for local-only with no requests", () => {
      usePrivacyStore.setState({
        mode: "local-only",
        networkLog: [],
      });

      render(<PrivacyHealthCheck />);

      expect(screen.getByText("Privacy Protected")).toBeInTheDocument();
    });

    it("applies emerald styling for secure state", () => {
      usePrivacyStore.setState({
        mode: "local-only",
        networkLog: [],
      });

      render(<PrivacyHealthCheck />);

      const indicator = screen.getByRole("status");
      expect(indicator.className).toContain("emerald");
    });

    it("has tooltip explaining secure status", () => {
      usePrivacyStore.setState({
        mode: "local-only",
        networkLog: [],
      });

      render(<PrivacyHealthCheck />);

      const indicator = screen.getByRole("status");
      expect(indicator).toHaveAttribute(
        "title",
        "Local-only mode active. No external connections detected."
      );
    });
  });

  describe("Yellow State (Caution) - AC #2", () => {
    it("shows Partial Protection for trusted-network mode", () => {
      usePrivacyStore.setState({
        mode: "trusted-network",
        networkLog: [],
      });

      render(<PrivacyHealthCheck />);

      expect(screen.getByText("Partial Protection")).toBeInTheDocument();
    });

    it("shows Partial Protection for local-only with blocked requests", () => {
      usePrivacyStore.setState({
        mode: "local-only",
        networkLog: [
          {
            id: "1",
            timestamp: Date.now(),
            type: "fetch",
            url: "https://example.com",
            blocked: true,
          },
        ],
      });

      render(<PrivacyHealthCheck />);

      expect(screen.getByText("Partial Protection")).toBeInTheDocument();
    });

    it("applies amber styling for caution state", () => {
      usePrivacyStore.setState({
        mode: "trusted-network",
        networkLog: [],
      });

      render(<PrivacyHealthCheck />);

      const indicator = screen.getByRole("status");
      expect(indicator.className).toContain("amber");
    });
  });

  describe("Red State (Issue) - AC #2", () => {
    it("shows Privacy Concern for cloud-enhanced mode", () => {
      usePrivacyStore.setState({
        mode: "cloud-enhanced",
        networkLog: [],
      });

      render(<PrivacyHealthCheck />);

      expect(screen.getByText("Privacy Concern")).toBeInTheDocument();
    });

    it("shows Privacy Concern when requests were allowed (not blocked)", () => {
      usePrivacyStore.setState({
        mode: "local-only",
        networkLog: [
          {
            id: "1",
            timestamp: Date.now(),
            type: "fetch",
            url: "https://example.com",
            blocked: false, // Request was allowed through
          },
        ],
      });

      render(<PrivacyHealthCheck />);

      expect(screen.getByText("Privacy Concern")).toBeInTheDocument();
    });

    it("applies rose styling for issue state", () => {
      usePrivacyStore.setState({
        mode: "cloud-enhanced",
        networkLog: [],
      });

      render(<PrivacyHealthCheck />);

      const indicator = screen.getByRole("status");
      expect(indicator.className).toContain("rose");
    });
  });

  describe("Custom className", () => {
    it("applies additional className", () => {
      render(<PrivacyHealthCheck className="custom-class" />);

      const indicator = screen.getByRole("status");
      expect(indicator.className).toContain("custom-class");
    });
  });
});

describe("calculateHealthStatus Function", () => {
  describe("Secure Status", () => {
    it("returns secure for local-only with empty log", () => {
      expect(calculateHealthStatus("local-only", [])).toBe("secure");
    });
  });

  describe("Caution Status", () => {
    it("returns caution for trusted-network mode", () => {
      expect(calculateHealthStatus("trusted-network", [])).toBe("caution");
    });

    it("returns caution for local-only with blocked requests", () => {
      const log = [
        {
          id: "1",
          timestamp: Date.now(),
          type: "fetch" as const,
          url: "https://example.com",
          blocked: true,
        },
      ];
      expect(calculateHealthStatus("local-only", log)).toBe("caution");
    });
  });

  describe("Issue Status", () => {
    it("returns issue for cloud-enhanced mode", () => {
      expect(calculateHealthStatus("cloud-enhanced", [])).toBe("issue");
    });

    it("returns issue when there are allowed external requests", () => {
      const log = [
        {
          id: "1",
          timestamp: Date.now(),
          type: "fetch" as const,
          url: "https://example.com",
          blocked: false,
        },
      ];
      expect(calculateHealthStatus("local-only", log)).toBe("issue");
    });

    it("returns issue for trusted-network with allowed requests", () => {
      const log = [
        {
          id: "1",
          timestamp: Date.now(),
          type: "fetch" as const,
          url: "https://example.com",
          blocked: false,
        },
      ];
      expect(calculateHealthStatus("trusted-network", log)).toBe("issue");
    });
  });

  describe("Priority", () => {
    it("issue status takes priority over mode-based caution", () => {
      // Even in trusted-network mode, if there are allowed requests, it's an issue
      const log = [
        {
          id: "1",
          timestamp: Date.now(),
          type: "fetch" as const,
          url: "https://example.com",
          blocked: false,
        },
      ];
      expect(calculateHealthStatus("trusted-network", log)).toBe("issue");
    });
  });
});
