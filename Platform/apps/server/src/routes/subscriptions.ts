import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { webhookLimiter } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";
import { createSubscription as createRazorpaySubscription, isKnownEvent, verifyWebhookSignature } from "../services/razorpay.js";
import {
  createLocalSubscription,
  getActivePlan,
  onSubscriptionActivated,
  onSubscriptionCancelled,
  onSubscriptionChargeFailed,
  onSubscriptionCharged,
  onSubscriptionPaused,
  onSubscriptionRevoked,
  subscriptionPeriodFromNow,
} from "../services/subscriptions.js";
import { notifyUser } from "../services/notifications.js";
import { badRequest, unauthorized } from "../utils/httpError.js";
import { env } from "../config/env.js";

export const subscriptionsRouter = Router();

subscriptionsRouter.get("/plans", async (_req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return res.json({ plans });
  } catch (err) {
    next(err);
  }
});

const checkoutSchema = z.object({
  planId: z.string().min(1),
});

// Step 1: create Razorpay hosted checkout session
subscriptionsRouter.post("/checkout", requireAuth, validateBody(checkoutSchema), async (req, res, next) => {
  try {
    const user = req.user!;
    if (user.entitlement.isActiveMember && user.role !== "ADMIN") {
      throw badRequest("You already have an active subscription", "ALREADY_ACTIVE");
    }

    const plan = await prisma.plan.findFirst({ where: { id: req.body.planId, isActive: true } });
    if (!plan) {
      throw badRequest("Invalid plan", "PLAN_NOT_FOUND");
    }
    if (!plan.razorpayPlanId) {
      throw badRequest("Plan is not connected to Razorpay", "PLAN_NOT_CONFIGURED");
    }

    const razorpaySub = await createRazorpaySubscription(plan.razorpayPlanId, user.email, user.name);
    const local = await createLocalSubscription({
      userId: user.id,
      planId: plan.id,
      razorpaySubscriptionId: razorpaySub.id,
    });

    return res.status(201).json({
      subscription: {
        id: local.id,
        razorpaySubscriptionId: razorpaySub.id,
        status: "incomplete",
        shortUrl: razorpaySub.short_url,
      },
    });
  } catch (err) {
    next(err);
  }
});

subscriptionsRouter.get("/status", requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const sub = await prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    });
    return res.json({
      isActive: user.entitlement.isActiveMember,
      subscription: sub
        ? {
            id: sub.id,
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd,
            gracePeriodEnd: sub.gracePeriodEnd,
            failedPaymentCount: sub.failedPaymentCount,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
            plan: sub.plan,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

subscriptionsRouter.post("/cancel", requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const sub = await prisma.subscription.findFirst({
      where: { userId: user.id, status: { in: ["ACTIVE", "PAST_DUE"] } },
      orderBy: { createdAt: "desc" },
    });
    if (!sub) {
      throw badRequest("No active subscription", "NO_ACTIVE_SUBSCRIPTION");
    }
    if (sub.razorpaySubscriptionId) {
      const { razorpay } = await import("../services/razorpay.js");
      if (razorpay) {
        await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId);
      }
    }
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "CANCELLED", cancelAtPeriodEnd: true, cancelledAt: new Date() },
    });
    return res.json({ subscription: updated });
  } catch (err) {
    next(err);
  }
});

// Razorpay webhook — raw body, signature verified, idempotent via PaymentEvent
subscriptionsRouter.post("/webhook", webhookLimiter, async (req, res, next) => {
  try {
    const rawBody = req.body as Buffer;
    const signature = req.get("x-razorpay-signature") ?? "";

    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ error: { code: "INVALID_SIGNATURE", message: "Invalid webhook signature" } });
    }

    const payload = JSON.parse(rawBody.toString("utf8")) as {
      event?: string;
      payload?: {
        subscription?: { entity?: Record<string, unknown> };
        payment?: { entity?: Record<string, unknown> };
      };
    };

    if (!payload.event || !isKnownEvent(payload.event)) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const eventId = `${payload.event}_${(payload.payload?.subscription?.entity?.id as string) ?? (payload.payload?.payment?.entity?.id as string) ?? Date.now()}`;
    const existing = await prisma.paymentEvent.findUnique({ where: { eventId } });
    if (existing) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    const subEntity = payload.payload?.subscription?.entity as
      | { id: string; status?: string; current_start?: number; current_end?: number; end_at?: number; cancelled_at?: number }
      | undefined;

    if (subEntity?.id) {
      switch (payload.event) {
        case "subscription.activated": {
          const { start, end } = subscriptionPeriodFromNow(30);
          await onSubscriptionActivated({
            razorpaySubscriptionId: subEntity.id,
            userId: await resolveUserIdByRazorpaySub(subEntity.id),
            periodStart: subEntity.current_start ? new Date(subEntity.current_start * 1000) : start,
            periodEnd: subEntity.current_end ? new Date(subEntity.current_end * 1000) : end,
          });
          break;
        }
        case "subscription.charged": {
          await onSubscriptionCharged({
            razorpaySubscriptionId: subEntity.id,
            periodStart: subEntity.current_start ? new Date(subEntity.current_start * 1000) : new Date(),
            periodEnd: subEntity.current_end ? new Date(subEntity.current_end * 1000) : new Date(Date.now() + 30 * 86400000),
          });
          break;
        }
        case "subscription.charged.failed": {
          await onSubscriptionChargeFailed({ razorpaySubscriptionId: subEntity.id });
          break;
        }
        case "subscription.cancelled": {
          await onSubscriptionCancelled({
            razorpaySubscriptionId: subEntity.id,
            cancelledAt: subEntity.cancelled_at ? new Date(subEntity.cancelled_at * 1000) : undefined,
            endAt: subEntity.end_at ? new Date(subEntity.end_at * 1000) : undefined,
          });
          break;
        }
        case "subscription.paused":
          await onSubscriptionPaused({ razorpaySubscriptionId: subEntity.id });
          break;
        case "subscription.halted":
          await onSubscriptionRevoked({ razorpaySubscriptionId: subEntity.id });
          break;
      }
    }

    await prisma.paymentEvent.create({
      data: {
        eventId,
        type: payload.event,
        entityId: subEntity?.id ?? String(req.ip),
        payload: JSON.parse(JSON.stringify(payload)) as never,
      },
    });

    return res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
});

async function resolveUserIdByRazorpaySub(razorpaySubscriptionId: string): Promise<string> {
  const sub = await prisma.subscription.findUnique({ where: { razorpaySubscriptionId } });
  if (!sub) {
    throw new Error(`Subscription not found for razorpay id ${razorpaySubscriptionId}`);
  }
  return sub.userId;
}
