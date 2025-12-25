import { expect, test } from "@playwright/test";

/**
 * Smoke Tests
 *
 * Basic tests to verify the application loads and renders correctly.
 * These are placeholder tests to be expanded as the application develops.
 */

// Regex patterns at module level for performance
const ANY_TITLE = /.*/;

test.describe("Smoke Tests", () => {
  test("page loads successfully", async ({ page }) => {
    await page.goto("/");
    // Wait for the page to be ready
    await expect(page).toHaveTitle(ANY_TITLE);
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");

    // Filter out known acceptable errors (e.g., 404s for optional resources)
    const criticalErrors = errors.filter(
      (err) =>
        !(
          err.includes("favicon") ||
          err.includes("robots.txt") ||
          err.includes("Failed to load resource")
        )
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe("Accessibility", () => {
  test("page has accessible structure", async ({ page }) => {
    await page.goto("/");

    // Basic accessibility checks
    const main = page.locator("main, [role='main']");
    await expect(main).toBeVisible();
  });
});
