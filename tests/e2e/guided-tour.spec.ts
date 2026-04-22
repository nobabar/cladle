import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mockINaturalist } from "./helpers/inaturalist";

async function startGuidedTourFromHelp(page: Page) {
  await page.goto("/help");
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await expect(page).toHaveURL(/\/(\?.*)?$/);
  await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
}

async function completeTourByButtons(page: Page) {
  for (let i = 0; i < 12; i += 1) {
    const finishVisible = await page.getByRole("button", { name: "Finish" }).isVisible().catch(() => false);
    if (finishVisible) {
      const finishButton = page.getByRole("button", { name: "Finish" });
      await finishButton.click({ timeout: 2_000 }).catch(async () => {
        await finishButton.click({ force: true });
      });
      return;
    }

    const nextVisible = await page.getByRole("button", { name: "Next" }).isVisible().catch(() => false);
    if (nextVisible) {
      const nextButton = page.getByRole("button", { name: "Next" });
      await nextButton.click({ timeout: 2_000 }).catch(async () => {
        await nextButton.click({ force: true });
      });
      await page.waitForTimeout(120);
      continue;
    }

    await page.waitForTimeout(120);
  }
}

async function closePostitFromStickyTab(page: Page) {
  const stickyTab = page.locator(
    "[data-onboarding='daily-information-postit'] .information-panel-postit__sticky-tab",
  );

  await stickyTab.waitFor({ state: "visible", timeout: 10_000 });

  await stickyTab.click({ timeout: 2_000 }).catch(async () => {
    // WebKit can keep this floating element in an unstable state briefly.
    await stickyTab.focus();
    await stickyTab.press("Enter").catch(async () => {
      await stickyTab.click({ force: true });
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockINaturalist(page);
});

test("guided tour advances with next-only navigation", async ({ page }) => {
  await startGuidedTourFromHelp(page);

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Search and submit a guess")).toBeVisible();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Read the tree clues")).toBeVisible();

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("dialog", { name: "Inspect node details" })).toBeVisible();
  await expect(page.getByText("4 / 5")).toBeVisible();
});

test("guided tour can progress through interactive actions", async ({ page }) => {
  await startGuidedTourFromHelp(page);

  await page.getByRole("button", { name: "Next" }).click();

  const searchInput = page.getByRole("combobox", { name: "Search for an animal" });
  await searchInput.fill("lion");
  await page.getByRole("option", { name: /Lion/i }).click();
  await expect(page.getByText("Read the tree clues")).toBeVisible();

  await page
    .locator("[data-onboarding='daily-tree'] .tree-node-group-rough[role='button']")
    .first()
    .click();
  await expect(page.getByText("Inspect node details")).toBeVisible();
  await expect(page.locator("[data-onboarding='daily-information-postit']")).toBeVisible();

  await closePostitFromStickyTab(page);
  await expect(page.getByRole("button", { name: "Next" }).or(page.getByRole("button", { name: "Finish" }))).toBeVisible();
  await completeTourByButtons(page);
  await expect(page.getByRole("button", { name: "Finish" })).toHaveCount(0);
});
