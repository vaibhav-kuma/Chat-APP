import { test, expect } from "@playwright/test";

const PASSWORD = "password123";

function freshEmail(): string {
  return `e2e_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`;
}

async function register(page: import("@playwright/test").Page, email: string) {
  await page.goto("/register");
  const form = page.locator("form.auth-card");
  await form.locator("input").nth(0).fill("E2E User");
  await form.locator('input[type="email"]').fill(email);
  await form.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
}

test("register a new member and land on the subscription page", async ({ page }) => {
  await register(page, freshEmail());
  await expect(page).toHaveURL(/\/subscribe/);
  await expect(page.getByRole("heading", { name: "Membership" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Subscribe" }).first()).toBeVisible();
});

test("login as the new member and see the inactive-membership banner", async ({ page }) => {
  const email = freshEmail();
  await register(page, email);

  await page.goto("/login");
  const form = page.locator("form.auth-card");
  await form.locator('input[type="email"]').fill(email);
  await form.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Your membership is not active.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
});

test("a fresh member cannot complete a Razorpay checkout in dev (plan not configured)", async ({ page }) => {
  await register(page, freshEmail());
  await expect(page).toHaveURL(/\/subscribe/);
  await page.getByRole("button", { name: "Subscribe" }).first().click();
  await expect(page.getByText("Plan is not connected to Razorpay")).toBeVisible();
});

test("logout clears the session and shows the anonymous hero", async ({ page }) => {
  await register(page, freshEmail());
  await expect(page).toHaveURL(/\/subscribe/);
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByText("Unlimited family-safe videos & live streams")).toBeVisible();
});
