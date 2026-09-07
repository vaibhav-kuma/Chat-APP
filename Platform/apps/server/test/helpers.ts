import crypto from "node:crypto";
import { prisma } from "../src/prisma.js";

const MODELS = [
  "PaymentEvent",
  "AuditLog",
  "ModerationAction",
  "Report",
  "Notification",
  "ChatMessage",
  "Follow",
  "Like",
  "Comment",
  "LiveStream",
  "Video",
  "Category",
  "Subscription",
  "Plan",
  "Session",
  "User",
];

export async function truncateAll(): Promise<void> {
  const names = MODELS.map((m) => `"${m}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE;`);
}

export async function seedBase(): Promise<{ adminId: string; planId: string; categoryId: string }> {
  const { hashPassword } = await import("../src/services/auth.js");

  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Administrator",
      role: "ADMIN",
      passwordHash: await hashPassword("change_me_admin"),
    },
  });

  const plan = await prisma.plan.create({
    data: {
      name: "Monthly",
      description: "Full access",
      pricePaise: 99900,
      currency: "INR",
      billingCycle: "monthly",
      trialDays: 0,
      sortOrder: 0,
    },
  });

  const category = await prisma.category.create({
    data: { name: "Education", slug: "education", sortOrder: 0 },
  });

  return { adminId: admin.id, planId: plan.id, categoryId: category.id };
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
}

export async function createUser(
  overrides?: Partial<{ email: string; password: string; name: string; role: string; status: string }>
): Promise<TestUser> {
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

export function signWebhook(rawBody: Buffer, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function webhookHeaders(rawBody: Buffer, secret: string): { "Content-Type": string; "x-razorpay-signature": string } {
  return {
    "Content-Type": "application/json",
    "x-razorpay-signature": signWebhook(rawBody, secret),
  };
}
