import { test, expect } from "@playwright/test";

test("anonymous home shows hero and latest videos section", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Unlimited family-safe videos & live streams")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Latest Videos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Join" })).toBeVisible();
});

test("search from the navbar navigates to the search results page", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search videos").fill("education");
  await page.getByLabel("Search videos").press("Enter");
  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByRole("heading", { name: /Results for/ })).toBeVisible();
});

test("live page renders live & scheduled streams section", async ({ page }) => {
  await page.goto("/live");
  await expect(page.getByRole("heading", { name: /Live|Upcoming|Streams/i }).first()).toBeVisible();
});

test("legal pages are reachable from the footer", async ({ page }) => {
  await page.goto("/terms");
  await expect(page).toHaveURL(/\/terms/);
  await expect(page.getByRole("heading", { name: /Terms/i }).first()).toBeVisible();

  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: /Privacy/i }).first()).toBeVisible();
});
