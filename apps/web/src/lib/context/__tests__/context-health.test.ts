/**
 * Context Health Calculator Tests
 *
 * Story 3.4: Context Health Indicators
 * Task 2.6: Tests for context health calculation
 * AC: #1, #2, #3, #5
 */
import { describe, expect, it } from "vitest";
import {
  CONTEXT_THRESHOLDS,
  type ContextHealthStatus,
  calculateContextHealth,
} from "../context-health";
import type { ContextMetrics } from "../count-tokens";

describe("CONTEXT_THRESHOLDS", () => {
  it("has healthy threshold at 50%", () => {
    expect(CONTEXT_THRESHOLDS.healthy).toBe(0.5);
  });

  it("has growing threshold at 80%", () => {
    expect(CONTEXT_THRESHOLDS.growing).toBe(0.8);
  });
});

describe("calculateContextHealth", () => {
  const createMetrics = (totalTokens: number): ContextMetrics => ({
    totalTokens,
    messageCount: 10,
    userTokens: totalTokens / 2,
    assistantTokens: totalTokens / 2,
  });

  describe("status determination", () => {
    it("returns healthy status when under 50%", () => {
      const metrics = createMetrics(400); // 400 / 1000 = 40%
      const health = calculateContextHealth(metrics, 1000);

      expect(health.status).toBe("healthy");
      expect(health.percentage).toBe(40);
    });

    it("returns healthy status at 49%", () => {
      const metrics = createMetrics(490);
      const health = calculateContextHealth(metrics, 1000);

      expect(health.status).toBe("healthy");
    });

    it("returns growing status at exactly 50%", () => {
      const metrics = createMetrics(500);
      const health = calculateContextHealth(metrics, 1000);

      expect(health.status).toBe("growing");
      expect(health.percentage).toBe(50);
    });

    it("returns growing status at 79%", () => {
      const metrics = createMetrics(790);
      const health = calculateContextHealth(metrics, 1000);

      expect(health.status).toBe("growing");
    });

    it("returns critical status at exactly 80%", () => {
      const metrics = createMetrics(800);
      const health = calculateContextHealth(metrics, 1000);

      expect(health.status).toBe("critical");
      expect(health.percentage).toBe(80);
    });

    it("returns critical status at 100%", () => {
      const metrics = createMetrics(1000);
      const health = calculateContextHealth(metrics, 1000);

      expect(health.status).toBe("critical");
      expect(health.percentage).toBe(100);
    });
  });

  describe("percentage calculation", () => {
    it("caps percentage at 100%", () => {
      const metrics = createMetrics(1500);
      const health = calculateContextHealth(metrics, 1000);

      expect(health.percentage).toBe(100);
      expect(health.tokensRemaining).toBe(0);
    });

    it("handles zero context length gracefully", () => {
      const metrics = createMetrics(100);
      const health = calculateContextHealth(metrics, 0);

      expect(health.percentage).toBe(0);
      expect(health.status).toBe("healthy");
    });

    it("handles zero tokens", () => {
      const metrics = createMetrics(0);
      const health = calculateContextHealth(metrics, 1000);

      expect(health.percentage).toBe(0);
      expect(health.status).toBe("healthy");
    });
  });

  describe("token calculations", () => {
    it("calculates remaining tokens correctly", () => {
      const metrics = createMetrics(300);
      const health = calculateContextHealth(metrics, 1000);

      expect(health.tokensUsed).toBe(300);
      expect(health.tokensRemaining).toBe(700);
    });

    it("tokensRemaining never goes negative", () => {
      const metrics = createMetrics(1500);
      const health = calculateContextHealth(metrics, 1000);

      expect(health.tokensRemaining).toBe(0);
    });

    it("includes maxContextLength in result", () => {
      const metrics = createMetrics(500);
      const health = calculateContextHealth(metrics, 4096);

      expect(health.maxContextLength).toBe(4096);
    });
  });

  describe("message count", () => {
    it("passes through message count from metrics", () => {
      const metrics: ContextMetrics = {
        totalTokens: 500,
        messageCount: 42,
        userTokens: 250,
        assistantTokens: 250,
      };
      const health = calculateContextHealth(metrics, 1000);

      expect(health.messageCount).toBe(42);
    });
  });

  describe("return type shape", () => {
    it("returns ContextHealth with all required fields", () => {
      const metrics = createMetrics(500);
      const health = calculateContextHealth(metrics, 1000);

      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("percentage");
      expect(health).toHaveProperty("tokensUsed");
      expect(health).toHaveProperty("tokensRemaining");
      expect(health).toHaveProperty("messageCount");
      expect(health).toHaveProperty("maxContextLength");
    });

    it("status is a valid ContextHealthStatus", () => {
      const validStatuses: ContextHealthStatus[] = [
        "healthy",
        "growing",
        "critical",
      ];
      const metrics = createMetrics(500);
      const health = calculateContextHealth(metrics, 1000);

      expect(validStatuses).toContain(health.status);
    });
  });
});
