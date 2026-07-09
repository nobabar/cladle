import { expect, test } from "@playwright/test";
import { gotoDailyAndWaitForShell } from "./helpers/daily-shell";
import { mockINaturalist } from "./helpers/inaturalist";

test.beforeEach(async ({ page }) => {
  await mockINaturalist(page);
});

test("keyboard-only flow navigates search suggestions", async ({ page }) => {
  await gotoDailyAndWaitForShell(page);

  const searchInput = page.getByRole("combobox", { name: "Search for an animal" });
  await searchInput.click();
  await page.keyboard.type("tig");
  const tigerOption = page.getByRole("option", { name: /Tiger/i });
  await expect(tigerOption).toBeVisible();
  await searchInput.press("ArrowDown");
  await expect(searchInput).toHaveAttribute("aria-activedescendant", /animal-suggestion-/);
  await searchInput.press("Escape");
  await expect(tigerOption).toHaveCount(0);
});

test("keyboard Enter selects highlighted suggestion", async ({ page }) => {
  await gotoDailyAndWaitForShell(page);

  const searchInput = page.getByRole("combobox", { name: "Search for an animal" });
  await searchInput.click();
  await page.keyboard.type("tig");

  const tigerOption = page.getByRole("option", { name: /Tiger/i });
  await expect(tigerOption).toBeVisible();
  await searchInput.press("ArrowDown");
  await searchInput.press("Enter");

  await expect(searchInput).toHaveValue("");
  await expect(tigerOption).toHaveCount(0);
  await expect(searchInput).toHaveAttribute("aria-expanded", "false");
});

test("Escape closes suggestions then blurs input on second press", async ({ page }) => {
  await gotoDailyAndWaitForShell(page);

  const searchInput = page.getByRole("combobox", { name: "Search for an animal" });
  await searchInput.click();
  await page.keyboard.type("li");

  const lionOption = page.getByRole("option", { name: /Lion/i });
  await expect(lionOption).toBeVisible();

  await searchInput.press("Escape");
  await expect(lionOption).toHaveCount(0);
  await expect(searchInput).toBeFocused();

  await searchInput.press("Escape");
  await expect(searchInput).not.toBeFocused();
});

test("Arrow keys update active descendant in suggestions", async ({ page }) => {
  await gotoDailyAndWaitForShell(page);

  const searchInput = page.getByRole("combobox", { name: "Search for an animal" });
  await searchInput.click();
  await page.keyboard.type("an");

  await expect(page.getByRole("option", { name: /Tiger/i })).toBeVisible();
  await expect(page.getByRole("option", { name: /Lion/i })).toBeVisible();

  await searchInput.press("ArrowDown");
  const firstActive = await searchInput.getAttribute("aria-activedescendant");
  expect(firstActive).toMatch(/animal-suggestion-/);

  await searchInput.press("ArrowDown");
  const secondActive = await searchInput.getAttribute("aria-activedescendant");
  expect(secondActive).toMatch(/animal-suggestion-/);
  expect(secondActive).not.toBe(firstActive);

  await searchInput.press("ArrowUp");
  await expect(searchInput).toHaveAttribute("aria-activedescendant", firstActive || "");
});
