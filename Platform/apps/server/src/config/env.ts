import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  SESSION_SECRET: z.string().min(1),
  SESSION_TTL_SECONDS: z.coerce.number().default(60 * 60 * 24 * 7),
  SESSION_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  PUBLIC_URL: z.string().default("http://localhost:4000"),

  RAZORPAY_KEY_ID: z.string().default(""),
  RAZORPAY_KEY_SECRET: z.string().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(""),
  RAZORPAY_PLAN_ID: z.string().optional(),
  DEFAULT_PLAN_PRICE_PAISE: z.coerce.number().default(99900),
  DEFAULT_PLAN_TRIAL_DAYS: z.coerce.number().default(0),
  GRACE_PERIOD_DAYS: z.coerce.number().default(3),
  MAX_FAILED_PAYMENTS: z.coerce.number().default(3),

  MUX_TOKEN_ID: z.string().default(""),
  MUX_TOKEN_SECRET: z.string().default(""),
  MUX_WEBHOOK_SECRET: z.string().default(""),
  MUX_SIGNING_KEY: z.string().default(""),
  MUX_PRIVATE_KEY: z.string().default(""),

  EMAIL_FROM: z.string().default("no-reply@example.com"),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  ADMIN_EMAIL: z.string().default("admin@example.com"),
  ADMIN_PASSWORD: z.string().min(8).default("change_me_admin"),

  GRIEVANCE_OFFICER_NAME: z.string().default("Grievance Officer"),
  GRIEVANCE_OFFICER_EMAIL: z.string().default("grievance@example.com"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === "production";
