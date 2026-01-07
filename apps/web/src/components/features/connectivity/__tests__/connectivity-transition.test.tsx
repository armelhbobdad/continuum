import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the hook
vi.mock("@/hooks/use-connectivity-transition", () => ({
  useConnectivityTransition: vi.fn(),
}));

/**
 * ConnectivityTransition Component Tests
 *
 * Story 4.4: AC1, AC4
 * Tests visual states and accessibility of the connectivity transition wrapper.
 */
describe("ConnectivityTransition", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("renders children correctly", async () => {
    const { useConnectivityTransition } = await import(
      "@/hooks/use-connectivity-transition"
    );
    vi.mocked(useConnectivityTransition).mockReturnValue({
      transitionState: "stable",
      partialResponse: null,
      isTransitioning: false,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
      onTransitionEvent: vi.fn(),
    });

    const { ConnectivityTransition } = await import(
      "../connectivity-transition"
    );
    render(
      <ConnectivityTransition>
        <div data-testid="child-content">Test Content</div>
      </ConnectivityTransition>
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("renders with stable state (no visual indicator ring)", async () => {
    const { useConnectivityTransition } = await import(
      "@/hooks/use-connectivity-transition"
    );
    vi.mocked(useConnectivityTransition).mockReturnValue({
      transitionState: "stable",
      partialResponse: null,
      isTransitioning: false,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
      onTransitionEvent: vi.fn(),
    });

    const { ConnectivityTransition } = await import(
      "../connectivity-transition"
    );
    render(
      <ConnectivityTransition>
        <div>Content</div>
      </ConnectivityTransition>
    );

    const wrapper = screen.getByTestId("connectivity-transition");
    expect(wrapper).toHaveAttribute("data-state", "stable");
    // Stable state should NOT have amber or green ring classes
    expect(wrapper.className).not.toMatch(/ring-amber/);
    expect(wrapper.className).not.toMatch(/ring-green/);
  });

  it("renders with transitioning state (amber ring)", async () => {
    const { useConnectivityTransition } = await import(
      "@/hooks/use-connectivity-transition"
    );
    vi.mocked(useConnectivityTransition).mockReturnValue({
      transitionState: "transitioning",
      partialResponse: null,
      isTransitioning: true,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
      onTransitionEvent: vi.fn(),
    });

    const { ConnectivityTransition } = await import(
      "../connectivity-transition"
    );
    render(
      <ConnectivityTransition>
        <div>Content</div>
      </ConnectivityTransition>
    );

    const wrapper = screen.getByTestId("connectivity-transition");
    expect(wrapper).toHaveAttribute("data-state", "transitioning");
    expect(wrapper.className).toMatch(/ring-amber/);
  });

  it("renders with recovering state (green pulse)", async () => {
    const { useConnectivityTransition } = await import(
      "@/hooks/use-connectivity-transition"
    );
    vi.mocked(useConnectivityTransition).mockReturnValue({
      transitionState: "recovering",
      partialResponse: null,
      isTransitioning: true,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
      onTransitionEvent: vi.fn(),
    });

    const { ConnectivityTransition } = await import(
      "../connectivity-transition"
    );
    render(
      <ConnectivityTransition>
        <div>Content</div>
      </ConnectivityTransition>
    );

    const wrapper = screen.getByTestId("connectivity-transition");
    expect(wrapper).toHaveAttribute("data-state", "recovering");
    expect(wrapper.className).toMatch(/ring-green/);
    expect(wrapper.className).toMatch(/animate-pulse/);
  });

  it("has correct data-slot attribute", async () => {
    const { useConnectivityTransition } = await import(
      "@/hooks/use-connectivity-transition"
    );
    vi.mocked(useConnectivityTransition).mockReturnValue({
      transitionState: "stable",
      partialResponse: null,
      isTransitioning: false,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
      onTransitionEvent: vi.fn(),
    });

    const { ConnectivityTransition } = await import(
      "../connectivity-transition"
    );
    render(
      <ConnectivityTransition>
        <div>Content</div>
      </ConnectivityTransition>
    );

    expect(screen.getByTestId("connectivity-transition")).toHaveAttribute(
      "data-slot",
      "connectivity-transition"
    );
  });

  it("has aria-busy during transition", async () => {
    const { useConnectivityTransition } = await import(
      "@/hooks/use-connectivity-transition"
    );
    vi.mocked(useConnectivityTransition).mockReturnValue({
      transitionState: "transitioning",
      partialResponse: null,
      isTransitioning: true,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
      onTransitionEvent: vi.fn(),
    });

    const { ConnectivityTransition } = await import(
      "../connectivity-transition"
    );
    render(
      <ConnectivityTransition>
        <div>Content</div>
      </ConnectivityTransition>
    );

    expect(screen.getByTestId("connectivity-transition")).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });

  it("applies custom className", async () => {
    const { useConnectivityTransition } = await import(
      "@/hooks/use-connectivity-transition"
    );
    vi.mocked(useConnectivityTransition).mockReturnValue({
      transitionState: "stable",
      partialResponse: null,
      isTransitioning: false,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
      onTransitionEvent: vi.fn(),
    });

    const { ConnectivityTransition } = await import(
      "../connectivity-transition"
    );
    render(
      <ConnectivityTransition className="custom-class">
        <div>Content</div>
      </ConnectivityTransition>
    );

    expect(screen.getByTestId("connectivity-transition")).toHaveClass(
      "custom-class"
    );
  });

  it("showIndicator=false disables visual feedback", async () => {
    const { useConnectivityTransition } = await import(
      "@/hooks/use-connectivity-transition"
    );
    vi.mocked(useConnectivityTransition).mockReturnValue({
      transitionState: "transitioning",
      partialResponse: null,
      isTransitioning: true,
      preservePartialResponse: vi.fn(),
      retryPartialResponse: vi.fn(),
      clearPartialResponse: vi.fn(),
      onTransitionEvent: vi.fn(),
    });

    const { ConnectivityTransition } = await import(
      "../connectivity-transition"
    );
    render(
      <ConnectivityTransition showIndicator={false}>
        <div>Content</div>
      </ConnectivityTransition>
    );

    const wrapper = screen.getByTestId("connectivity-transition");
    // When showIndicator is false, no ring classes should be applied
    expect(wrapper.className).not.toMatch(/ring-amber/);
    expect(wrapper.className).not.toMatch(/ring-green/);
  });
});
