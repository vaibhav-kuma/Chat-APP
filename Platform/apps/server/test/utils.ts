import crypto from "node:crypto";
import { execSync } from "node:child_process";
import path from "node:path";
import request from "supertest";
import { prisma } from "../src/prisma.js";

export function signWebhook(rawBody: Buffer, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function jsonBody(obj: unknown): Buffer {
  return Buffer.from(JSON.stringify(obj), "utf8");
}

export function signMuxWebhook(rawBody: Buffer, secret: string): string {
  // Mux signs base64(header).hex(digest); header here is the raw payload timestamp
  const header = "t=1710000000";
  const payloadToSign = Buffer.from(`${header}.${rawBody.toString("utf8")}`);
  const digest = crypto.createHmac("sha256", secret).update(payloadToSign).digest("hex");
  return `${header},v1=${digest}`;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
}

export async function createUser(overrides?: Partial<{ email: string; password: string; name: string; role: string; status: string }>): Promise<TestUser> {
  const email = overrides?.email ?? `user_${crypto.randomBytes(6).toString("hex")}@test.com`;
  const password = overrides?.password ?? "password123";
  const name = overrides?.name ?? "Test User";
  const { hashPassword } = await import("../src/services/auth.js");
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      role: (overrides?.role ?? "MEMBER") as never,
      status: overrides?.status ?? "active",
    },
  });
  return { id: user.id, email, password, name };
}

export async function activateSubscription(userId: string, planId: string): Promise<{ id: string }> {
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return prisma.subscription.create({
    data: {
      userId,
      planId,
      razorpaySubscriptionId: `rzp_test_sub_${crypto.randomBytes(6).toString("hex")}`,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: end,
    },
  });
}

export function runMigrateDeploy(): void {
  execSync("npx prisma migrate deploy --schema prisma/schema.prisma", {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL! },
  });
}

export { request };
