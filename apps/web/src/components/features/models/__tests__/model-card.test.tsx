/**
 * ModelCard Component Tests
 * Story 2.2: Model Catalog & Cards
 *
 * Tests for model card display, CVA variants, and vulnerability warnings.
 * AC2: Model Card Details
 * AC4: Vulnerability Warnings
 */

import type { ModelMetadata } from "@continuum/inference";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModelCard } from "../model-card";

const mockModel: ModelMetadata = {
  id: "test-model",
  name: "Test Model",
  version: "1.0",
  description: "A test model for unit testing",
  requirements: {
    ramMb: 4096,
    gpuVramMb: 0,
    storageMb: 2000,
  },
  capabilities: ["general-chat", "code-generation"],
  limitations: ["no-image-understanding"],
  contextLength: 4096,
  license: {
    name: "MIT",
    url: "https://example.com/license",
    commercial: true,
  },
  vulnerabilities: [],
  downloadUrl: "https://example.com/model.gguf",
  sha256: "abc123def456",
};

describe("ModelCard", () => {
  describe("Basic Rendering (AC2)", () => {
    it("should render model name and description", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      expect(screen.getByText("Test Model")).toBeInTheDocument();
      expect(
        screen.getByText("A test model for unit testing")
      ).toBeInTheDocument();
    });

    it("should display version number (AC2)", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      expect(screen.getByText("v1.0")).toBeInTheDocument();
    });

    it("should display RAM requirements in GB format", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      expect(screen.getByText("4.0 GB")).toBeInTheDocument();
    });

    it("should display storage requirements in GB format", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      // 2000 MB = ~2.0 GB
      expect(screen.getByText("2.0 GB")).toBeInTheDocument();
    });

    it('should show "Not required" for zero GPU VRAM', () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      expect(screen.getByText("Not required")).toBeInTheDocument();
    });

    it("should show GPU VRAM when greater than zero", () => {
      const modelWithGpu = {
        ...mockModel,
        requirements: { ...mockModel.requirements, gpuVramMb: 6144 },
      };
      render(<ModelCard model={modelWithGpu} recommendation="recommended" />);

      expect(screen.getByText("6.0 GB")).toBeInTheDocument();
    });

    it("should display context length", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      expect(screen.getByText("4,096 tokens")).toBeInTheDocument();
    });
  });

  describe("Capabilities & Limitations (AC2)", () => {
    it("should display capabilities", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      expect(screen.getByText("General Chat")).toBeInTheDocument();
      expect(screen.getByText("Code Generation")).toBeInTheDocument();
    });

    it("should display limitations", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      expect(screen.getByText("No Image Understanding")).toBeInTheDocument();
    });
  });

  describe("License Information (AC2)", () => {
    it("should display license with link", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      const licenseLink = screen.getByRole("link", { name: "MIT" });
      expect(licenseLink).toHaveAttribute(
        "href",
        "https://example.com/license"
      );
      expect(licenseLink).toHaveAttribute("target", "_blank");
      expect(licenseLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should show commercial use indicator when allowed", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      expect(screen.getByText(/Commercial OK/)).toBeInTheDocument();
    });

    it("should not show commercial indicator when not allowed", () => {
      const nonCommercial = {
        ...mockModel,
        license: { ...mockModel.license, commercial: false },
      };
      render(<ModelCard model={nonCommercial} recommendation="recommended" />);

      expect(screen.queryByText(/Commercial OK/)).not.toBeInTheDocument();
    });
  });

  describe("Recommendation Badges (AC3)", () => {
    it("should show Recommended badge", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      expect(screen.getByText("Recommended")).toBeInTheDocument();
    });

    it("should show May be slow badge", () => {
      render(<ModelCard model={mockModel} recommendation="may-be-slow" />);

      expect(screen.getByText("May be slow")).toBeInTheDocument();
    });

    it("should show Not recommended badge", () => {
      render(<ModelCard model={mockModel} recommendation="not-recommended" />);

      expect(screen.getByText("Not recommended")).toBeInTheDocument();
    });
  });

  describe("Vulnerability Warnings (AC4)", () => {
    const modelWithVuln: ModelMetadata = {
      ...mockModel,
      vulnerabilities: [
        {
          id: "CVE-2024-0001",
          severity: "high",
          description: "Test vulnerability description",
          moreInfoUrl: "https://example.com/vuln",
        },
      ],
    };

    it("should show vulnerability warning when present", () => {
      render(<ModelCard model={modelWithVuln} recommendation="recommended" />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Security Warning")).toBeInTheDocument();
    });

    it("should display vulnerability ID as link", () => {
      render(<ModelCard model={modelWithVuln} recommendation="recommended" />);

      const vulnLink = screen.getByRole("link", { name: "CVE-2024-0001" });
      expect(vulnLink).toHaveAttribute("href", "https://example.com/vuln");
      expect(vulnLink).toHaveAttribute("target", "_blank");
    });

    it("should display vulnerability description", () => {
      render(<ModelCard model={modelWithVuln} recommendation="recommended" />);

      expect(
        screen.getByText(/Test vulnerability description/)
      ).toBeInTheDocument();
    });

    it("should not show warning when no vulnerabilities", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should handle multiple vulnerabilities", () => {
      const multiVuln: ModelMetadata = {
        ...mockModel,
        vulnerabilities: [
          {
            id: "CVE-2024-0001",
            severity: "high",
            description: "First vulnerability",
            moreInfoUrl: "https://example.com/vuln1",
          },
          {
            id: "CVE-2024-0002",
            severity: "critical",
            description: "Second vulnerability",
            moreInfoUrl: "https://example.com/vuln2",
          },
        ],
      };
      render(<ModelCard model={multiVuln} recommendation="recommended" />);

      expect(screen.getByText("CVE-2024-0001")).toBeInTheDocument();
      expect(screen.getByText("CVE-2024-0002")).toBeInTheDocument();
    });
  });

  describe("ARIA Accessibility (AC2)", () => {
    it("should have article role", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      expect(screen.getByRole("article")).toBeInTheDocument();
    });

    it("should have aria-labelledby pointing to model name", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      const article = screen.getByRole("article");
      expect(article).toHaveAttribute(
        "aria-labelledby",
        "model-test-model-name"
      );
    });

    it("should have data-slot attribute for styling hooks", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      const article = screen.getByRole("article");
      expect(article).toHaveAttribute("data-slot", "model-card");
    });
  });

  describe("CVA Variants", () => {
    it("should apply recommended variant styles", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      const article = screen.getByRole("article");
      expect(article.className).toMatch(/green/);
    });

    it("should apply may-be-slow variant styles", () => {
      render(<ModelCard model={mockModel} recommendation="may-be-slow" />);

      const article = screen.getByRole("article");
      expect(article.className).toMatch(/yellow/);
    });

    it("should apply not-recommended variant styles", () => {
      render(<ModelCard model={mockModel} recommendation="not-recommended" />);

      const article = screen.getByRole("article");
      expect(article.className).toMatch(/red/);
    });
  });

  describe("Select Action", () => {
    it("should render select button when onSelect provided", () => {
      const mockOnSelect = vi.fn();
      render(
        <ModelCard
          model={mockModel}
          onSelect={mockOnSelect}
          recommendation="recommended"
        />
      );

      expect(
        screen.getByRole("button", { name: "Select Model" })
      ).toBeInTheDocument();
    });

    it("should not render select button when onSelect not provided", () => {
      render(<ModelCard model={mockModel} recommendation="recommended" />);

      expect(
        screen.queryByRole("button", { name: "Select Model" })
      ).not.toBeInTheDocument();
    });

    it("should call onSelect with model id when clicked", async () => {
      const mockOnSelect = vi.fn();
      render(
        <ModelCard
          model={mockModel}
          onSelect={mockOnSelect}
          recommendation="recommended"
        />
      );

      const button = screen.getByRole("button", { name: "Select Model" });
      button.click();

      expect(mockOnSelect).toHaveBeenCalledWith("test-model");
    });
  });
});
