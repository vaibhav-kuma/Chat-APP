import { SubscriptionStatus, type User } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../prisma.js";
import { revokeAllSessions } from "./auth.js";
import { notifyUser } from "./notifications.js";
import { sendEmail } from "./email.js";
import { gracePeriodDays, maxFailedPayments } from "./membership.js";

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

export interface SubscriptionTransition {
  subscriptionId: string;
  userId: string;
  userEmail: string;
  userName: string;
}

/**
 * Handle subscription.activated — mark active, set period, clear dunning state.
 */
export async function onSubscriptionActivated(opts: {
  razorpaySubscriptionId: string;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
}): Promise<SubscriptionTransition> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: opts.userId } });

  const sub = await prisma.subscription.update({
    where: { razorpaySubscriptionId: opts.razorpaySubscriptionId },
    data: {
      status: "ACTIVE",
      startedAt: opts.periodStart,
      currentPeriodStart: opts.periodStart,
      currentPeriodEnd: opts.periodEnd,
      gracePeriodEnd: null,
      failedPaymentCount: 0,
      cancelAtPeriodEnd: false,
      lastChargedAt: new Date(),
    },
  });

  await notifyUser(user.id, "SUBSCRIPTION", "Subscription activated", "Welcome aboard! Your membership is active.");

  return {
    subscriptionId: sub.id,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
  };
}

/**
 * Handle subscription.charged — renewal. Extends period.
 */
export async function onSubscriptionCharged(opts: {
  razorpaySubscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
}): Promise<SubscriptionTransition | null> {
  const sub = await prisma.subscription.findUnique({ where: { razorpaySubscriptionId: opts.razorpaySubscriptionId } });
  if (!sub) return null;

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      currentPeriodStart: opts.periodStart,
      currentPeriodEnd: opts.periodEnd,
      gracePeriodEnd: null,
      failedPaymentCount: 0,
      cancelAtPeriodEnd: false,
      lastChargedAt: new Date(),
    },
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: sub.userId } });
  await notifyUser(user.id, "PAYMENT", "Payment successful", `Your membership is renewed until ${opts.periodEnd.toDateString()}.`);

  return { subscriptionId: updated.id, userId: user.id, userEmail: user.email, userName: user.name };
}

/**
 * Handle subscription.charged.failed — dunning. Increment failure count,
 * enter past_due with grace window. Cut access once grace expires.
 */
export async function onSubscriptionChargeFailed(opts: {
  razorpaySubscriptionId: string;
}): Promise<SubscriptionTransition | null> {
  const sub = await prisma.subscription.findUnique({ where: { razorpaySubscriptionId: opts.razorpaySubscriptionId } });
  if (!sub) return null;

  const failureCount = sub.failedPaymentCount + 1;
  const now = new Date();
  const graceEnd = addDays(now, gracePeriodDays);

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "PAST_DUE",
      failedPaymentCount: failureCount,
      gracePeriodEnd: graceEnd,
      currentPeriodEnd: sub.currentPeriodEnd,
    },
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: sub.userId } });

  await notifyUser(
    user.id,
    "PAYMENT",
    "Payment failed",
    failureCount >= maxFailedPayments
      ? "Multiple payment attempts failed. Your access will be suspended soon."
      : `Payment attempt ${failureCount} failed. Access continues for ${gracePeriodDays} days while we retry.`
  );
  await sendEmail({
    to: user.email,
    subject: "Payment failed — update your payment method",
    text: `Hi ${user.name},\n\nYour subscription payment failed (attempt ${failureCount}). You still have access until ${graceEnd.toDateString()}, after which your membership will be suspended. Please update your payment method.\n\n— Video Platform`,
  });

  // If we've exhausted retries, cut access now
  if (failureCount >= maxFailedPayments) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "EXPIRED", gracePeriodEnd: null },
    });
    await revokeAllSessions(user.id);
    await notifyUser(user.id, "SUBSCRIPTION", "Membership suspended", "We could not renew your subscription. Subscribe again to continue watching.");
  }

  return {
    subscriptionId: updated.id,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
  };
}

/**
 * Handle subscription.cancelled — keep access until period end, stop auto-renew.
 */
export async function onSubscriptionCancelled(opts: {
  razorpaySubscriptionId: string;
  cancelledAt?: Date | null;
  endAt?: Date | null;
}): Promise<SubscriptionTransition | null> {
  const sub = await prisma.subscription.findUnique({ where: { razorpaySubscriptionId: opts.razorpaySubscriptionId } });
  if (!sub) return null;

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "CANCELLED",
      cancelAtPeriodEnd: true,
      cancelledAt: opts.cancelledAt ?? new Date(),
      currentPeriodEnd: opts.endAt ?? sub.currentPeriodEnd,
      gracePeriodEnd: opts.endAt ?? sub.currentPeriodEnd,
    },
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: sub.userId } });
  await notifyUser(user.id, "SUBSCRIPTION", "Subscription cancelled", "Your subscription will end at the end of the current billing period.");

  return { subscriptionId: updated.id, userId: user.id, userEmail: user.email, userName: user.name };
}

/**
 * Handle subscription.paused — immediate access cut (RBI/chargeback hard-stop).
 */
export async function onSubscriptionPaused(opts: { razorpaySubscriptionId: string }): Promise<SubscriptionTransition | null> {
  const sub = await prisma.subscription.findUnique({ where: { razorpaySubscriptionId: opts.razorpaySubscriptionId } });
  if (!sub) return null;

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "PAUSED", gracePeriodEnd: null },
  });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: sub.userId } });
  await revokeAllSessions(user.id);
  await notifyUser(user.id, "SUBSCRIPTION", "Membership suspended", "Your subscription has been suspended. Contact support if this is unexpected.");

  return { subscriptionId: updated.id, userId: user.id, userEmail: user.email, userName: user.name };
}

export async function onSubscriptionRevoked(opts: { razorpaySubscriptionId: string }): Promise<SubscriptionTransition | null> {
  return onSubscriptionPaused(opts);
}

/**
 * Cron job: expire subscriptions whose period + grace window has passed.
 */
export async function expireGracePeriodSubscriptions(): Promise<number> {
  const now = new Date();

  const gracePast = await prisma.subscription.findMany({
    where: {
      status: { in: ["PAST_DUE", "ACTIVE"] },
      gracePeriodEnd: { lt: now },
    },
  });

  let expired = 0;
  for (const sub of gracePast) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "EXPIRED", gracePeriodEnd: null },
    });
    await revokeAllSessions(sub.userId);
    const user = await prisma.user.findUnique({ where: { id: sub.userId } });
    if (user) {
      await notifyUser(user.id, "SUBSCRIPTION", "Membership expired", "Your membership has expired. Renew to continue watching.");
    }
    expired++;
  }
  return expired;
}

/**
 * Create a local subscription record for a Razorpay checkout (status INCOMPLETE
 * until the activation webhook confirms). Also used for manual subscription seeding.
 */
export async function createLocalSubscription(input: {
  userId: string;
  planId: string;
  razorpaySubscriptionId?: string;
}): Promise<{ id: string }> {
  return prisma.subscription.create({
    data: {
      userId: input.userId,
      planId: input.planId,
      razorpaySubscriptionId: input.razorpaySubscriptionId,
      status: "INCOMPLETE",
    },
  });
}

export async function getActivePlan() {
  return prisma.plan.findFirst({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export function subscriptionPeriodFromNow(days: number): { start: Date; end: Date } {
  const start = new Date();
  return { start, end: addDays(start, days) };
}
