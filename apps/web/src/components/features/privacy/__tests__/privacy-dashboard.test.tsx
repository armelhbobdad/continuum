/**
 * Privacy Dashboard Component Tests
 *
 * Tests for the PrivacyDashboard component rendering and integration.
 * Story 1.6: AC #3 (verify link), AC #5 (dashboard access)
 */
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { usePrivacyStore } from "@/stores/privacy";
import { PrivacyDashboard } from "../privacy-dashboard";

// Mock navigator.platform for keyboard shortcut display
const mockNavigator = {
  platform: "MacIntel",
};

Object.defineProperty(window, "navigator", {
  value: mockNavigator,
  writable: true,
});

describe("PrivacyDashboard Component", () => {
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
    it("does not render when dashboard is closed", () => {
      render(<PrivacyDashboard />);

      expect(screen.queryByText("Privacy Dashboard")).not.toBeInTheDocument();
    });

    it("renders when dashboard is open", () => {
      usePrivacyStore.setState({ isDashboardOpen: true });
      render(<PrivacyDashboard />);

      expect(screen.getByText("Privacy Dashboard")).toBeInTheDocument();
    });

    it("has data-slot attribute", () => {
      usePrivacyStore.setState({ isDashboardOpen: true });
      render(<PrivacyDashboard />);

      expect(
        document.querySelector('[data-slot="privacy-dashboard"]')
      ).toBeInTheDocument();
    });
  });

  describe("Content Sections", () => {
    beforeEach(() => {
      usePrivacyStore.setState({ isDashboardOpen: true });
    });

    it("shows Privacy Health Check indicator", () => {
      render(<PrivacyDashboard />);

      expect(screen.getByText("Privacy Protected")).toBeInTheDocument();
    });

    it("shows current mode with Privacy Indicator", () => {
      render(<PrivacyDashboard />);

      expect(screen.getByText("Current mode:")).toBeInTheDocument();
      expect(screen.getByText("Local-only")).toBeInTheDocument();
    });

    it("shows Network Activity section", () => {
      render(<PrivacyDashboard />);

      expect(screen.getByText("Network Activity")).toBeInTheDocument();
    });

    it("shows NetworkLog component (empty state)", () => {
      render(<PrivacyDashboard />);

      expect(screen.getByText("No network activity")).toBeInTheDocument();
      expect(screen.getByText("Your data stayed local")).toBeInTheDocument();
    });
  });

  describe("Verify Independently Section (AC #3)", () => {
    beforeEach(() => {
      usePrivacyStore.setState({ isDashboardOpen: true });
    });

    it("shows Verify Independently section", () => {
      render(<PrivacyDashboard />);

      expect(screen.getByText("Verify Independently")).toBeInTheDocument();
    });

    it("shows explanation text", () => {
      render(<PrivacyDashboard />);

      expect(
        screen.getByText(
          /Don't take our word for it\. Use external tools to verify your privacy\./
        )
      ).toBeInTheDocument();
    });

    it("shows verification guide link", () => {
      render(<PrivacyDashboard />);

      const link = screen.getByRole("link", {
        name: /View verification guide/i,
      });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        "href",
        "https://docs.continuum.ai/verify-privacy"
      );
    });

    it("link opens in new tab with security attributes", () => {
      render(<PrivacyDashboard />);

      const link = screen.getByRole("link", {
        name: /View verification guide/i,
      });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Keyboard Shortcut Display (AC #5)", () => {
    beforeEach(() => {
      usePrivacyStore.setState({ isDashboardOpen: true });
    });

    it("shows keyboard shortcut for Mac", () => {
      mockNavigator.platform = "MacIntel";
      render(<PrivacyDashboard />);

      expect(screen.getByText(/Cmd\+Shift\+P/)).toBeInTheDocument();
    });

    it("shows keyboard shortcut for Windows/Linux", () => {
      mockNavigator.platform = "Win32";
      render(<PrivacyDashboard />);

      expect(screen.getByText(/Ctrl\+Shift\+P/)).toBeInTheDocument();
    });
  });

  describe("Close Button", () => {
    beforeEach(() => {
      usePrivacyStore.setState({ isDashboardOpen: true });
    });

    it("has close button with aria-label", () => {
      render(<PrivacyDashboard />);

      const closeButton = screen.getByRole("button", {
        name: /close privacy dashboard/i,
      });
      expect(closeButton).toBeInTheDocument();
    });

    it("closes dashboard when close button clicked", async () => {
      const user = userEvent.setup();
      render(<PrivacyDashboard />);

      expect(screen.getByText("Privacy Dashboard")).toBeInTheDocument();

      const closeButton = screen.getByRole("button", {
        name: /close privacy dashboard/i,
      });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText("Privacy Dashboard")).not.toBeInTheDocument();
      });
    });
  });

  describe("Dashboard Open from Indicator (AC #5)", () => {
    it("dashboard opens when openDashboard is called", () => {
      render(<PrivacyDashboard />);

      expect(screen.queryByText("Privacy Dashboard")).not.toBeInTheDocument();

      act(() => {
        usePrivacyStore.getState().openDashboard();
      });

      expect(screen.getByText("Privacy Dashboard")).toBeInTheDocument();
    });

    it("dashboard closes when closeDashboard is called", () => {
      usePrivacyStore.setState({ isDashboardOpen: true });
      render(<PrivacyDashboard />);

      expect(screen.getByText("Privacy Dashboard")).toBeInTheDocument();

      act(() => {
        usePrivacyStore.getState().closeDashboard();
      });

      expect(screen.queryByText("Privacy Dashboard")).not.toBeInTheDocument();
    });
  });

  describe("Integration with NetworkLog", () => {
    beforeEach(() => {
      usePrivacyStore.setState({
        isDashboardOpen: true,
        networkLog: [
          {
            id: "1",
            timestamp: Date.now(),
            type: "fetch",
            url: "https://blocked.example.com",
            blocked: true,
            reason: "Privacy mode is local-only",
          },
        ],
      });
    });

    it("shows network log entries when present", () => {
      render(<PrivacyDashboard />);

      expect(screen.getByText("1 request logged")).toBeInTheDocument();
    });

    it("reflects health check status based on log", () => {
      render(<PrivacyDashboard />);

      // With blocked requests, status should be caution
      expect(screen.getByText("Partial Protection")).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("opens dashboard in under 300ms", async () => {
      // Threshold set to 300ms to account for CI runner variance
      // and JSDOM rendering overhead. Catches major regressions
      // without flaking on slow environments.
      render(<PrivacyDashboard />);

      const start = performance.now();
      act(() => {
        usePrivacyStore.getState().openDashboard();
      });
      const end = performance.now();

      expect(screen.getByText("Privacy Dashboard")).toBeInTheDocument();
      expect(end - start).toBeLessThan(300);
    });
  });

  describe("Escape Key", () => {
    it("closes dashboard when Escape is pressed", async () => {
      const user = userEvent.setup();
      usePrivacyStore.setState({ isDashboardOpen: true });
      render(<PrivacyDashboard />);

      expect(screen.getByText("Privacy Dashboard")).toBeInTheDocument();

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByText("Privacy Dashboard")).not.toBeInTheDocument();
      });
    });
  });
});
