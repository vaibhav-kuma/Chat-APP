import { defineConfig } from "vitest/config";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://platform:platform_dev_password@localhost:5433/platform_test";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/setup.ts"],
    testTimeout: 20000,
    hookTimeout: 60000,
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl,
      REDIS_URL: process.env.TEST_REDIS_URL ?? "redis://localhost:6379",
      SESSION_SECRET: "test_session_secret_change_me",
      SESSION_TTL_SECONDS: "3600",
      FRONTEND_URL: "http://localhost:5173",
      PUBLIC_URL: "http://localhost:4000",

      // Keep Razorpay/Mux unconfigured -> NullProvider + dev payment path
      RAZORPAY_KEY_ID: "",
      RAZORPAY_KEY_SECRET: "",
      RAZORPAY_WEBHOOK_SECRET: "dev_webhook_secret_change_in_prod",
      MUX_TOKEN_ID: "",
      MUX_TOKEN_SECRET: "",
      MUX_WEBHOOK_SECRET: "",
      MUX_SIGNING_KEY: "",
      MUX_PRIVATE_KEY: "",

      // High rate limits so test suites never trip them
      RATE_LIMIT_AUTH_MAX: "100000",
      RATE_LIMIT_API_MAX: "100000",
      RATE_LIMIT_CHAT_MAX: "100000",
      RATE_LIMIT_COMMENT_MAX: "100000",
      RATE_LIMIT_WEBHOOK_MAX: "100000",

      ADMIN_EMAIL: "admin@example.com",
      ADMIN_PASSWORD: "change_me_admin",
      GRACE_PERIOD_DAYS: "3",
      MAX_FAILED_PAYMENTS: "3",
    },
  },
});
