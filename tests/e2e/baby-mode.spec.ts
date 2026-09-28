import { expect, test } from "@playwright/test";
import { mockGameApi } from "./helpers/gameApi";
import { isINaturalistSearchUrl } from "./helpers/inaturalist";

test("beginner mode opens sticker menu without network search", async ({ page }) => {
  let searchRequestCount = 0;
  await page.route("**/api.inaturalist.org/**", async (route) => {
    const url = new URL(route.request().url());
    if (isINaturalistSearchUrl(url)) {
      searchRequestCount += 1;
    }
    // Ignore failures for Animalia prefetch / other public clade fetches.
    await route.fulfill({ status: 500, body: "blocked" });
  });
  await mockGameApi(page);

  await page.goto("/baby");

  await expect(page).toHaveURL(/\/baby/);
  await expect(page.getByRole("heading", { name: "Beginner mode" })).toBeVisible({
    timeout: 30_000,
  });

  const openPicker = page.getByRole("button", { name: "Choose an animal" });
  await expect(openPicker).toBeVisible();
  await expect(openPicker).toBeEnabled();
  await openPicker.click();

  const dogButton = page.getByRole("button", { name: "Guess Dog" });
  await expect(dogButton).toBeVisible();
  await dogButton.click();

  // Dog is the mocked target, so this should win.
  await expect(page.getByText("Congratulations! You found the Dog!", { exact: true })).toBeVisible({
    timeout: 15_000,
  });

  expect(searchRequestCount).toBe(0);
});
