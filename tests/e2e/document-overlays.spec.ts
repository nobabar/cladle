import { expect, test } from "@playwright/test";
import { gotoDailyAndWaitForShell } from "./helpers/daily-shell";
import { mockINaturalist } from "./helpers/inaturalist";

test.beforeEach(async ({ page }) => {
  await mockINaturalist(page);
});

test("help opens as slide-over with daily game behind, closes to home", async ({ page }) => {
  await gotoDailyAndWaitForShell(page);

  await page.getByRole("navigation", { name: "Footer links" }).getByRole("link", { name: "How to play" }).click();

  await expect(page).toHaveURL(/\/help$/);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "How to play", level: 1 })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Search for an animal" })).toHaveCount(0);

  await dialog.getByRole("button", { name: "Back to home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("combobox", { name: "Search for an animal" })).toBeVisible();
});

test("privacy opens as slide-over and closes to home", async ({ page }) => {
  await gotoDailyAndWaitForShell(page);

  await page.getByRole("navigation", { name: "Footer links" }).getByRole("link", { name: "Privacy" }).click();

  await expect(page).toHaveURL(/\/privacy$/);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Privacy", level: 1 })).toBeVisible();

  await dialog.getByRole("button", { name: "Back to home" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("direct load of /help shows overlay dialog", async ({ page }) => {
  await page.goto("/help");
  await expect(page.getByRole("dialog").getByRole("heading", { name: "How to play", level: 1 })).toBeVisible({
    timeout: 30_000,
  });
});
