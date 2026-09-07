import type { SessionData } from "express-session";
import { RedisStore } from "connect-redis";
import session from "express-session";
import { env } from "../config/env.js";
import { redis } from "../config/redis.js";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    role?: string;
    email?: string;
    mfaVerified?: boolean;
  }
}

const store = new RedisStore({
  client: redis,
  prefix: "session:",
});

const cookieSecure =
  env.SESSION_COOKIE_SECURE === undefined
    ? env.PUBLIC_URL.startsWith("https://")
    : env.SESSION_COOKIE_SECURE === "true";

export const sessionMiddleware = session({
  name: "sid",
  store,
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    maxAge: env.SESSION_TTL_SECONDS * 1000,
    path: "/",
  },
});

export type { SessionData };

/**
 * Per-user session epoch. Bumped to invalidate all of a user's sessions
 * (cancellation, chargeback, password change, block).
 */
export async function getAuthEpoch(userId: string): Promise<number> {
  const raw = await redis.get(`authEpoch:${userId}`);
  return raw ? parseInt(raw, 10) : 0;
}

export async function bumpAuthEpoch(userId: string): Promise<void> {
  await redis.incr(`authEpoch:${userId}`);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await bumpAuthEpoch(userId);
}

export async function stampAuthEpoch(sess: SessionEpoch, userId: string): Promise<void> {
  sess.epoch = await getAuthEpoch(userId);
}

interface SessionEpoch {
  epoch?: number;
}

declare module "express-session" {
  interface SessionData {
    epoch?: number;
  }
}
