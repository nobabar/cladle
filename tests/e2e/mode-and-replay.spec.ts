import { expect, test } from "@playwright/test";
import { goToDailyFromFreePlay, goToFreePlayFromDaily, openPuzzleHistoryFromDaily } from "./helpers/daily-header";
import { getTodayUtcDate, mockINaturalist } from "./helpers/inaturalist";

test.beforeEach(async ({ page }) => {
  await mockINaturalist(page);
});

test("free play entry is accessible from daily page", async ({ page }) => {
  await page.goto("/");
  await goToFreePlayFromDaily(page);
  await expect(page).toHaveURL(/\/free-play/);
  await expect(page.getByText("Free Play Mode")).toBeVisible();
  await expect(page.getByRole("button", { name: "New Random Animal" })).toBeVisible();
});

test("replay mode from history and return to today", async ({ page }) => {
  const today = getTodayUtcDate();
  await page.addInitScript(({ date }) => {
    const tiger = {
      id: "41967",
      name: "Tiger",
      scientificName: "Panthera tigris",
      taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera", "Panthera tigris"],
    };
    const lion = {
      id: "41964",
      name: "Lion",
      scientificName: "Panthera leo",
      taxonomy: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera", "Panthera leo"],
    };

    const root = { id: "root", type: "clade", name: "Animalia", cladeData: { name: "Animalia", rank: "kingdom" }, children: [], depth: 0 };
    const targetNode = { id: "animal-41967", type: "animal", name: "Tiger", data: tiger, children: [], isTarget: true, depth: 1 };
    (root as any).children = [targetNode];

    const dailyPersisted = {
      version: 1,
      gameMode: "daily",
      dailyState: {
        status: "playing",
        target: tiger,
        guesses: [{
          animal: lion,
          lca: {
            clade: "Panthera",
            rank: "genus",
            depth: 5,
            path: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera"],
          },
          timestamp: Date.now(),
        }],
        maxGuesses: 20,
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

    const historyEntry = {
      puzzleDate: "2026-04-01",
      targetAnimal: tiger,
      completionStatus: "won",
      guesses: [{
        animal: tiger,
        lca: {
          clade: "Panthera tigris",
          rank: "species",
          depth: 6,
          path: ["Animalia", "Chordata", "Mammalia", "Carnivora", "Felidae", "Panthera", "Panthera tigris"],
        },
        timestamp: Date.now() - 1000,
      }],
      treeData: {
        root,
        target: targetNode,
        nodes: [root, targetNode],
        guesses: [],
      },
      completedAt: Date.now() - 1000,
    };

    localStorage.setItem("cladle-game-store", JSON.stringify(dailyPersisted));
    localStorage.setItem("cladle-puzzle-history", JSON.stringify([historyEntry]));
  }, { date: today });

  await page.goto("/");
  await openPuzzleHistoryFromDaily(page);
  await page.getByRole("button", { name: "View puzzle" }).click();

  await expect(page.getByRole("button", { name: "Back to today" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Search for an animal" })).toBeDisabled();

  await page.getByRole("button", { name: "Back to today" }).dispatchEvent("click");
  await expect(page.getByRole("combobox", { name: "Search for an animal" })).toBeEnabled();
});

test("free-play reset behavior clears progress", async ({ page }) => {
  await page.goto("/free-play");

  const searchInput = page.getByRole("combobox", { name: "Search for an animal" });
  await searchInput.fill("lion");
  const lionOption = page.getByRole("option", { name: /Lion/i });
  await expect(lionOption).toBeVisible();
  await lionOption.click();
  await expect(lionOption).toHaveCount(0);
  await expect
    .poll(async () => {
      const hasRecentGuess = await page
        .locator(".notebook-guess-history")
        .getByText("Lion", { exact: true })
        .isVisible()
        .catch(() => false);
      const hasEndState = await page.getByRole("heading", { name: /You Won!|Game Over/ }).isVisible().catch(() => false);
      return hasRecentGuess || hasEndState;
    })
    .toBe(true);

  await page.getByRole("button", { name: "New Random Animal" }).dispatchEvent("click");
  await expect(page.locator(".notebook-guess-history")).toHaveCount(0);
  await expect(page.getByText(/Guesses remaining:\s*20/)).toBeVisible();
});

test("persistence across mode switch keeps each mode state", async ({ page }) => {
  await page.goto("/");

  const dailySearch = page.getByRole("combobox", { name: "Search for an animal" });
  await dailySearch.fill("lion");
  await page.getByRole("option", { name: /Lion/i }).click();
  await expect(page.locator(".notebook-guess-history").getByText("Lion", { exact: true })).toBeVisible();

  await goToFreePlayFromDaily(page);
  await expect(page).toHaveURL(/\/free-play/);

  const freePlaySearch = page.getByRole("combobox", { name: "Search for an animal" });
  await freePlaySearch.fill("wolf");
  await page.getByRole("option", { name: /Gray Wolf/i }).click();
  await expect(page.locator(".notebook-guess-history").getByText("Gray Wolf", { exact: true })).toBeVisible();

  await goToDailyFromFreePlay(page);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".notebook-guess-history").getByText("Lion", { exact: true })).toBeVisible();
  await expect(page.locator(".notebook-guess-history").getByText("Gray Wolf", { exact: true })).toHaveCount(0);

  await goToFreePlayFromDaily(page);
  await expect(page.locator(".notebook-guess-history").getByText("Gray Wolf", { exact: true })).toBeVisible();
});
