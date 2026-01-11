import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePrivacyStore } from "@/stores/privacy";
import { AirplaneModeToggle } from "../airplane-mode-toggle";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

/**
 * AirplaneModeToggle Component Tests
 *
 * Story 4.2: AC1, AC5 - Airplane Mode Toggle
 * Tests toggle functionality, state management, and accessibility.
 */
describe("AirplaneModeToggle", () => {
  beforeEach(() => {
    usePrivacyStore.setState({
      mode: "trusted-network",
      airplaneMode: false,
      previousMode: null,
      jazzKey: "test-key",
      networkLog: [],
      isDashboardOpen: false,
    });
    vi.clearAllMocks();
  });

  it("renders toggle button", () => {
    render(<AirplaneModeToggle />);
    expect(screen.getByTestId("airplane-mode-toggle")).toBeInTheDocument();
  });

  it("shows inactive state when off", () => {
    render(<AirplaneModeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("shows active state when on", () => {
    usePrivacyStore.setState({ airplaneMode: true });
    render(<AirplaneModeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("enables airplane mode on click when off", async () => {
    const { toast } = await import("sonner");
    render(<AirplaneModeToggle />);

    fireEvent.click(screen.getByRole("button"));

    expect(usePrivacyStore.getState().airplaneMode).toBe(true);
    expect(toast.success).toHaveBeenCalledWith(
      "Airplane Mode enabled",
      expect.any(Object)
    );
  });

  it("disables airplane mode on click when on", async () => {
    usePrivacyStore.setState({
      airplaneMode: true,
      previousMode: "trusted-network",
    });
    const { toast } = await import("sonner");
    render(<AirplaneModeToggle />);

    fireEvent.click(screen.getByRole("button"));

    expect(usePrivacyStore.getState().airplaneMode).toBe(false);
    expect(toast.success).toHaveBeenCalledWith(
      "Airplane Mode disabled",
      expect.any(Object)
    );
  });

  it("calls onBeforeEnable when provided and proceeds on true", async () => {
    const onBeforeEnable = vi.fn().mockResolvedValue(true);
    render(<AirplaneModeToggle onBeforeEnable={onBeforeEnable} />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(onBeforeEnable).toHaveBeenCalled();
      expect(usePrivacyStore.getState().airplaneMode).toBe(true);
    });
  });

  it("cancels enable when onBeforeEnable returns false", async () => {
    const onBeforeEnable = vi.fn().mockResolvedValue(false);
    render(<AirplaneModeToggle onBeforeEnable={onBeforeEnable} />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(onBeforeEnable).toHaveBeenCalled();
      expect(usePrivacyStore.getState().airplaneMode).toBe(false);
    });
  });

  it("has correct data-slot attribute", () => {
    render(<AirplaneModeToggle />);
    expect(screen.getByTestId("airplane-mode-toggle")).toHaveAttribute(
      "data-slot",
      "airplane-mode-toggle"
    );
  });

  it("has accessible label when inactive", () => {
    render(<AirplaneModeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Enable Airplane Mode"
    );
  });

  it("updates accessible label when active", () => {
    usePrivacyStore.setState({ airplaneMode: true });
    render(<AirplaneModeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Disable Airplane Mode"
    );
  });

  it("applies custom className", () => {
    render(<AirplaneModeToggle className="custom-class" />);
    expect(screen.getByTestId("airplane-mode-toggle")).toHaveClass(
      "custom-class"
    );
  });

  it("shows correct toast message for cloud-enhanced mode", async () => {
    usePrivacyStore.setState({
      airplaneMode: true,
      previousMode: "cloud-enhanced",
    });
    const { toast } = await import("sonner");
    render(<AirplaneModeToggle />);

    fireEvent.click(screen.getByRole("button"));

    expect(toast.success).toHaveBeenCalledWith(
      "Airplane Mode disabled",
      expect.objectContaining({
        description: "Returned to Cloud mode",
      })
    );
  });
});
