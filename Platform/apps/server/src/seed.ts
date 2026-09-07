import { prisma } from "./prisma.js";
import { env } from "./config/env.js";
import { hashPassword } from "./services/auth.js";

async function seedPlans(): Promise<void> {
  const existing = await prisma.plan.findFirst({ where: { name: "Monthly" } });
  if (existing) return;

  await prisma.plan.create({
    data: {
      name: "Monthly",
      description: "Full access to all videos and live streams",
      pricePaise: env.DEFAULT_PLAN_PRICE_PAISE,
      currency: "INR",
      billingCycle: "monthly",
      trialDays: env.DEFAULT_PLAN_TRIAL_DAYS,
      sortOrder: 0,
      razorpayPlanId: env.RAZORPAY_PLAN_ID || undefined,
    },
  });
  console.log("[seed] default monthly plan created");
}

async function seedAdmin(): Promise<void> {
  const email = env.ADMIN_EMAIL.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  await prisma.user.create({
    data: { email, passwordHash, name: "Administrator", role: "ADMIN" },
  });
  console.log(`[seed] admin user created: ${email}`);
}

async function seedCategories(): Promise<void> {
  const defaultCategories = [
    { name: "Entertainment", slug: "entertainment" },
    { name: "Education", slug: "education" },
    { name: "Devotional", slug: "devotional" },
    { name: "Kids", slug: "kids" },
    { name: "News & Updates", slug: "news-updates" },
  ];
  for (const cat of defaultCategories) {
    const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (!existing) {
      await prisma.category.create({ data: cat });
    }
  }
  console.log("[seed] default categories ensured");
}

export async function seedDatabase(): Promise<void> {
  await seedPlans();
  await seedAdmin();
  await seedCategories();
}
