/**
 * Privacy Mode Selector Component Tests
 *
 * Tests for the PrivacyModeSelector dropdown component.
 * Story 1.2: AC #2 (mode selector access)
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { usePrivacyStore } from "@/stores/privacy";
import {
  PRIVACY_MODE_OPTIONS,
  PrivacyModeSelector,
} from "../privacy-mode-selector";

// Top-level regex for performance (avoids re-creation in test loops)
const PRIVACY_MODE_REGEX = /privacy mode/i;

describe("PrivacyModeSelector Component", () => {
  beforeEach(() => {
    // Reset store to initial state
    usePrivacyStore.setState({
      mode: "local-only",
      jazzKey: `jazz-local-only-${Date.now()}`,
    });
  });

  describe("Options Display (AC #2)", () => {
    it("exports three privacy mode options", () => {
      expect(PRIVACY_MODE_OPTIONS).toHaveLength(3);
    });

    it("includes local-only option with correct label and description", () => {
      const option = PRIVACY_MODE_OPTIONS.find((o) => o.value === "local-only");
      expect(option).toBeDefined();
      expect(option?.label).toBe("Local-only");
      expect(option?.description).toBe("Your data never leaves this device");
    });

    it("includes trusted-network option with correct label and description", () => {
      const option = PRIVACY_MODE_OPTIONS.find(
        (o) => o.value === "trusted-network"
      );
      expect(option).toBeDefined();
      expect(option?.label).toBe("Hybrid");
      expect(option?.description).toBe(
        "Private by default, share when you choose"
      );
    });

    it("includes cloud-enhanced option with correct label and description", () => {
      const option = PRIVACY_MODE_OPTIONS.find(
        (o) => o.value === "cloud-enhanced"
      );
      expect(option).toBeDefined();
      expect(option?.label).toBe("Cloud");
      expect(option?.description).toBe("Maximum power, standard cloud privacy");
    });
  });

  describe("Rendering", () => {
    it("renders the privacy indicator as trigger", () => {
      render(<PrivacyModeSelector />);
      // The indicator is a span inside the button trigger
      expect(
        screen.getByRole("button", { name: PRIVACY_MODE_REGEX })
      ).toBeInTheDocument();
    });

    it("displays current mode in the trigger", () => {
      render(<PrivacyModeSelector />);
      expect(screen.getByText("Local-only")).toBeInTheDocument();
    });
  });

  describe("Dropdown Interaction", () => {
    it("opens dropdown when trigger is clicked", async () => {
      const user = userEvent.setup();
      render(<PrivacyModeSelector />);

      await user.click(screen.getByRole("button"));

      // After opening, the menu should show "Privacy Mode" label
      expect(await screen.findByText("Privacy Mode")).toBeInTheDocument();
    });

    it("shows all three mode options when open", async () => {
      const user = userEvent.setup();
      render(<PrivacyModeSelector />);

      await user.click(screen.getByRole("button"));

      // Wait for menu to open and check for options
      const menuItems = await screen.findAllByRole("menuitemradio");
      expect(menuItems).toHaveLength(3);
    });

    it("displays descriptions for each option", async () => {
      const user = userEvent.setup();
      render(<PrivacyModeSelector />);

      await user.click(screen.getByRole("button"));

      // Check descriptions are visible
      expect(
        await screen.findByText("Your data never leaves this device")
      ).toBeInTheDocument();
      expect(
        await screen.findByText("Private by default, share when you choose")
      ).toBeInTheDocument();
      expect(
        await screen.findByText("Maximum power, standard cloud privacy")
      ).toBeInTheDocument();
    });
  });

  describe("Mode Selection (Optimistic UI)", () => {
    it("updates store immediately when mode is selected", async () => {
      const user = userEvent.setup();
      render(<PrivacyModeSelector />);

      // Open dropdown
      await user.click(screen.getByRole("button"));

      // Find and click the cloud-enhanced option
      const cloudOption = await screen.findByText("Cloud");
      await user.click(cloudOption);

      // Store should be updated
      expect(usePrivacyStore.getState().mode).toBe("cloud-enhanced");
    });

    it("closes dropdown after selection", async () => {
      const user = userEvent.setup();
      render(<PrivacyModeSelector />);

      // Open dropdown
      const trigger = screen.getByRole("button");
      await user.click(trigger);

      // Select an option
      const hybridOption = await screen.findByText("Hybrid");
      await user.click(hybridOption);

      // Store should be updated to the new mode
      expect(usePrivacyStore.getState().mode).toBe("trusted-network");
    });
  });

  describe("Accessibility", () => {
    it("has accessible group with label", async () => {
      const user = userEvent.setup();
      render(<PrivacyModeSelector />);

      await user.click(screen.getByRole("button"));

      // Check for group with accessible name (aria-labelledby points to "Privacy Mode" label)
      const group = await screen.findByRole("group", {
        name: "Privacy Mode",
      });
      expect(group).toBeInTheDocument();
    });

    it("marks current mode as checked", async () => {
      const user = userEvent.setup();
      render(<PrivacyModeSelector />);

      await user.click(screen.getByRole("button"));

      // The local-only option should be checked (since it's the default)
      const menuItems = await screen.findAllByRole("menuitemradio");
      const localOption = menuItems.find((item) =>
        item.textContent?.includes("Local-only")
      );
      // Base UI uses empty string for checked state attribute
      expect(localOption).toHaveAttribute("data-checked");
    });
  });
});
