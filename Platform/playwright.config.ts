import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.E2E_API_URL ?? "http://localhost:4000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node dist/index.js",
      cwd: path.resolve(__dirname, "apps/server"),
      url: `${API_URL}/health`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev:web",
      url: BASE_URL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
