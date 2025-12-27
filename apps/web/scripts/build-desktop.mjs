#!/usr/bin/env node

/**
 * Build script for Tauri desktop - excludes server-only routes incompatible with static export
 * Desktop mode bypasses auth, so auth-related routes are also excluded
 * Cross-platform: works on Linux, macOS, and Windows
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmdirSync, rmSync } from "node:fs";
import { basename, join } from "node:path";

const BACKUP_DIR = ".desktop-build-backup";

// Routes to exclude from static export (server-side auth, API routes)
const EXCLUDED_ROUTES = ["src/app/api", "src/app/dashboard", "src/app/login"];

// Auth components only used by excluded routes
const EXCLUDED_COMPONENTS = [
  "src/components/sign-in-form.tsx",
  "src/components/sign-up-form.tsx",
];

function cleanBuildArtifacts() {
  if (existsSync("dist")) {
    rmSync("dist", { recursive: true, force: true });
  }
  if (existsSync(".next")) {
    rmSync(".next", { recursive: true, force: true });
  }
}

function moveToBackup(path, isDirectory) {
  const backupPath = join(BACKUP_DIR, basename(path));
  if (isDirectory ? existsSync(path) : existsSync(path)) {
    renameSync(path, backupPath);
    console.log(`Excluded: ${path}`);
    return true;
  }
  return false;
}

function restoreFromBackup(path) {
  const backupPath = join(BACKUP_DIR, basename(path));
  if (existsSync(backupPath)) {
    renameSync(backupPath, path);
    return true;
  }
  return false;
}

function runBuild() {
  return new Promise((resolve) => {
    const isWindows = process.platform === "win32";
    const cmd = isWindows ? "bun.exe" : "bun";
    const args = ["run", "build"];

    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: isWindows,
    });

    child.on("close", (code) => {
      resolve(code ?? 0);
    });

    child.on("error", (err) => {
      console.error("Build error:", err.message);
      resolve(1);
    });
  });
}

async function main() {
  // Clean stale build artifacts
  cleanBuildArtifacts();

  // Create backup directory
  mkdirSync(BACKUP_DIR, { recursive: true });

  // Move excluded routes out of the way
  for (const route of EXCLUDED_ROUTES) {
    moveToBackup(route, true);
  }

  // Move excluded components out of the way
  for (const component of EXCLUDED_COMPONENTS) {
    moveToBackup(component, false);
  }

  // Run the Next.js build
  const exitCode = await runBuild();

  // Restore excluded routes
  for (const route of EXCLUDED_ROUTES) {
    restoreFromBackup(route);
  }

  // Restore excluded components
  for (const component of EXCLUDED_COMPONENTS) {
    restoreFromBackup(component);
  }

  // Clean up backup directory
  try {
    rmdirSync(BACKUP_DIR);
  } catch {
    // Ignore if not empty or doesn't exist
  }

  console.log("Routes restored");
  process.exit(exitCode);
}

main();
