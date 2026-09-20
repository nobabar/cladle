import { expect, test } from "@playwright/test";
import { gotoDailyAndWaitForShell } from "./helpers/daily-shell";

test("beginner mode opens sticker menu without network search", async ({ page }) => {
  let searchRequestCount = 0;
  await page.route("**/api.inaturalist.org/**", async (route) => {
    searchRequestCount += 1;
    await route.fulfill({ status: 500, body: "blocked" });
  });

  await gotoDailyAndWaitForShell(page);

  const desktopLink = page.getByRole("link", { name: "Go to beginner mode" });
  const menuButton = page.getByRole("button", { name: "Open game menu" });
  await expect(desktopLink.or(menuButton)).toBeVisible({ timeout: 30_000 });
  if (await desktopLink.isVisible()) {
    await desktopLink.click();
  } else {
    await menuButton.click();
    await page.getByRole("menuitem", { name: /^beginner mode$/i }).click();
  }

  await expect(page).toHaveURL(/\/baby/);
  await expect(page.getByRole("heading", { name: "Beginner mode" })).toBeVisible();

  const openPicker = page.getByRole("button", { name: "Choose an animal" });
  await expect(openPicker).toBeVisible();
  await openPicker.click();

  const dogButton = page.getByRole("button", { name: "Guess Dog" });
  await expect(dogButton).toBeVisible();
  await dogButton.click();
  await expect(page.getByRole("button", { name: /Dog, already guessed/i })).toBeDisabled();
  expect(searchRequestCount).toBe(0);
});
