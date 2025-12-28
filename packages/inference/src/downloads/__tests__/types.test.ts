/**
 * Download Types Tests
 * Story 2.3: Model Download Manager - Task 1
 */

import { describe, expect, it } from "vitest";
import type { DownloadProgress, DownloadStatus } from "../types";
import {
  calculateProgressPercent,
  createDownloadError,
  DOWNLOAD_ERROR_MESSAGES,
  formatBytes,
  formatEta,
  formatSpeed,
} from "../types";

describe("Download Types", () => {
  describe("DownloadStatus type", () => {
    it("should accept valid status values", () => {
      const statuses: DownloadStatus[] = [
        "queued",
        "downloading",
        "paused",
        "completed",
        "failed",
        "cancelled",
      ];

      for (const status of statuses) {
        expect(typeof status).toBe("string");
      }
    });
  });

  describe("createDownloadError", () => {
    it("should create error with correct code and retryable flag", () => {
      const error = createDownloadError("NETWORK_ERROR");

      expect(error.code).toBe("NETWORK_ERROR");
      expect(error.retryable).toBe(true);
      expect(error.message).toBe(
        DOWNLOAD_ERROR_MESSAGES.NETWORK_ERROR.userMessage
      );
    });

    it("should create non-retryable error for STORAGE_FULL", () => {
      const error = createDownloadError("STORAGE_FULL");

      expect(error.code).toBe("STORAGE_FULL");
      expect(error.retryable).toBe(false);
    });

    it("should allow custom message override", () => {
      const customMessage = "Custom error message";
      const error = createDownloadError("NETWORK_ERROR", customMessage);

      expect(error.message).toBe(customMessage);
      expect(error.retryable).toBe(true);
    });

    it("should create error for all error codes", () => {
      const codes = [
        "NETWORK_ERROR",
        "STORAGE_FULL",
        "CHECKSUM_MISMATCH",
        "CANCELLED",
        "UNKNOWN",
      ] as const;

      for (const code of codes) {
        const error = createDownloadError(code);
        expect(error.code).toBe(code);
        expect(typeof error.message).toBe("string");
        expect(typeof error.retryable).toBe("boolean");
      }
    });
  });

  describe("calculateProgressPercent", () => {
    const createProgress = (
      bytesDownloaded: number,
      totalBytes: number
    ): DownloadProgress => ({
      downloadId: "test-id",
      modelId: "test-model",
      status: "downloading" as const,
      bytesDownloaded,
      totalBytes,
      speedBps: 1000,
      etaSeconds: 100,
      startedAt: new Date(),
    });

    it("should return 0 for no bytes downloaded", () => {
      expect(calculateProgressPercent(createProgress(0, 1000))).toBe(0);
    });

    it("should return 100 for completed download", () => {
      expect(calculateProgressPercent(createProgress(1000, 1000))).toBe(100);
    });

    it("should calculate correct percentage", () => {
      expect(calculateProgressPercent(createProgress(500, 1000))).toBe(50);
      expect(calculateProgressPercent(createProgress(250, 1000))).toBe(25);
      expect(calculateProgressPercent(createProgress(750, 1000))).toBe(75);
    });

    it("should round to nearest integer", () => {
      expect(calculateProgressPercent(createProgress(333, 1000))).toBe(33);
      expect(calculateProgressPercent(createProgress(666, 1000))).toBe(67);
    });

    it("should return 0 for zero total bytes", () => {
      expect(calculateProgressPercent(createProgress(0, 0))).toBe(0);
    });

    it("should clamp to 100 if bytes exceed total", () => {
      expect(calculateProgressPercent(createProgress(1500, 1000))).toBe(100);
    });
  });

  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(512)).toBe("512 B");
      expect(formatBytes(1023)).toBe("1023 B");
    });

    it("should format kilobytes correctly", () => {
      expect(formatBytes(1024)).toBe("1.0 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(1024 * 1000)).toBe("1000.0 KB");
    });

    it("should format megabytes correctly", () => {
      expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
      expect(formatBytes(1024 * 1024 * 2.5)).toBe("2.5 MB");
    });

    it("should format gigabytes correctly", () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1.00 GB");
      expect(formatBytes(1024 * 1024 * 1024 * 2.5)).toBe("2.50 GB");
    });
  });

  describe("formatSpeed", () => {
    it("should format bytes per second correctly", () => {
      expect(formatSpeed(0)).toBe("0 B/s");
      expect(formatSpeed(512)).toBe("512 B/s");
    });

    it("should format KB/s correctly", () => {
      expect(formatSpeed(1024)).toBe("1.0 KB/s");
      expect(formatSpeed(10_240)).toBe("10.0 KB/s");
    });

    it("should format MB/s correctly", () => {
      expect(formatSpeed(1024 * 1024)).toBe("1.0 MB/s");
      expect(formatSpeed(1024 * 1024 * 10)).toBe("10.0 MB/s");
    });
  });

  describe("formatEta", () => {
    it('should return "calculating..." for zero or negative', () => {
      expect(formatEta(0)).toBe("calculating...");
      expect(formatEta(-10)).toBe("calculating...");
    });

    it("should format seconds correctly", () => {
      expect(formatEta(30)).toBe("30s");
      expect(formatEta(59)).toBe("59s");
    });

    it("should format minutes correctly", () => {
      expect(formatEta(60)).toBe("1m");
      expect(formatEta(90)).toBe("1m");
      expect(formatEta(120)).toBe("2m");
      expect(formatEta(3599)).toBe("59m");
    });

    it("should format hours and minutes correctly", () => {
      expect(formatEta(3600)).toBe("1h 0m");
      expect(formatEta(3660)).toBe("1h 1m");
      expect(formatEta(7200)).toBe("2h 0m");
      expect(formatEta(7320)).toBe("2h 2m");
    });
  });

  describe("DOWNLOAD_ERROR_MESSAGES", () => {
    it("should have messages for all error codes", () => {
      const codes = [
        "NETWORK_ERROR",
        "STORAGE_FULL",
        "CHECKSUM_MISMATCH",
        "CANCELLED",
        "UNKNOWN",
      ] as const;

      for (const code of codes) {
        const msg = DOWNLOAD_ERROR_MESSAGES[code];
        expect(msg).toBeDefined();
        expect(typeof msg.userMessage).toBe("string");
        expect(typeof msg.recoveryHint).toBe("string");
        expect(typeof msg.retryable).toBe("boolean");
      }
    });

    it("should mark STORAGE_FULL as non-retryable", () => {
      expect(DOWNLOAD_ERROR_MESSAGES.STORAGE_FULL.retryable).toBe(false);
    });

    it("should mark NETWORK_ERROR as retryable", () => {
      expect(DOWNLOAD_ERROR_MESSAGES.NETWORK_ERROR.retryable).toBe(true);
    });
  });
});
