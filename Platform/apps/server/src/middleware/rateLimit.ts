import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: env.NODE_ENV === "production",
};

const rateMax = (name: string, fallback: number): number => {
  const parsed = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: rateMax("RATE_LIMIT_AUTH_MAX", 30),
  message: { error: { code: "RATE_LIMITED", message: "Too many attempts, try again later" } },
});

export const webhookLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  max: rateMax("RATE_LIMIT_WEBHOOK_MAX", 60),
  message: { error: { code: "RATE_LIMITED", message: "Too many requests" } },
});

export const chatLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  max: rateMax("RATE_LIMIT_CHAT_MAX", 30),
  message: { error: { code: "RATE_LIMITED", message: "Slow down, you're chatting too fast" } },
});

export const commentLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  max: rateMax("RATE_LIMIT_COMMENT_MAX", 20),
  message: { error: { code: "RATE_LIMITED", message: "Too many comments, try again later" } },
});

export const apiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  max: rateMax("RATE_LIMIT_API_MAX", 120),
  message: { error: { code: "RATE_LIMITED", message: "Too many requests" } },
});
