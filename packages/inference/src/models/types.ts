/**
 * Model Registry Types
 * Story 2.2: Model Catalog & Cards
 *
 * Defines types for model metadata, capabilities, limitations,
 * licensing, and security vulnerabilities.
 *
 * ADR-MODEL-001: Static model registry for bundle optimization
 */

/** Model capability categories */
export type ModelCapability =
  | "general-chat"
  | "code-generation"
  | "summarization"
  | "translation"
  | "creative-writing";

/** Model limitations */
export type ModelLimitation =
  | "no-image-understanding"
  | "no-code-execution"
  | "limited-context"
  | "english-only";

/** License types */
export interface ModelLicense {
  /** License name (e.g., "Apache 2.0", "MIT") */
  name: string;
  /** Link to license text */
  url: string;
  /** Whether commercial use is allowed */
  commercial: boolean;
}

/**
 * Security vulnerability info (FR33)
 * AC4: Vulnerability warnings display
 */
export interface ModelVulnerability {
  /** Vulnerability identifier (e.g., "CVE-2024-XXXX") */
  id: string;
  /** Severity level */
  severity: "low" | "medium" | "high" | "critical";
  /** Brief description */
  description: string;
  /** URL for more details */
  moreInfoUrl: string;
  /** Version that fixes the issue (if applicable) */
  patchedInVersion?: string;
}

/**
 * Complete model metadata (FR26)
 * AC2: Model Card Details
 */
export interface ModelMetadata {
  /** Unique identifier (e.g., "phi-3-mini") */
  id: string;
  /** Display name (e.g., "Phi-3 Mini") */
  name: string;
  /** Version string (e.g., "3.8b-4bit") */
  version: string;
  /** Short description */
  description: string;

  /** Hardware requirements (FR26) */
  requirements: {
    /** Minimum RAM in MB */
    ramMb: number;
    /** GPU VRAM in MB (0 for CPU-only) */
    gpuVramMb: number;
    /** Download + unpacked size in MB */
    storageMb: number;
  };

  /** Model capabilities */
  capabilities: ModelCapability[];
  /** Model limitations */
  limitations: ModelLimitation[];
  /** Max context window tokens */
  contextLength: number;

  /** License information */
  license: ModelLicense;
  /** Known security vulnerabilities (FR33) */
  vulnerabilities: ModelVulnerability[];

  /** Download URL for GGUF model weights */
  downloadUrl: string;
  /** Expected SHA-256 hash for verification (Story 2.5). Optional - if not provided, verification is skipped. */
  sha256?: string;
  /**
   * Direct URL to tokenizer.json file on HuggingFace.
   * Downloaded alongside the model and stored in the app's models folder.
   * Required because GGUF files often don't embed tokenizers in a format Kalosm can use.
   */
  tokenizerUrl: string;
}
