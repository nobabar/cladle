import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Daily index: free play is a link from `sm` up; below `sm` it lives in the burger menu.
 * @param page - The page object.
 */
export async function goToFreePlayFromDaily(page: Page) {
  const desktopLink = page.getByRole("link", { name: "Go to free play mode" });
  const menuButton = page.getByRole("button", { name: "Open game menu" });
  await expect(desktopLink.or(menuButton)).toBeVisible({ timeout: 30_000 });
  if (await desktopLink.isVisible()) {
    await desktopLink.click();
    return;
  }
  await menuButton.click();
  await page.getByRole("menuitem", { name: /^free play$/i }).click();
}

/**
 * Daily index: history is a toolbar button from `sm` up; below `sm` use the game menu.
 * @param page - The page object.
 */
export async function openPuzzleHistoryFromDaily(page: Page) {
  const desktopBtn = page.getByRole("button", { name: "Open puzzle history" });
  const menuButton = page.getByRole("button", { name: "Open game menu" });
  await expect(desktopBtn.or(menuButton)).toBeVisible({ timeout: 30_000 });
  if (await desktopBtn.isVisible()) {
    await desktopBtn.click();
    return;
  }
  await menuButton.click();
  await page.getByRole("menuitem", { name: /^puzzle history$/i }).click();
}
