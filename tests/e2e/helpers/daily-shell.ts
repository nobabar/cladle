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
