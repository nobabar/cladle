import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Wait until the animal search is interactive (daily or free-play).
 * @param page - The Playwright page object.
 */
export async function waitForGameSearchReady(page: Page) {
  const searchInput = page.getByRole("combobox", { name: "Search for an animal" });
  await expect(searchInput).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("status", { name: "Loading game data..." })).toHaveCount(0, {
    timeout: 60_000,
  });
  await expect(searchInput).toBeEnabled({ timeout: 60_000 });
}

/**
 * Daily shell is painted before the target animal fetch completes; wait until play is possible.
 * @param page - The Playwright page object.
 */
export async function waitForDailyGameReady(page: Page) {
  await waitForGameSearchReady(page);
}

/**
 * Nuxt dev cold start can exceed heading-only timeouts; combobox enabled state marks interactive readiness.
 * @param page - The Playwright page object.
 */
export async function gotoDailyAndWaitForShell(page: Page) {
  await page.goto("/");
  await waitForDailyGameReady(page);
}

const STALE_DAILY_PUZZLE_DATE = "1999-01-01";

/**
 * Simulate a cross-day rollover by seeding persisted state before the next load.
 * Uses addInitScript so Pinia's beforeunload persist cannot overwrite edits made in evaluate().
 * @param page - The Playwright page object.
 */
export async function reloadWithStaleDailyPuzzle(page: Page) {
  const payload = await page.evaluate((staleDate) => {
    const persistedRaw = localStorage.getItem("cladle-game-store");
    if (!persistedRaw) {
      return null;
    }
    const persisted = JSON.parse(persistedRaw) as {
      dailyState?: {
        puzzleDate?: string;
        status?: string;
        guesses?: unknown[];
      };
    };
    if (!persisted?.dailyState) {
      return null;
    }
    persisted.dailyState.puzzleDate = staleDate;
    persisted.dailyState.status = "playing";
    persisted.dailyState.guesses = [];
    return JSON.stringify(persisted);
  }, STALE_DAILY_PUZZLE_DATE);

  if (payload === null) {
    throw new Error("Expected cladle-game-store dailyState before stale rollover reload");
  }

  await page.addInitScript((stored: string) => {
    localStorage.setItem("cladle-game-store", stored);
  }, payload);

  await page.reload();
}
