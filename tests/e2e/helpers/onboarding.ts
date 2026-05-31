import type { Page } from "@playwright/test";

/** Must match `ONBOARDING_DAILY_TOUR_COMPLETE_KEY` in useOnboardingTour.ts */
export const ONBOARDING_DAILY_TOUR_COMPLETE_KEY = "cladle:onboarding:daily:v1";

/**
 * Prevent the daily onboarding entry prompt from appearing mid-test.
 * Call before the first navigation in a test file or case.
 * @param page - Playwright page.
 */
export async function skipOnboardingPrompt(page: Page) {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "done");
  }, ONBOARDING_DAILY_TOUR_COMPLETE_KEY);
}
