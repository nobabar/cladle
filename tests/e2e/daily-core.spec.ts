import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { gotoDailyAndWaitForShell, reloadWithStaleDailyPuzzle } from "./helpers/daily-shell";
import { mockINaturalist } from "./helpers/inaturalist";

async function dismissOnboardingPromptIfPresent(page: Page) {
  const skipButton = page.getByRole("button", { name: "I'll explore on my own" });
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
  }
}

test.beforeEach(async ({ page }) => {
  await mockINaturalist(page);
});

test("daily puzzle happy path + spoiler-safe share copy", async ({ page }) => {
  await page.addInitScript(() => {
    const clipboard = navigator.clipboard as { writeText?: (text: string) => Promise<void> };
    if (!clipboard.writeText) {
      clipboard.writeText = async () => {};
    }
    (window as unknown as { __lastShareText?: string }).__lastShareText = "";
    clipboard.writeText = async (text: string) => {
      (window as unknown as { __lastShareText?: string }).__lastShareText = text;
      return Promise.resolve();
    };
  });

  await gotoDailyAndWaitForShell(page);
  await dismissOnboardingPromptIfPresent(page);

  const searchInput = page.getByRole("combobox", { name: "Search for an animal" });
  await searchInput.fill("tiger");
  await page.getByRole("option", { name: /Tiger/i }).click();

  await expect(page.getByRole("heading", { name: /You Won!/ })).toBeVisible();
  const copyButton = page.getByRole("button", { name: "Copy results to clipboard" });
  await expect(copyButton).toBeVisible();
  await copyButton.click();

  await expect(page.getByRole("button", { name: "Results copied to clipboard" })).toBeVisible();

  const clipboardText = await page.evaluate(() =>
    (window as unknown as { __lastShareText?: string }).__lastShareText || "",
  );
  expect(clipboardText).toContain("Cladle");
  expect(clipboardText).toContain("Tree depth:");
  expect(clipboardText).toContain("Evolutionary distance:");
  expect(clipboardText).not.toContain("Tiger");
  expect(clipboardText).not.toContain("Panthera tigris");
});

test("daily persistence survives refresh and resets with new day", async ({ page }) => {
  await gotoDailyAndWaitForShell(page);
  await dismissOnboardingPromptIfPresent(page);
  await dismissOnboardingPromptIfPresent(page);

  const searchInput = page.getByRole("combobox", { name: "Search for an animal" });
  await searchInput.fill("lion");
  await page.getByRole("option", { name: /Lion/i }).click();

  const recentGuesses = page.locator(".notebook-guess-history");
  await expect(recentGuesses.getByText("Recent Guesses")).toBeVisible();
  await expect(recentGuesses.getByText("Lion", { exact: true })).toBeVisible();
  await expect(page.getByText(/Guesses remaining:\s*19/)).toBeVisible();

  await page.reload();
  await dismissOnboardingPromptIfPresent(page);
  await expect(recentGuesses.getByText("Lion", { exact: true })).toBeVisible();
  await expect(page.getByText(/Guesses remaining:\s*19/)).toBeVisible();

  await reloadWithStaleDailyPuzzle(page);
  await dismissOnboardingPromptIfPresent(page);
  await expect(page.getByText(/Guesses remaining:\s*20/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("combobox", { name: "Search for an animal" })).toHaveCount(1);
  await expect(page.locator(".notebook-guess-history")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /You Won!|Game Over/ })).toHaveCount(0);
});

test("loss path from incorrect guess", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  const tigerAnimal = {
    id: "41967",
    name: "Tiger",
    scientificName: "Panthera tigris",
    taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera", "Panthera tigris"],
  };

  await page.addInitScript(({ date, target }) => {
    interface SeedAnimal {
      id: string;
      name: string;
      scientificName: string;
      taxonomy: string[];
    }

    interface SeedTreeNode {
      id: string;
      type: "clade" | "animal";
      name: string;
      cladeData?: { name: string; rank: string };
      data?: SeedAnimal;
      children: SeedTreeNode[];
      isTarget?: boolean;
      depth: number;
    }

    const typedTarget = target as SeedAnimal;
    const root: SeedTreeNode = {
      id: "root",
      type: "clade",
      name: "Animalia",
      cladeData: { name: "Animalia", rank: "kingdom" },
      children: [],
      depth: 0,
    };
    const targetNode: SeedTreeNode = {
      id: `animal-${typedTarget.id}`,
      type: "animal",
      name: typedTarget.name,
      data: typedTarget,
      children: [],
      isTarget: true,
      depth: 1,
    };
    root.children = [targetNode];

    const persisted = {
      version: 1,
      gameMode: "daily",
      dailyState: {
        status: "playing",
        target,
        guesses: [],
        maxGuesses: 1,
        treeData: {
          root,
          target: targetNode,
          nodes: [root, targetNode],
          guesses: [],
        },
        puzzleDate: date,
      },
      freePlayState: null,
    };
    localStorage.setItem("cladle-game-store", JSON.stringify(persisted));
  }, { date: today, target: tigerAnimal });

  await gotoDailyAndWaitForShell(page);

  const searchInput = page.getByRole("combobox", { name: "Search for an animal" });
  await searchInput.fill("lion");
  await page.getByRole("option", { name: /Lion/i }).click();

  await expect(page.getByRole("heading", { name: "Game Over" })).toBeVisible();
  await expect(page.getByText("Game Over! The mystery animal was the Tiger.", { exact: true })).toBeVisible();
});

test("cross-day rollover resets to a fresh daily puzzle", async ({ page }) => {
  await gotoDailyAndWaitForShell(page);
  await dismissOnboardingPromptIfPresent(page);

  const searchInput = page.getByRole("combobox", { name: "Search for an animal" });
  await searchInput.fill("tiger");
  await page.getByRole("option", { name: /Tiger/i }).click();
  await expect(page.getByRole("heading", { name: /You Won!/ })).toBeVisible({ timeout: 30_000 });

  await reloadWithStaleDailyPuzzle(page);
  await dismissOnboardingPromptIfPresent(page);
  await expect(page.getByRole("combobox", { name: "Search for an animal" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/Guesses remaining:\s*20/)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".notebook-guess-history")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /You Won!/ })).toHaveCount(0);
});
