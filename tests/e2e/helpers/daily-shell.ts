import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Nuxt dev cold start can exceed heading-only timeouts; combobox marks interactive readiness.
 * @param page - The Playwright page object.
 */
export async function gotoDailyAndWaitForShell(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("combobox", { name: "Search for an animal" })).toBeVisible({
    timeout: 30_000,
  });
}
