"use client";

/**
 * ModelCard Component
 * Story 2.2: Model Catalog & Cards
 * Story 2.3: Model Download Manager (download button integration)
 * Story 2.5: Model Integrity Verification (verification badge, version pinning)
 *
 * Displays model specifications, capabilities, and hardware compatibility.
 * Uses CVA for recommendation-based styling variants.
 *
 * AC2: Model Card Details (FR26)
 * AC4: Vulnerability Warnings (FR33)
 * Story 2.3 AC1-5: Download lifecycle integration
 * Story 2.5 AC2: Verified badge display
 * Story 2.5 AC5: Version pinning badge
 *
 * ADR-MODEL-003: CVA variants for card visual states
 */

import type { ModelMetadata, VerificationStatus } from "@continuum/inference";
import type { ModelRecommendation } from "@continuum/platform";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useModelStore } from "@/stores/models";
import { ModelDownloadButton } from "./model-download-button";
import { VerificationBadge } from "./verification-badge";
import { PinnedVersionBadge } from "./version-pin-toggle";

/**
 * CVA variants for ModelCard based on hardware recommendation.
 * ADR-MODEL-003: Consistent with Epic 1 CVA patterns
 */
const cardVariants = cva(
  // Base styles
  "rounded-lg border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2",
  {
    variants: {
      recommendation: {
        recommended: "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
        "may-be-slow":
          "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20",
        "not-recommended": "border-red-500/50 bg-red-50/50 dark:bg-red-950/20",
      },
    },
    defaultVariants: {
      recommendation: "recommended",
    },
  }
);

export interface ModelCardProps extends VariantProps<typeof cardVariants> {
  /** Model metadata to display */
  model: ModelMetadata;
  /** Hardware-based recommendation */
  recommendation: ModelRecommendation;
  /** Callback when model is selected */
  onSelect?: (modelId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ModelCard Component
 *
 * Displays model specifications and hardware compatibility.
 * AC2: Detailed specifications display
 * AC4: Vulnerability warnings
 */
export function ModelCard({
  model,
  recommendation,
  onSelect,
  className,
}: ModelCardProps) {
  const hasVulnerabilities = model.vulnerabilities.length > 0;
  const downloadedModels = useModelStore((s) => s.downloadedModels);
  const verificationStatus = useModelStore((s) => s.verificationStatus);
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const isDownloaded = downloadedModels.includes(model.id);
  const isSelected = selectedModelId === model.id;
  const verification = verificationStatus[model.id];

  // Derive verification display status
  const getVerificationDisplayStatus = (): VerificationStatus => {
    if (!isDownloaded) {
      return "unverified";
    }
    if (!verification) {
      return "unverified";
    }
    return verification.verified ? "verified" : "failed";
  };

  return (
    <article
      aria-labelledby={`model-${model.id}-name`}
      className={cn(cardVariants({ recommendation }), className)}
      data-slot="model-card"
    >
      {/* Header with name, version, and badge */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-lg" id={`model-${model.id}-name`}>
            {model.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              v{model.version}
            </span>
            <PinnedVersionBadge modelId={model.id} />
            {Boolean(isDownloaded) && (
              <VerificationBadge
                status={getVerificationDisplayStatus()}
                timestamp={verification?.timestamp}
              />
            )}
          </div>
        </div>
        <RecommendationBadge recommendation={recommendation} />
      </div>

      {/* Description */}
      <p className="mt-2 text-muted-foreground text-sm">{model.description}</p>

      {/* Specifications */}
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground">RAM Required</dt>
          <dd className="font-medium">{formatMb(model.requirements.ramMb)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Storage</dt>
          <dd className="font-medium">
            {formatMb(model.requirements.storageMb)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">GPU VRAM</dt>
          <dd className="font-medium">
            {model.requirements.gpuVramMb > 0
              ? formatMb(model.requirements.gpuVramMb)
              : "Not required"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Context</dt>
          <dd className="font-medium">
            {model.contextLength.toLocaleString()} tokens
          </dd>
        </div>
      </dl>

      {/* Capabilities */}
      <div className="mt-4">
        <h4 className="font-medium text-sm">Capabilities</h4>
        <div className="mt-1 flex flex-wrap gap-1">
          {model.capabilities.map((cap) => (
            <span
              className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs"
              key={cap}
            >
              {formatCapability(cap)}
            </span>
          ))}
        </div>
      </div>

      {/* Limitations */}
      {model.limitations.length > 0 && (
        <div className="mt-3">
          <h4 className="font-medium text-muted-foreground text-sm">
            Limitations
          </h4>
          <ul className="mt-1 list-inside list-disc text-muted-foreground text-xs">
            {model.limitations.map((lim) => (
              <li key={lim}>{formatLimitation(lim)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* License */}
      <div className="mt-4 text-muted-foreground text-xs">
        License:{" "}
        <a
          className="underline hover:text-foreground"
          href={model.license.url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {model.license.name}
        </a>
        {Boolean(model.license.commercial) && " (Commercial OK)"}
      </div>

      {/* Vulnerability Warning (AC4) */}
      {Boolean(hasVulnerabilities) && (
        <div
          className="mt-4 rounded border border-red-500 bg-red-50 p-3 dark:bg-red-950/30"
          role="alert"
        >
          <h4 className="font-semibold text-red-700 text-sm dark:text-red-400">
            Security Warning
          </h4>
          <ul className="mt-1 text-red-600 text-xs dark:text-red-300">
            {model.vulnerabilities.map((vuln) => (
              <li key={vuln.id}>
                <a
                  className="underline"
                  href={vuln.moreInfoUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {vuln.id}
                </a>
                : {vuln.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Download Button (Story 2.3) */}
      <div className="mt-4">
        <ModelDownloadButton
          className="w-full"
          downloadUrl={model.downloadUrl}
          model={model}
        />
      </div>

      {/* Select Action - only show for downloaded models */}
      {Boolean(onSelect && isDownloaded) && (
        <button
          className={cn(
            "mt-2 w-full rounded px-4 py-2 font-medium text-sm",
            isSelected
              ? "cursor-default border border-primary bg-primary/10 text-primary"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
          )}
          disabled={isSelected}
          onClick={() => onSelect?.(model.id)}
          type="button"
        >
          {isSelected ? "Selected" : "Select Model"}
        </button>
      )}
    </article>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format MB to human-readable string (GB if >= 1024)
 */
function formatMb(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

/**
 * Format capability slug to display text
 * "general-chat" -> "General Chat"
 */
function formatCapability(cap: string): string {
  return cap
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Format limitation slug to display text
 * "no-image-understanding" -> "No Image Understanding"
 */
function formatLimitation(lim: string): string {
  return lim
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ============================================================================
// Sub-components
// ============================================================================

interface RecommendationBadgeProps {
  recommendation: ModelRecommendation;
}

/**
 * Badge showing hardware recommendation status
 */
function RecommendationBadge({ recommendation }: RecommendationBadgeProps) {
  const colors: Record<ModelRecommendation, string> = {
    recommended: "bg-green-500 text-white",
    "may-be-slow": "bg-yellow-500 text-black",
    "not-recommended": "bg-red-500 text-white",
  };

  const labels: Record<ModelRecommendation, string> = {
    recommended: "Recommended",
    "may-be-slow": "May be slow",
    "not-recommended": "Not recommended",
  };

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-medium text-xs",
        colors[recommendation]
      )}
    >
      {labels[recommendation]}
    </span>
  );
}
