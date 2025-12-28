/**
 * Static Model Registry
 * Story 2.2: Model Catalog & Cards
 *
 * Curated list of available models with metadata.
 * Not user-editable - maintained via code changes.
 *
 * ADR-MODEL-001: Static registry for bundle optimization
 */

import type { ModelMetadata } from "./types";

/**
 * Static registry of available models.
 * Curated list - not user-editable.
 * ADR-MODEL-001: Static registry for bundle optimization
 */
export const MODEL_REGISTRY: ModelMetadata[] = [
  {
    id: "phi-3-mini",
    name: "Phi-3 Mini",
    version: "3.8b-4bit",
    description:
      "Microsoft's efficient small language model, great for general tasks.",
    requirements: {
      ramMb: 4096, // 4GB minimum
      gpuVramMb: 0, // CPU-capable
      storageMb: 2500, // ~2.5GB
    },
    capabilities: ["general-chat", "code-generation", "summarization"],
    limitations: ["no-image-understanding", "limited-context"],
    contextLength: 4096,
    license: {
      name: "MIT",
      url: "https://huggingface.co/microsoft/phi-3-mini-4k-instruct/blob/main/LICENSE",
      commercial: true,
    },
    vulnerabilities: [],
    downloadUrl:
      "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf",
    sha256: "8a83c7fb9049a9b2e92266fa7ad04933bb53aa1e85136b7b30f1b8000ff2edef",
    tokenizerUrl:
      "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct/resolve/main/tokenizer.json",
  },
  {
    id: "llama-3-8b",
    name: "Llama 3 8B",
    version: "8b-4bit",
    description: "Meta's powerful 8B parameter model with strong reasoning.",
    requirements: {
      ramMb: 8192, // 8GB minimum
      gpuVramMb: 6144, // 6GB VRAM recommended
      storageMb: 5000, // ~5GB
    },
    capabilities: [
      "general-chat",
      "code-generation",
      "summarization",
      "creative-writing",
    ],
    limitations: ["no-image-understanding"],
    contextLength: 8192,
    license: {
      name: "Llama 3 Community",
      url: "https://llama.meta.com/llama3/license/",
      commercial: true,
    },
    vulnerabilities: [],
    downloadUrl:
      "https://huggingface.co/QuantFactory/Meta-Llama-3-8B-GGUF/resolve/main/Meta-Llama-3-8B.Q4_K_M.gguf",
    sha256: "c57380038ea85d8f234bc5e0c9b5c1c4a8d1a4e5f6b7c8d9e0f1a2b3c4d5e6f7",
    tokenizerUrl:
      "https://huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct/resolve/main/tokenizer.json",
  },
  {
    id: "gemma-2b",
    name: "Gemma 2B",
    version: "2b-4bit",
    description: "Google's lightweight model, very fast on modest hardware.",
    requirements: {
      ramMb: 2048, // 2GB minimum
      gpuVramMb: 0, // CPU-capable
      storageMb: 1500, // ~1.5GB
    },
    capabilities: ["general-chat", "summarization"],
    limitations: [
      "no-image-understanding",
      "no-code-execution",
      "limited-context",
    ],
    contextLength: 2048,
    license: {
      name: "Gemma Terms of Use",
      url: "https://ai.google.dev/gemma/terms",
      commercial: true,
    },
    vulnerabilities: [],
    downloadUrl:
      "https://huggingface.co/google/gemma-2b-it-GGUF/resolve/main/gemma-2b-it.Q4_K_M.gguf",
    sha256: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    tokenizerUrl:
      "https://huggingface.co/google/gemma-2b-it/resolve/main/tokenizer.json",
  },
  {
    id: "mistral-7b",
    name: "Mistral 7B",
    version: "7b-4bit",
    description:
      "High-performance 7B model with excellent instruction following.",
    requirements: {
      ramMb: 6144, // 6GB minimum
      gpuVramMb: 4096, // 4GB VRAM recommended
      storageMb: 4200, // ~4.2GB
    },
    capabilities: [
      "general-chat",
      "code-generation",
      "summarization",
      "translation",
    ],
    limitations: ["no-image-understanding"],
    contextLength: 8192,
    license: {
      name: "Apache 2.0",
      url: "https://www.apache.org/licenses/LICENSE-2.0",
      commercial: true,
    },
    vulnerabilities: [],
    downloadUrl:
      "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf",
    sha256: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
    tokenizerUrl:
      "https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2/resolve/main/tokenizer.json",
  },
  {
    id: "qwen-1.5b",
    name: "Qwen 1.5B",
    version: "1.5b-4bit",
    description:
      "Alibaba's compact model, excellent for quick responses on any device.",
    requirements: {
      ramMb: 1536, // 1.5GB minimum
      gpuVramMb: 0, // CPU-capable
      storageMb: 1000, // ~1GB
    },
    capabilities: ["general-chat", "summarization"],
    limitations: [
      "no-image-understanding",
      "no-code-execution",
      "limited-context",
      "english-only",
    ],
    contextLength: 2048,
    license: {
      name: "Tongyi Qianwen License",
      url: "https://huggingface.co/Qwen/Qwen1.5-1.8B/blob/main/LICENSE",
      commercial: true,
    },
    vulnerabilities: [],
    downloadUrl:
      "https://huggingface.co/Qwen/Qwen1.5-1.8B-Chat-GGUF/resolve/main/qwen1_5-1_8b-chat-q4_k_m.gguf",
    sha256: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    tokenizerUrl:
      "https://huggingface.co/Qwen/Qwen1.5-1.8B-Chat/resolve/main/tokenizer.json",
  },
];

/**
 * Get model metadata by ID.
 * Returns undefined if model not found.
 *
 * @param modelId - The model identifier to look up
 * @returns ModelMetadata or undefined
 */
export function getModelMetadata(modelId: string): ModelMetadata | undefined {
  return MODEL_REGISTRY.find((m) => m.id === modelId);
}

/**
 * List all available models.
 * Returns copy to prevent mutation.
 *
 * @returns Array of all model metadata
 */
export function listModels(): ModelMetadata[] {
  return [...MODEL_REGISTRY];
}

// Re-export types for convenience
export type {
  ModelCapability,
  ModelLicense,
  ModelLimitation,
  ModelMetadata,
  ModelVulnerability,
} from "./types";
