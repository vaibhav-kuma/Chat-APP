import type { SubscriptionStatus, User } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../prisma.js";

export interface Entitlement {
  isActiveMember: boolean;
  subscription: {
    id: string;
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
    gracePeriodEnd: Date | null;
  } | null;
}

/**
 * Resolve a user's current subscription entitlement.
 * Admin users always have access (bypass billing).
 */
export async function getEntitlement(user: User): Promise<Entitlement> {
  if (user.role === "ADMIN") {
    return {
      isActiveMember: true,
      subscription: null,
    };
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) {
    return { isActiveMember: false, subscription: null };
  }

  if (sub.status === "ACTIVE") {
    const periodEnd = sub.currentPeriodEnd;
    if (periodEnd && periodEnd.getTime() < Date.now()) {
      // Period expired — check grace window
      const graceEnd = sub.gracePeriodEnd ?? periodEnd;
      const now = Date.now();
      if (now <= graceEnd.getTime()) {
        return {
          isActiveMember: true,
          subscription: {
            id: sub.id,
            status: sub.status,
            currentPeriodEnd: periodEnd,
            gracePeriodEnd: graceEnd,
          },
        };
      }
      return { isActiveMember: false, subscription: sub };
    }
    return {
      isActiveMember: true,
      subscription: {
        id: sub.id,
        status: sub.status,
        currentPeriodEnd: periodEnd,
        gracePeriodEnd: sub.gracePeriodEnd,
      },
    };
  }

  if (sub.status === "PAST_DUE" && sub.gracePeriodEnd) {
    const now = Date.now();
    if (now <= sub.gracePeriodEnd.getTime()) {
      return {
        isActiveMember: true,
        subscription: {
          id: sub.id,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd,
          gracePeriodEnd: sub.gracePeriodEnd,
        },
      };
    }
  }

  return { isActiveMember: false, subscription: sub };
}

/**
 * Extract remaining active period (grace-inclusive) in ms, for cache TTLs.
 */
export function remainingActiveMs(sub: { currentPeriodEnd?: Date | null; gracePeriodEnd?: Date | null }): number {
  const end = sub.gracePeriodEnd ?? sub.currentPeriodEnd;
  if (!end) return 0;
  return Math.max(0, end.getTime() - Date.now());
}

export const gracePeriodDays = env.GRACE_PERIOD_DAYS;
export const maxFailedPayments = env.MAX_FAILED_PAYMENTS;
