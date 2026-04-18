import { expect, test } from "@playwright/test";
import { gotoDailyAndWaitForShell } from "./helpers/daily-shell";
import { isINaturalistSearchUrl, mockINaturalistTaxa } from "./helpers/inaturalist";

test.beforeEach(async ({ page }) => {
  await mockINaturalistTaxa(page);
});

test("API outage shows dedicated iNaturalist message after repeated failures", async ({ page }) => {
  test.setTimeout(120_000);

  await page.route(isINaturalistSearchUrl, async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ results: [] }),
    });
  });

  await gotoDailyAndWaitForShell(page);

  const searchInput = page.getByRole("combobox", { name: "Search for an animal" });
  await expect(searchInput).toBeEnabled({ timeout: 30_000 });

  const searchShell = page.locator(".animal-search");

  const waitSearch = (substring: string) =>
    page.waitForRequest(
      req => req.url().includes("api.inaturalist.org/v1/search")
        && req.url().includes(`q=${encodeURIComponent(substring)}`),
      { timeout: 45_000 },
    );

  const lionReq = waitSearch("lion");
  await searchInput.fill("lion");
  await lionReq;
  await expect(searchShell.getByText(/No animals found matching "lion"/)).toBeVisible({
    timeout: 45_000,
  });

  const tigerReq = waitSearch("tiger");
  await searchInput.fill("tiger");
  await tigerReq;
  await expect(searchShell.getByText(/No animals found matching "tiger"/)).toBeVisible({
    timeout: 45_000,
  });

  const bearReq = waitSearch("bear");
  await searchInput.fill("bear");
  await bearReq;
  await expect(
    searchShell.getByText(
      /iNaturalist is currently unavailable, so taxonomy and media search is temporarily degraded/,
    ),
  ).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("button", { name: "Retry search" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Check iNaturalist" })).toBeVisible();
});
