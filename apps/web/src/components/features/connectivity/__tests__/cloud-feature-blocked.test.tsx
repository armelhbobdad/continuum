import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { usePrivacyStore } from "@/stores/privacy";
import { CloudFeatureBlocked } from "../cloud-feature-blocked";

/** Regex patterns for test assertions */
const UNAVAILABLE_MESSAGE_PATTERN = /Cloud Sync is unavailable/i;
const AIRPLANE_MODE_REASON_PATTERN = /Airplane Mode is active/i;
const LOCAL_ALTERNATIVE_PATTERN = /Use local inference instead/i;
const DISABLE_BUTTON_PATTERN = /disable airplane mode/i;

/**
 * CloudFeatureBlocked Component Tests
 *
 * Story 4.2: AC3 - Cloud Feature Unavailability Message
 * Tests message display, alternatives, and quick disable functionality.
 */
describe("CloudFeatureBlocked", () => {
  beforeEach(() => {
    usePrivacyStore.setState({
      mode: "cloud-enhanced",
      airplaneMode: true,
      previousMode: "cloud-enhanced",
      jazzKey: "test-key",
      networkLog: [],
      isDashboardOpen: false,
    });
  });

  it("renders blocked message", () => {
    render(<CloudFeatureBlocked featureName="Cloud Sync" />);
    expect(screen.getByText(UNAVAILABLE_MESSAGE_PATTERN)).toBeInTheDocument();
  });

  it("shows Airplane Mode as the reason", () => {
    render(<CloudFeatureBlocked featureName="Cloud Sync" />);
    expect(screen.getByText(AIRPLANE_MODE_REASON_PATTERN)).toBeInTheDocument();
  });

  it("suggests local alternative when provided", () => {
    render(
      <CloudFeatureBlocked
        featureName="Cloud Inference"
        localAlternative="Use local inference instead"
      />
    );
    expect(screen.getByText(LOCAL_ALTERNATIVE_PATTERN)).toBeInTheDocument();
  });

  it("shows disable button", () => {
    render(<CloudFeatureBlocked featureName="Cloud Sync" />);
    expect(
      screen.getByRole("button", { name: DISABLE_BUTTON_PATTERN })
    ).toBeInTheDocument();
  });

  it("disables airplane mode when button clicked", () => {
    render(<CloudFeatureBlocked featureName="Cloud Sync" />);

    fireEvent.click(
      screen.getByRole("button", { name: DISABLE_BUTTON_PATTERN })
    );

    expect(usePrivacyStore.getState().airplaneMode).toBe(false);
  });

  it("applies custom className", () => {
    render(
      <CloudFeatureBlocked className="custom-class" featureName="Cloud Sync" />
    );
    expect(screen.getByTestId("cloud-feature-blocked")).toHaveClass(
      "custom-class"
    );
  });

  it("has correct data-slot attribute", () => {
    render(<CloudFeatureBlocked featureName="Cloud Sync" />);
    expect(screen.getByTestId("cloud-feature-blocked")).toHaveAttribute(
      "data-slot",
      "cloud-feature-blocked"
    );
  });
});
