import { expect, test } from "@playwright/test";
import { gotoDailyAndWaitForShell } from "./helpers/daily-shell";
import { mockINaturalist } from "./helpers/inaturalist";

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

  const searchInput = page.getByRole("combobox", { name: "Search for an animal" });
  await searchInput.fill("lion");
  await page.getByRole("option", { name: /Lion/i }).click();

  const recentGuesses = page.locator(".notebook-guess-history");
  await expect(recentGuesses.getByText("Recent Guesses")).toBeVisible();
  await expect(recentGuesses.getByText("Lion", { exact: true })).toBeVisible();
  await expect(page.getByText(/Guesses remaining:\s*19/)).toBeVisible();

  await page.reload();
  await expect(recentGuesses.getByText("Lion", { exact: true })).toBeVisible();
  await expect(page.getByText(/Guesses remaining:\s*19/)).toBeVisible();

  await page.evaluate(() => {
    const persistedRaw = localStorage.getItem("cladle-game-store");
    if (!persistedRaw) {
      return;
    }
    const persisted = JSON.parse(persistedRaw);
    if (persisted?.dailyState) {
      persisted.dailyState.puzzleDate = "1999-01-01";
      if (persisted.dailyState.guesses) {
        persisted.dailyState.guesses = [];
      }
      persisted.dailyState.status = "playing";
      localStorage.setItem("cladle-game-store", JSON.stringify(persisted));
    }
  });

  await page.reload();
  await expect(page.getByText("Start by searching for an animal to see how it relates to the target")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/Guesses remaining:\s*20/)).toBeVisible();
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
  await expect(page.getByText("Game Over! The target was Tiger.", { exact: true })).toBeVisible();
});

test("cross-day rollover resets to a fresh daily puzzle", async ({ page }) => {
  await gotoDailyAndWaitForShell(page);

  const searchInput = page.getByRole("combobox", { name: "Search for an animal" });
  await searchInput.fill("tiger");
  await page.getByRole("option", { name: /Tiger/i }).click();
  await expect(page.getByRole("heading", { name: /You Won!/ })).toBeVisible();

  await page.evaluate(() => {
    const persistedRaw = localStorage.getItem("cladle-game-store");
    if (!persistedRaw) {
      return;
    }
    const persisted = JSON.parse(persistedRaw);
    if (persisted?.dailyState) {
      persisted.dailyState.puzzleDate = "1999-01-01";
      persisted.dailyState.status = "playing";
      persisted.dailyState.guesses = [];
      localStorage.setItem("cladle-game-store", JSON.stringify(persisted));
    }
  });

  await page.reload();
  await expect(page.getByRole("combobox", { name: "Search for an animal" })).toBeVisible({
    timeout: 30_000,
  });
  // Wait for the post-rollover “fresh puzzle” shell first. This prevents the previous
  // win screen from briefly remaining in the tree while persisted state rehydrates.
  const startHint = page.getByText(
    "Start by searching for an animal to see how it relates to the target",
  );
  await expect(startHint).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /You Won!/ })).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByText(/Guesses remaining:\s*20/)).toBeVisible();
});
