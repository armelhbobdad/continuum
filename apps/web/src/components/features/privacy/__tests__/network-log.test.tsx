/**
 * Network Log Component Tests
 *
 * Tests for the NetworkLog component rendering and functionality.
 * Story 1.6: AC #1 (network log display, empty state)
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { usePrivacyStore } from "@/stores/privacy";
import { NetworkLog } from "../network-log";

// Top-level regex patterns for performance
const RELATIVE_TIME_PATTERN = /\d+s ago/;

describe("NetworkLog Component", () => {
  beforeEach(() => {
    // Reset store to initial state
    usePrivacyStore.setState({
      mode: "local-only",
      jazzKey: `jazz-local-only-${Date.now()}`,
      networkLog: [],
      isDashboardOpen: false,
    });
  });

  describe("Empty State (AC #1)", () => {
    it("shows positive framing when log is empty", () => {
      render(<NetworkLog />);

      expect(screen.getByText("No network activity")).toBeInTheDocument();
      expect(screen.getByText("Your data stayed local")).toBeInTheDocument();
    });

    it("renders with role=status for screen readers", () => {
      render(<NetworkLog />);

      const emptyState = screen.getByRole("status");
      expect(emptyState).toBeInTheDocument();
    });

    it("has aria-live=polite for announcements", () => {
      render(<NetworkLog />);

      const emptyState = screen.getByRole("status");
      expect(emptyState).toHaveAttribute("aria-live", "polite");
    });

    it("has data-slot attribute", () => {
      render(<NetworkLog />);

      expect(
        document.querySelector('[data-slot="network-log"]')
      ).toBeInTheDocument();
    });

    it("renders emerald shield icon", () => {
      render(<NetworkLog />);

      // The shield icon should be within the emerald container
      const container = document.querySelector(".bg-emerald-100");
      expect(container).toBeInTheDocument();
    });
  });

  describe("Populated State", () => {
    beforeEach(() => {
      usePrivacyStore.setState({
        networkLog: [
          {
            id: "1",
            timestamp: Date.now() - 5000, // 5 seconds ago
            type: "fetch",
            url: "https://api.example.com/data",
            blocked: true,
            reason: "Privacy mode is local-only",
          },
          {
            id: "2",
            timestamp: Date.now() - 60_000, // 1 minute ago
            type: "websocket",
            url: "wss://socket.example.com",
            blocked: true,
            reason: "Privacy mode is local-only",
          },
        ],
      });
    });

    it("shows request count", () => {
      render(<NetworkLog />);

      expect(screen.getByText("2 requests logged")).toBeInTheDocument();
    });

    it("shows singular form for one request", () => {
      usePrivacyStore.setState({
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

      render(<NetworkLog />);

      expect(screen.getByText("1 request logged")).toBeInTheDocument();
    });

    it("renders table with semantic structure", () => {
      render(<NetworkLog />);

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByRole("table")).toHaveAttribute(
        "aria-label",
        "Network activity log"
      );
    });

    it("shows table headers", () => {
      render(<NetworkLog />);

      expect(screen.getByText("Time")).toBeInTheDocument();
      expect(screen.getByText("Type")).toBeInTheDocument();
      expect(screen.getByText("URL")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });

    it("displays request type correctly", () => {
      render(<NetworkLog />);

      expect(screen.getByText("Fetch")).toBeInTheDocument();
      expect(screen.getByText("WebSocket")).toBeInTheDocument();
    });

    it("shows blocked status with badge", () => {
      render(<NetworkLog />);

      const blockedBadges = screen.getAllByText("Blocked");
      expect(blockedBadges).toHaveLength(2);
    });

    it("shows relative time", () => {
      render(<NetworkLog />);

      // Should show something like "5s ago" for the first entry
      expect(screen.getByText(RELATIVE_TIME_PATTERN)).toBeInTheDocument();
    });
  });

  describe("Clear Log Action", () => {
    beforeEach(() => {
      usePrivacyStore.setState({
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
    });

    it("shows clear log button when log has entries", () => {
      render(<NetworkLog />);

      expect(
        screen.getByRole("button", { name: "Clear log" })
      ).toBeInTheDocument();
    });

    it("clears log when button is clicked", async () => {
      const user = userEvent.setup();
      render(<NetworkLog />);

      expect(screen.getByText("1 request logged")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Clear log" }));

      expect(screen.getByText("No network activity")).toBeInTheDocument();
    });
  });

  describe("URL Truncation", () => {
    it("truncates long URLs", () => {
      const longUrl =
        "https://api.example.com/very/long/path/that/should/be/truncated/for/display";
      usePrivacyStore.setState({
        networkLog: [
          {
            id: "1",
            timestamp: Date.now(),
            type: "fetch",
            url: longUrl,
            blocked: true,
          },
        ],
      });

      render(<NetworkLog />);

      // The truncated URL should end with ...
      const urlCell = screen.getByTitle(longUrl);
      expect(urlCell).toBeInTheDocument();
      expect(urlCell.textContent).toContain("...");
    });
  });

  describe("Allowed Requests", () => {
    it("shows allowed status when request was not blocked", () => {
      usePrivacyStore.setState({
        networkLog: [
          {
            id: "1",
            timestamp: Date.now(),
            type: "fetch",
            url: "https://example.com",
            blocked: false,
          },
        ],
      });

      render(<NetworkLog />);

      expect(screen.getByText("Allowed")).toBeInTheDocument();
    });
  });

  describe("Request Type Display", () => {
    it("displays SSE for eventsource type", () => {
      usePrivacyStore.setState({
        networkLog: [
          {
            id: "1",
            timestamp: Date.now(),
            type: "eventsource",
            url: "https://example.com/events",
            blocked: true,
          },
        ],
      });

      render(<NetworkLog />);

      expect(screen.getByText("SSE")).toBeInTheDocument();
    });

    it("displays XHR for xhr type", () => {
      usePrivacyStore.setState({
        networkLog: [
          {
            id: "1",
            timestamp: Date.now(),
            type: "xhr",
            url: "https://example.com/api",
            blocked: true,
          },
        ],
      });

      render(<NetworkLog />);

      expect(screen.getByText("XHR")).toBeInTheDocument();
    });
  });
});
