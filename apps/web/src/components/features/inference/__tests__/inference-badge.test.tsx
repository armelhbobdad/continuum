/**
 * InferenceBadge Tests
 *
 * Story 1.5: Inference Badge & Streaming UI
 * Task 7.1, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InferenceBadge } from "../inference-badge";

// Top-level regex patterns for performance
const GENERATING_LOCALLY_VIA_TEST_MODEL_PATTERN =
  /generating locally via test-model/i;
const GENERATED_LOCALLY_VIA_TEST_MODEL_PATTERN =
  /generated locally via test-model/i;
const GENERATION_FAILED_PATTERN = /generation failed/i;
const PHI_3_MINI_PATTERN = /phi-3-mini/;
const GENERATING_VIA_GPT4_PATTERN = /generating via gpt-4/i;
const LOCALLY_PATTERN = /locally/i;
const TIMING_2_3S_PATTERN = /2.3s/;
const TIMING_1_0S_PATTERN = /1.0s/;
const TOKENS_156_PATTERN = /156 tokens/;
const TOKENS_50_PATTERN = /50 tokens/;
const TOKENS_PATTERN = /tokens/;
const SWITCHING_TO_MISTRAL_PATTERN = /switching to mistral-7b/i;
const SWITCHING_TO_MODEL_PATTERN = /switching to model/i;

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
        GENERATING_LOCALLY_VIA_TEST_MODEL_PATTERN
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
        GENERATED_LOCALLY_VIA_TEST_MODEL_PATTERN
      );
    });

    it("renders with error state", () => {
      render(
        <InferenceBadge modelName="test-model" source="local" state="error" />
      );

      expect(screen.getByRole("status")).toHaveTextContent(
        GENERATION_FAILED_PATTERN
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

      expect(screen.getByRole("status")).toHaveTextContent(PHI_3_MINI_PATTERN);
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
        GENERATING_VIA_GPT4_PATTERN
      );
      expect(screen.getByRole("status")).not.toHaveTextContent(LOCALLY_PATTERN);
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

      expect(screen.getByRole("status")).toHaveTextContent(TIMING_2_3S_PATTERN);
      expect(screen.getByRole("status")).toHaveTextContent(TOKENS_156_PATTERN);
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

      expect(screen.getByRole("status")).not.toHaveTextContent(
        TIMING_1_0S_PATTERN
      );
      expect(screen.getByRole("status")).not.toHaveTextContent(
        TOKENS_50_PATTERN
      );
    });

    it("does not show timing when duration or tokenCount is missing", () => {
      render(
        <InferenceBadge
          modelName="test-model"
          source="local"
          state="complete"
        />
      );

      expect(screen.getByRole("status")).not.toHaveTextContent(TOKENS_PATTERN);
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
        GENERATED_LOCALLY_VIA_TEST_MODEL_PATTERN
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

  describe("Switching state (Story 2.4 Task 5.1-5.2)", () => {
    it("renders with switching state", () => {
      render(
        <InferenceBadge
          modelName="phi-3-mini"
          source="local"
          state="switching"
          switchingTo="mistral-7b"
        />
      );

      expect(screen.getByRole("status")).toHaveTextContent(
        SWITCHING_TO_MISTRAL_PATTERN
      );
    });

    it("shows generic message when switchingTo is not provided", () => {
      render(
        <InferenceBadge
          modelName="phi-3-mini"
          source="local"
          state="switching"
        />
      );

      expect(screen.getByRole("status")).toHaveTextContent(
        SWITCHING_TO_MODEL_PATTERN
      );
    });

    it("has amber styling for switching state", () => {
      const { container } = render(
        <InferenceBadge
          modelName="phi-3-mini"
          source="local"
          state="switching"
          switchingTo="mistral-7b"
        />
      );

      const badge = container.querySelector('[data-slot="inference-badge"]');
      expect(badge).toHaveClass("bg-amber-50");
      expect(badge).toHaveClass("border-amber-300");
    });

    it("has animate-pulse class when switching", () => {
      const { container } = render(
        <InferenceBadge
          modelName="phi-3-mini"
          source="local"
          state="switching"
          switchingTo="mistral-7b"
        />
      );

      const badge = container.querySelector('[data-slot="inference-badge"]');
      expect(badge).toHaveClass("animate-pulse");
    });

    it("has data-state attribute set to switching", () => {
      const { container } = render(
        <InferenceBadge
          modelName="phi-3-mini"
          source="local"
          state="switching"
          switchingTo="mistral-7b"
        />
      );

      const badge = container.querySelector('[data-slot="inference-badge"]');
      expect(badge).toHaveAttribute("data-state", "switching");
    });
  });
});
