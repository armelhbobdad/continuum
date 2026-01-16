/**
 * Migration Store Tests (Story 5.5 Task 6.9)
 *
 * Tests for the memory-only migration store.
 * 12 tests as specified in story.
 */

import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { MigrationProgress, MigrationResult } from "@/types/migration";
import {
  selectCanRetryMigration,
  selectCurrentStep,
  selectHasAnonymousSessions,
  selectIsMigrationComplete,
  selectIsMigrationFailed,
  selectIsMigrationIdle,
  selectIsMigrationInProgress,
  selectIsMigrationSuccessful,
  selectMigrationError,
  selectMigrationPercentage,
  selectSessionsMigrated,
  selectShowMigrationDialog,
  useMigrationStore,
} from "../migration";

describe("Migration Store (Story 5.5 Task 6)", () => {
  beforeEach(() => {
    // Reset store before each test
    act(() => {
      useMigrationStore.getState().reset();
    });
  });

  // Test 1: Initial state
  it("should have correct initial idle state", () => {
    const state = useMigrationStore.getState();

    expect(state.status).toBe("idle");
    expect(state.choice).toBeNull();
    expect(state.progress).toBeNull();
    expect(state.result).toBeNull();
    expect(state.anonymousSessionCount).toBe(0);
    expect(state.error).toBeNull();
    expect(state.showDialog).toBe(false);
  });

  // Test 2: Start migration
  it("should update state when starting migration", () => {
    const store = useMigrationStore.getState();

    act(() => {
      store.startMigration("merge", 5);
    });

    const state = useMigrationStore.getState();
    expect(state.status).toBe("in-progress");
    expect(state.choice).toBe("merge");
    expect(state.anonymousSessionCount).toBe(5);
    expect(state.progress).not.toBeNull();
    expect(state.progress?.current).toBe(0);
    expect(state.progress?.total).toBe(5);
  });

  // Test 3: Start migration with different choices
  it("should support all migration choices", () => {
    const store = useMigrationStore.getState();

    // Test keep-separate
    act(() => {
      store.startMigration("keep-separate", 3);
    });
    expect(useMigrationStore.getState().choice).toBe("keep-separate");

    // Reset and test discard
    act(() => {
      store.reset();
      store.startMigration("discard", 2);
    });
    expect(useMigrationStore.getState().choice).toBe("discard");
  });

  // Test 4: Update progress
  it("should update progress during migration", () => {
    const store = useMigrationStore.getState();

    act(() => {
      store.startMigration("merge", 10);
    });

    const progress: MigrationProgress = {
      current: 5,
      total: 10,
      step: "Migrating session 5 of 10",
      percentage: 50,
    };

    act(() => {
      store.updateProgress(progress);
    });

    const state = useMigrationStore.getState();
    expect(state.progress).toEqual(progress);
    expect(state.progress?.percentage).toBe(50);
  });

  // Test 5: Complete migration successfully
  it("should handle successful migration completion", () => {
    const store = useMigrationStore.getState();

    act(() => {
      store.startMigration("merge", 5);
    });

    const result: MigrationResult = {
      success: true,
      sessionsMigrated: 5,
      completedAt: new Date(),
    };

    act(() => {
      store.completeMigration(result);
    });

    const state = useMigrationStore.getState();
    expect(state.status).toBe("completed");
    expect(state.result?.success).toBe(true);
    expect(state.result?.sessionsMigrated).toBe(5);
    expect(state.progress).toBeNull();
    expect(state.error).toBeNull();
  });

  // Test 6: Complete migration with failure
  it("should handle migration failure", () => {
    const store = useMigrationStore.getState();

    act(() => {
      store.startMigration("merge", 5);
    });

    const result: MigrationResult = {
      success: false,
      error: "Network error during migration",
      sessionsMigrated: 2,
      completedAt: new Date(),
    };

    act(() => {
      store.completeMigration(result);
    });

    const state = useMigrationStore.getState();
    expect(state.status).toBe("failed");
    expect(state.result?.success).toBe(false);
    expect(state.error).toBe("Network error during migration");
  });

  // Test 7: Cancel migration
  it("should handle migration cancellation", () => {
    const store = useMigrationStore.getState();

    act(() => {
      store.startMigration("merge", 5);
    });

    act(() => {
      store.cancelMigration();
    });

    const state = useMigrationStore.getState();
    expect(state.status).toBe("failed");
    expect(state.error).toBe("Migration cancelled by user");
    expect(state.progress).toBeNull();
  });

  // Test 8: Reset to initial state
  it("should reset to initial state", () => {
    const store = useMigrationStore.getState();

    // Set up some state
    act(() => {
      store.startMigration("merge", 5);
      store.openDialog();
    });

    // Reset
    act(() => {
      store.reset();
    });

    const state = useMigrationStore.getState();
    expect(state.status).toBe("idle");
    expect(state.choice).toBeNull();
    expect(state.progress).toBeNull();
    expect(state.showDialog).toBe(false);
  });

  // Test 9: Dialog controls
  it("should control dialog visibility", () => {
    const store = useMigrationStore.getState();

    expect(useMigrationStore.getState().showDialog).toBe(false);

    act(() => {
      store.openDialog();
    });
    expect(useMigrationStore.getState().showDialog).toBe(true);

    act(() => {
      store.closeDialog();
    });
    expect(useMigrationStore.getState().showDialog).toBe(false);
  });

  // Test 10: Selectors for idle state
  it("should provide correct selectors for idle state", () => {
    const state = useMigrationStore.getState();

    expect(selectIsMigrationIdle(state)).toBe(true);
    expect(selectIsMigrationInProgress(state)).toBe(false);
    expect(selectIsMigrationComplete(state)).toBe(false);
    expect(selectIsMigrationFailed(state)).toBe(false);
    expect(selectMigrationPercentage(state)).toBe(0);
    expect(selectHasAnonymousSessions(state)).toBe(false);
  });

  // Test 11: Selectors for in-progress state
  it("should provide correct selectors during migration", () => {
    const store = useMigrationStore.getState();

    act(() => {
      store.startMigration("merge", 10);
      store.updateProgress({
        current: 3,
        total: 10,
        step: "Processing...",
        percentage: 30,
      });
    });

    const state = useMigrationStore.getState();
    expect(selectIsMigrationIdle(state)).toBe(false);
    expect(selectIsMigrationInProgress(state)).toBe(true);
    expect(selectMigrationPercentage(state)).toBe(30);
    expect(selectCurrentStep(state)).toBe("Processing...");
    expect(selectHasAnonymousSessions(state)).toBe(true);
  });

  // Test 12: Selectors for completed state
  it("should provide correct selectors after completion", () => {
    const store = useMigrationStore.getState();

    act(() => {
      store.startMigration("merge", 5);
      store.completeMigration({
        success: true,
        sessionsMigrated: 5,
        completedAt: new Date(),
      });
    });

    const state = useMigrationStore.getState();
    expect(selectIsMigrationComplete(state)).toBe(true);
    expect(selectIsMigrationSuccessful(state)).toBe(true);
    expect(selectIsMigrationFailed(state)).toBe(false);
    expect(selectSessionsMigrated(state)).toBe(5);
    expect(selectCanRetryMigration(state)).toBe(false);
    expect(selectMigrationError(state)).toBeNull();
  });
});

describe("Migration Store Selectors - Edge Cases", () => {
  beforeEach(() => {
    act(() => {
      useMigrationStore.getState().reset();
    });
  });

  it("should handle failed state selectors", () => {
    const store = useMigrationStore.getState();

    act(() => {
      store.startMigration("merge", 5);
      store.failMigration("Test error");
    });

    const state = useMigrationStore.getState();
    expect(selectIsMigrationFailed(state)).toBe(true);
    expect(selectCanRetryMigration(state)).toBe(true);
    expect(selectMigrationError(state)).toBe("Test error");
    expect(selectShowMigrationDialog(state)).toBe(false);
  });

  it("should handle setAnonymousSessionCount", () => {
    const store = useMigrationStore.getState();

    act(() => {
      store.setAnonymousSessionCount(42);
    });

    const state = useMigrationStore.getState();
    expect(state.anonymousSessionCount).toBe(42);
    expect(selectHasAnonymousSessions(state)).toBe(true);
  });
});
