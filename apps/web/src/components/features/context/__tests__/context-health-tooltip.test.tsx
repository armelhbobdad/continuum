/**
 * Context Health Tooltip Tests
 *
 * Story 3.4: Context Health Indicators
 * Task 9.4: Test tooltip content accuracy
 * AC #4: Tooltip Statistics
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ContextHealth } from "@/lib/context/context-health";
import { ContextHealthTooltip } from "../context-health-tooltip";

describe("ContextHealthTooltip", () => {
  const createHealth = (
    overrides: Partial<ContextHealth> = {}
  ): ContextHealth => ({
    status: "healthy",
    percentage: 30,
    tokensUsed: 300,
    tokensRemaining: 700,
    messageCount: 5,
    maxContextLength: 1000,
    ...overrides,
  });

  it("renders children as trigger", () => {
    render(
      <ContextHealthTooltip health={createHealth()}>
        <span data-testid="trigger-content">Trigger</span>
      </ContextHealthTooltip>
    );

    expect(screen.getByTestId("trigger-content")).toBeInTheDocument();
  });

  it("shows tooltip content on hover", async () => {
    const user = userEvent.setup();
    const health = createHealth({
      percentage: 45,
      tokensUsed: 450,
      tokensRemaining: 550,
      messageCount: 10,
      maxContextLength: 1000,
    });

    render(
      <ContextHealthTooltip health={health}>
        <span data-testid="trigger">Trigger</span>
      </ContextHealthTooltip>
    );

    await user.hover(screen.getByTestId("trigger"));

    // Wait for tooltip to appear
    expect(
      await screen.findByTestId("context-health-tooltip")
    ).toBeInTheDocument();
  });

  it("displays percentage used (AC4)", async () => {
    const user = userEvent.setup();
    const health = createHealth({ percentage: 45.7 });

    render(
      <ContextHealthTooltip health={health}>
        <span data-testid="trigger">Trigger</span>
      </ContextHealthTooltip>
    );

    await user.hover(screen.getByTestId("trigger"));
    await screen.findByTestId("context-health-tooltip");

    expect(screen.getByText("Usage:")).toBeInTheDocument();
    expect(screen.getByText("46%")).toBeInTheDocument(); // Rounded
  });

  it("displays token count (AC4)", async () => {
    const user = userEvent.setup();
    const health = createHealth({ tokensUsed: 1234 });

    render(
      <ContextHealthTooltip health={health}>
        <span data-testid="trigger">Trigger</span>
      </ContextHealthTooltip>
    );

    await user.hover(screen.getByTestId("trigger"));
    await screen.findByTestId("context-health-tooltip");

    expect(screen.getByText("Tokens used:")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("displays message count (AC4)", async () => {
    const user = userEvent.setup();
    const health = createHealth({ messageCount: 42 });

    render(
      <ContextHealthTooltip health={health}>
        <span data-testid="trigger">Trigger</span>
      </ContextHealthTooltip>
    );

    await user.hover(screen.getByTestId("trigger"));
    await screen.findByTestId("context-health-tooltip");

    expect(screen.getByText("Messages:")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("displays model limit", async () => {
    const user = userEvent.setup();
    const health = createHealth({ maxContextLength: 4096 });

    render(
      <ContextHealthTooltip health={health}>
        <span data-testid="trigger">Trigger</span>
      </ContextHealthTooltip>
    );

    await user.hover(screen.getByTestId("trigger"));
    await screen.findByTestId("context-health-tooltip");

    expect(screen.getByText("Model limit:")).toBeInTheDocument();
    expect(screen.getByText("4,096")).toBeInTheDocument();
  });

  it("shows healthy status message", async () => {
    const user = userEvent.setup();
    const health = createHealth({ status: "healthy" });

    render(
      <ContextHealthTooltip health={health}>
        <span data-testid="trigger">Trigger</span>
      </ContextHealthTooltip>
    );

    await user.hover(screen.getByTestId("trigger"));
    await screen.findByTestId("context-health-tooltip");

    expect(screen.getByText("Context usage is healthy.")).toBeInTheDocument();
  });

  it("shows growing status message", async () => {
    const user = userEvent.setup();
    const health = createHealth({ status: "growing" });

    render(
      <ContextHealthTooltip health={health}>
        <span data-testid="trigger">Trigger</span>
      </ContextHealthTooltip>
    );

    await user.hover(screen.getByTestId("trigger"));
    await screen.findByTestId("context-health-tooltip");

    expect(
      screen.getByText("Context is growing. Consider wrapping up soon.")
    ).toBeInTheDocument();
  });

  it("shows critical status message with warning", async () => {
    const user = userEvent.setup();
    const health = createHealth({ status: "critical" });

    render(
      <ContextHealthTooltip health={health}>
        <span data-testid="trigger">Trigger</span>
      </ContextHealthTooltip>
    );

    await user.hover(screen.getByTestId("trigger"));
    await screen.findByTestId("context-health-tooltip");

    expect(
      screen.getByText(
        "Context is nearly full. Start a new session to avoid degraded responses."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Consider starting a new session.")
    ).toBeInTheDocument();
  });

  it("has data-slot for styling hooks", async () => {
    const user = userEvent.setup();

    render(
      <ContextHealthTooltip health={createHealth()}>
        <span data-testid="trigger">Trigger</span>
      </ContextHealthTooltip>
    );

    await user.hover(screen.getByTestId("trigger"));
    const tooltip = await screen.findByTestId("context-health-tooltip");

    expect(tooltip).toHaveAttribute("data-slot", "context-health-tooltip");
  });
});
