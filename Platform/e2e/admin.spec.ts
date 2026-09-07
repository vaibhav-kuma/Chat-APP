import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "change_me_admin";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  const form = page.locator("form.auth-card");
  await form.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await form.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL("/");
}

test("admin login shows the dashboard with stats", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("Members")).toBeVisible();
  await expect(page.getByText("Active subscriptions")).toBeVisible();
  await expect(page.getByText("Published videos")).toBeVisible();
  await expect(page.getByText("Monthly recurring")).toBeVisible();
});

test("admin can create an upload and sees a new DRAFT video", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/videos");

  const draftCount = await page.getByText("DRAFT", { exact: true }).count();

  page.on("popup", (p) => void p.close());
  await page.getByRole("button", { name: "New upload" }).click();

  await expect(page.getByText("DRAFT", { exact: true })).toHaveCount(draftCount + 1);
});

test("admin can schedule a live stream from the scheduler", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/live");

  const title = `E2E Live ${Date.now()}`;
  const createCard = page.locator(".card").first();
  await createCard.locator("input").nth(0).fill(title);
  await createCard.getByRole("button", { name: "Create stream" }).click();

  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(page.getByText("SCHEDULED").first()).toBeVisible();
});

test("a regular member cannot open the admin area", async ({ page }) => {
  await page.goto("/register");
  const form = page.locator("form.auth-card");
  await form.locator("input").nth(0).fill("Plain Member");
  await form.locator('input[type="email"]').fill(`member_${Date.now()}@test.com`);
  await form.locator('input[type="password"]').fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/subscribe/);

  await page.goto("/admin");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
});
