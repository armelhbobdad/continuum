/**
 * InferenceBadge Tests
 *
 * Story 1.5: Inference Badge & Streaming UI
 * Task 7.1, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InferenceBadge } from "../inference-badge";

describe("InferenceBadge", () => {
  describe("Badge states (AC1, AC3)", () => {
    it("renders with generating state", () => {
      render(
        <InferenceBadge
          modelName="test-model"
          source="local"
          state="generating"
        />
      );

      expect(screen.getByRole("status")).toHaveTextContent(
        /generating locally via test-model/i
      );
    });

    it("renders with complete state", () => {
      render(
        <InferenceBadge
          modelName="test-model"
          source="local"
          state="complete"
        />
      );

      expect(screen.getByRole("status")).toHaveTextContent(
        /generated locally via test-model/i
      );
    });

    it("renders with error state", () => {
      render(
        <InferenceBadge modelName="test-model" source="local" state="error" />
      );

      expect(screen.getByRole("status")).toHaveTextContent(
        /generation failed/i
      );
    });
  });

  describe("Model name display (AC1)", () => {
    it("shows correct model name", () => {
      render(
        <InferenceBadge
          modelName="phi-3-mini"
          source="local"
          state="generating"
        />
      );

      expect(screen.getByRole("status")).toHaveTextContent(/phi-3-mini/);
    });
  });

  describe("Mode-aware styling (AC1, AC4, BC-003)", () => {
    it("has emerald styling for local source", () => {
      const { container } = render(
        <InferenceBadge
          modelName="test-model"
          source="local"
          state="generating"
        />
      );

      const badge = container.querySelector('[data-slot="inference-badge"]');
      expect(badge).toHaveClass("bg-emerald-50");
    });

    it("has neutral styling for cloud source", () => {
      const { container } = render(
        <InferenceBadge
          modelName="gpt-4"
          source="cloud:openai"
          state="generating"
        />
      );

      const badge = container.querySelector('[data-slot="inference-badge"]');
      expect(badge).toHaveClass("bg-slate-50");
    });

    it("shows cloud provider name for cloud source (AC4)", () => {
      render(
        <InferenceBadge
          modelName="gpt-4"
          source="cloud:openai"
          state="generating"
        />
      );

      expect(screen.getByRole("status")).toHaveTextContent(
        /generating via gpt-4/i
      );
      expect(screen.getByRole("status")).not.toHaveTextContent(/locally/i);
    });

    it("works with stub source for web fallback (BC-003)", () => {
      const { container } = render(
        <InferenceBadge
          modelName="stub-model"
          source="stub"
          state="generating"
        />
      );

      const badge = container.querySelector('[data-slot="inference-badge"]');
      // Stub should be treated as local-like (emerald) or have distinct styling
      expect(badge).toBeInTheDocument();
    });
  });

  describe("Timing display (AC3)", () => {
    it("shows timing info when complete with duration and tokenCount", () => {
      render(
        <InferenceBadge
          duration={2300}
          modelName="test-model"
          source="local"
          state="complete"
          tokenCount={156}
        />
      );

      expect(screen.getByRole("status")).toHaveTextContent(/2.3s/);
      expect(screen.getByRole("status")).toHaveTextContent(/156 tokens/);
    });

    it("does not show timing when generating", () => {
      render(
        <InferenceBadge
          duration={1000}
          modelName="test-model"
          source="local"
          state="generating"
          tokenCount={50}
        />
      );

      expect(screen.getByRole("status")).not.toHaveTextContent(/1.0s/);
      expect(screen.getByRole("status")).not.toHaveTextContent(/50 tokens/);
    });

    it("does not show timing when duration or tokenCount is missing", () => {
      render(
        <InferenceBadge
          modelName="test-model"
          source="local"
          state="complete"
        />
      );

      expect(screen.getByRole("status")).not.toHaveTextContent(/tokens/);
    });
  });

  describe("Accessibility (AC5)", () => {
    it("has role='status' for screen reader announcements", () => {
      render(
        <InferenceBadge
          modelName="test-model"
          source="local"
          state="generating"
        />
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("has aria-live='polite' for non-interrupting updates", () => {
      render(
        <InferenceBadge
          modelName="test-model"
          source="local"
          state="generating"
        />
      );

      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("aria-live", "polite");
    });

    it("has aria-atomic='true' for complete announcements", () => {
      render(
        <InferenceBadge
          modelName="test-model"
          source="local"
          state="complete"
        />
      );

      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("aria-atomic", "true");
    });
  });

  describe("Badge persistence (AC3, Task 7.7)", () => {
    it("persists after completion (displays complete state with data)", () => {
      const { rerender } = render(
        <InferenceBadge
          modelName="test-model"
          source="local"
          state="generating"
        />
      );

      // Transition to complete
      rerender(
        <InferenceBadge
          duration={5000}
          modelName="test-model"
          source="local"
          state="complete"
          tokenCount={200}
        />
      );

      // Badge should still be visible and show completed state
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(
        /generated locally via test-model/i
      );
    });
  });

  describe("Animation states", () => {
    it("has animate-pulse class when generating", () => {
      const { container } = render(
        <InferenceBadge
          modelName="test-model"
          source="local"
          state="generating"
        />
      );

      const badge = container.querySelector('[data-slot="inference-badge"]');
      expect(badge).toHaveClass("animate-pulse");
    });

    it("does not have animate-pulse when complete", () => {
      const { container } = render(
        <InferenceBadge
          modelName="test-model"
          source="local"
          state="complete"
        />
      );

      const badge = container.querySelector('[data-slot="inference-badge"]');
      expect(badge).not.toHaveClass("animate-pulse");
    });
  });
});
