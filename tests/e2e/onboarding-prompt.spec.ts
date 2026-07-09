import { expect, test } from "@playwright/test";
import { gotoDailyAndWaitForShell } from "./helpers/daily-shell";
import { mockINaturalist } from "./helpers/inaturalist";

const ONBOARDING_KEY = "cladle:onboarding:daily:v1";

test.beforeEach(async ({ page }) => {
  await mockINaturalist(page);
  await page.addInitScript((key) => {
    localStorage.removeItem(key);
  }, ONBOARDING_KEY);
});

test("onboarding prompt stays visible after idle clicks", async ({ page }) => {
  await gotoDailyAndWaitForShell(page);

  const promptTitle = page.getByRole("heading", { name: "Need a quick tour?" });
  await expect(promptTitle).toBeVisible({ timeout: 5_000 });

  await page.getByRole("heading", { name: "Phylogenetic Tree" }).click();
  await page.getByRole("heading", { name: "Cladle", exact: true }).click();
  await expect(promptTitle).toBeVisible();
});

test("onboarding prompt dismisses after several game actions without persisting skip", async ({ page }) => {
  test.slow();
  await gotoDailyAndWaitForShell(page);

  const promptTitle = page.getByRole("heading", { name: "Need a quick tour?" });
  await expect(promptTitle).toBeVisible({ timeout: 5_000 });

  const searchInput = page.getByRole("combobox", { name: "Search for an animal" });
  await searchInput.fill("wol");
  await page.getByRole("option", { name: /Gray Wolf/i }).click();

  const recentGuesses = page.locator(".notebook-guess-history");
  await expect(recentGuesses.getByText("Gray Wolf", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  const treeNode = page
    .locator("[data-onboarding='daily-tree'] .tree-node-group-rough[role='button']")
    .first();
  await expect(treeNode).toBeVisible({ timeout: 15_000 });
  await treeNode.scrollIntoViewIfNeeded();
  await treeNode.click({ timeout: 5_000 }).catch(async () => {
    await treeNode.dispatchEvent("click");
  });

  await expect(promptTitle).not.toBeVisible({ timeout: 5_000 });

  expect(await page.evaluate(key => localStorage.getItem(key), ONBOARDING_KEY)).toBeNull();

  await page.reload();
  await expect(page.getByRole("combobox", { name: "Search for an animal" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(promptTitle).toBeVisible({ timeout: 5_000 });
});

test("onboarding prompt does not appear after skip", async ({ page }) => {
  await gotoDailyAndWaitForShell(page);

  const promptTitle = page.getByRole("heading", { name: "Need a quick tour?" });
  await expect(promptTitle).toBeVisible({ timeout: 5_000 });

  await page.getByRole("button", { name: "I'll explore on my own" }).click();
  await expect(promptTitle).not.toBeVisible();

  expect(await page.evaluate(key => localStorage.getItem(key), ONBOARDING_KEY)).toBe("done");

  await page.reload();
  await expect(page.getByRole("combobox", { name: "Search for an animal" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(promptTitle).not.toBeVisible();
});
