import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mockINaturalist } from "./helpers/inaturalist";

async function startGuidedTourFromHelp(page: Page) {
  await page.goto("/help");
  await page.getByRole("button", { name: "Start guided tour" }).click();
  await expect(page).toHaveURL(/\/(\?.*)?$/);
  await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
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

test("guided tour can be closed via button but not via overlay click", async ({ page }) => {
  await startGuidedTourFromHelp(page);

  await expect(page.getByRole("button", { name: "Close" })).toBeVisible();

  await page.locator(".driver-overlay").click({ position: { x: 8, y: 8 } });
  await expect(page.getByRole("button", { name: "Next" })).toBeVisible();

  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.locator(".driver-popover")).toHaveCount(0);
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
  await expect(page.getByRole("button", { name: "Finish" })).toBeVisible({ timeout: 10_000 });

  const scrollYBeforeFinish = await page.evaluate(() => window.scrollY);
  expect(scrollYBeforeFinish).toBeGreaterThan(200);

  await page.locator(".driver-popover-navigation-btns .driver-popover-next-btn").click();
  await expect(page.locator(".driver-popover")).toHaveCount(0);

  await expect
    .poll(() => page.evaluate(() => window.scrollY), {
      timeout: 15_000,
      intervals: [100, 250, 500],
    })
    .toBeLessThan(scrollYBeforeFinish * 0.5);
});
