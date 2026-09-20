import { expect, test } from "@playwright/test";

test("beginner mode opens sticker menu without network search", async ({ page }) => {
  let inatRequestCount = 0;
  await page.route("**/api.inaturalist.org/**", async (route) => {
    inatRequestCount += 1;
    await route.fulfill({ status: 500, body: "blocked" });
  });

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

  // Popover closes on select, reopen unless the guess won the puzzle.
  if (await openPicker.isEnabled()) {
    await openPicker.click();
    await expect(page.getByRole("button", { name: /Dog, already guessed/i })).toBeDisabled();
  } else {
    await expect(page.getByText("Congratulations! You found the Dog!")).toBeVisible();
  }

  expect(inatRequestCount).toBe(0);
});
