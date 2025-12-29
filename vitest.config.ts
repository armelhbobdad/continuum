import * as path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/web/src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/stack-knowledge/**",
      "**/.turbo/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
        "**/stack-knowledge/**",
        "**/*.config.*",
        "**/tests/fixtures/**",
      ],
      // Thresholds temporarily disabled during early development
      // Re-enable once codebase has proper test coverage
      // TODO: Add comprehensive tests and restore thresholds
      // thresholds: {
      //   lines: 80,
      //   branches: 70,
      //   functions: 70,
      //   statements: 80,
      // },
    },
    setupFiles: ["./vitest.setup.ts"],
    // Workspace projects for monorepo
    projects: [
      // Root project for shared tests
      {
        test: {
          name: "root",
          root: ".",
          include: ["tests/**/*.{test,spec}.{ts,tsx}"],
          exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/.next/**",
            "**/stack-knowledge/**",
            "**/.turbo/**",
            "tests/privacy-gate/**",
            "tests/e2e/**",
          ],
          environment: "jsdom",
          alias: {
            "@/": `${path.resolve(__dirname, "./apps/web/src")}/`,
          },
        },
      },
      // Web app tests (excluding Playwright e2e tests)
      {
        test: {
          name: "web",
          root: "./apps/web",
          include: ["**/*.{test,spec}.{ts,tsx}"],
          exclude: ["**/e2e/**", "**/node_modules/**"],
          environment: "jsdom",
          globals: true,
          setupFiles: ["./vitest.setup.ts"],
          alias: {
            "@/": `${path.resolve(__dirname, "./apps/web/src")}/`,
          },
        },
      },
      // API package tests
      {
        test: {
          name: "api",
          root: "./packages/api",
          include: ["**/*.{test,spec}.{ts,tsx}"],
          environment: "node",
        },
      },
      // Auth package tests
      {
        test: {
          name: "auth",
          root: "./packages/auth",
          include: ["**/*.{test,spec}.{ts,tsx}"],
          environment: "node",
        },
      },
      // Privacy gate tests - special isolation testing
      {
        test: {
          name: "privacy-gate",
          root: "./tests/privacy-gate",
          include: ["**/*.{test,spec}.{ts,tsx}"],
          environment: "node",
          alias: {
            "@/": `${path.resolve(__dirname, "./apps/web/src")}/`,
          },
        },
      },
    ],
  },
});
