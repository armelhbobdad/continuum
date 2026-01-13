/**
 * Migration Types Tests (Story 5.5 Task 2)
 *
 * Tests for migration types used in anonymous-to-authenticated migration.
 */
import { describe, expect, it } from "vitest";
import type {
  MigrationChoice,
  MigrationProgress,
  MigrationResult,
  MigrationState,
  MigrationStatus,
} from "../migration";
import {
  DEFAULT_MIGRATION_STATE,
  getMigrationProgressPercentage,
  isMigrationComplete,
  isMigrationFailed,
  isMigrationIdle,
  isMigrationInProgress,
} from "../migration";

describe("Migration Types (Story 5.5 Task 2)", () => {
  describe("MigrationChoice type", () => {
    it("should accept 'merge' as valid choice", () => {
      const choice: MigrationChoice = "merge";
      expect(choice).toBe("merge");
    });

    it("should accept 'keep-separate' as valid choice", () => {
      const choice: MigrationChoice = "keep-separate";
      expect(choice).toBe("keep-separate");
    });

    it("should accept 'discard' as valid choice", () => {
      const choice: MigrationChoice = "discard";
      expect(choice).toBe("discard");
    });
  });

  describe("MigrationStatus type", () => {
    it("should accept 'idle' as valid status", () => {
      const status: MigrationStatus = "idle";
      expect(status).toBe("idle");
    });

    it("should accept 'in-progress' as valid status", () => {
      const status: MigrationStatus = "in-progress";
      expect(status).toBe("in-progress");
    });

    it("should accept 'completed' as valid status", () => {
      const status: MigrationStatus = "completed";
      expect(status).toBe("completed");
    });

    it("should accept 'failed' as valid status", () => {
      const status: MigrationStatus = "failed";
      expect(status).toBe("failed");
    });
  });

  describe("MigrationProgress interface", () => {
    it("should define progress with all required fields", () => {
      const progress: MigrationProgress = {
        current: 5,
        total: 10,
        step: "Migrating session 5 of 10",
        percentage: 50,
      };

      expect(progress.current).toBe(5);
      expect(progress.total).toBe(10);
      expect(progress.step).toBe("Migrating session 5 of 10");
      expect(progress.percentage).toBe(50);
    });

    it("should handle zero progress", () => {
      const progress: MigrationProgress = {
        current: 0,
        total: 5,
        step: "Preparing migration...",
        percentage: 0,
      };

      expect(progress.current).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it("should handle 100% progress", () => {
      const progress: MigrationProgress = {
        current: 10,
        total: 10,
        step: "Migration complete",
        percentage: 100,
      };

      expect(progress.current).toBe(10);
      expect(progress.percentage).toBe(100);
    });
  });

  describe("MigrationResult interface", () => {
    it("should define successful result", () => {
      const result: MigrationResult = {
        success: true,
        sessionsMigrated: 10,
        completedAt: new Date(),
      };

      expect(result.success).toBe(true);
      expect(result.sessionsMigrated).toBe(10);
      expect(result.error).toBeUndefined();
    });

    it("should define failed result with error", () => {
      const result: MigrationResult = {
        success: false,
        sessionsMigrated: 0,
        completedAt: new Date(),
        error: "Database error during migration",
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error during migration");
    });

    it("should include completedAt timestamp", () => {
      const now = new Date();
      const result: MigrationResult = {
        success: true,
        sessionsMigrated: 5,
        completedAt: now,
      };

      expect(result.completedAt).toEqual(now);
    });
  });

  describe("MigrationState interface", () => {
    it("should define complete state object", () => {
      const state: MigrationState = {
        status: "in-progress",
        choice: "merge",
        progress: {
          current: 3,
          total: 10,
          step: "Migrating session 3",
          percentage: 30,
        },
        result: null,
        anonymousSessionCount: 10,
        error: null,
      };

      expect(state.status).toBe("in-progress");
      expect(state.choice).toBe("merge");
      expect(state.progress?.current).toBe(3);
    });

    it("should allow null for optional fields in idle state", () => {
      const state: MigrationState = {
        status: "idle",
        choice: null,
        progress: null,
        result: null,
        anonymousSessionCount: 5,
        error: null,
      };

      expect(state.choice).toBeNull();
      expect(state.progress).toBeNull();
      expect(state.result).toBeNull();
    });
  });

  describe("DEFAULT_MIGRATION_STATE", () => {
    it("should have idle status", () => {
      expect(DEFAULT_MIGRATION_STATE.status).toBe("idle");
    });

    it("should have null choice", () => {
      expect(DEFAULT_MIGRATION_STATE.choice).toBeNull();
    });

    it("should have null progress", () => {
      expect(DEFAULT_MIGRATION_STATE.progress).toBeNull();
    });

    it("should have null result", () => {
      expect(DEFAULT_MIGRATION_STATE.result).toBeNull();
    });

    it("should have zero anonymous session count", () => {
      expect(DEFAULT_MIGRATION_STATE.anonymousSessionCount).toBe(0);
    });

    it("should have null error", () => {
      expect(DEFAULT_MIGRATION_STATE.error).toBeNull();
    });
  });

  describe("Status helper functions", () => {
    it("isMigrationIdle should return true for idle status", () => {
      expect(isMigrationIdle({ status: "idle" } as MigrationState)).toBe(true);
      expect(isMigrationIdle({ status: "in-progress" } as MigrationState)).toBe(
        false
      );
    });

    it("isMigrationInProgress should return true for in-progress status", () => {
      expect(
        isMigrationInProgress({ status: "in-progress" } as MigrationState)
      ).toBe(true);
      expect(isMigrationInProgress({ status: "idle" } as MigrationState)).toBe(
        false
      );
    });

    it("isMigrationComplete should return true for completed status", () => {
      expect(
        isMigrationComplete({ status: "completed" } as MigrationState)
      ).toBe(true);
      expect(isMigrationComplete({ status: "idle" } as MigrationState)).toBe(
        false
      );
    });

    it("isMigrationFailed should return true for failed status", () => {
      expect(isMigrationFailed({ status: "failed" } as MigrationState)).toBe(
        true
      );
      expect(isMigrationFailed({ status: "idle" } as MigrationState)).toBe(
        false
      );
    });
  });

  describe("getMigrationProgressPercentage", () => {
    it("should return 0 when progress is null", () => {
      const state: MigrationState = {
        ...DEFAULT_MIGRATION_STATE,
        progress: null,
      };
      expect(getMigrationProgressPercentage(state)).toBe(0);
    });

    it("should return percentage from progress", () => {
      const state: MigrationState = {
        ...DEFAULT_MIGRATION_STATE,
        progress: {
          current: 5,
          total: 10,
          step: "Migrating",
          percentage: 50,
        },
      };
      expect(getMigrationProgressPercentage(state)).toBe(50);
    });
  });
});
