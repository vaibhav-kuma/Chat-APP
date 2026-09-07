import type { NextFunction, Request, Response } from "express";
import { Role, type User } from "@prisma/client";
import { prisma } from "../prisma.js";
import { getAuthEpoch } from "../services/session.js";
import { getEntitlement } from "../services/membership.js";
import { forbidden, unauthorized } from "../utils/httpError.js";

export interface AuthUser extends User {
  entitlement: Awaited<ReturnType<typeof getEntitlement>>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Resolve the user from the session cookie. Attaches to req.user.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const sess = req.session;
    const userId = sess.userId;

    if (!userId) {
      return next(unauthorized("Not signed in"));
    }

    // Session epoch invalidation check (cancellation/chargeback/block)
    if (sess.epoch !== undefined && sess.epoch !== (await getAuthEpoch(userId))) {
      req.session.destroy(() => undefined);
      return next(unauthorized("Session revoked"));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      req.session.destroy(() => undefined);
      return next(unauthorized("Account no longer exists"));
    }

    if (user.status !== "active") {
      req.session.destroy(() => undefined);
      return next(forbidden("Account is blocked"));
    }

    const entitlement = await getEntitlement(user);
    req.user = { ...user, entitlement };
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    return requireAuth(req, res, (err?: unknown) => {
      if (err) return next(err);
      if (!req.user) return next(unauthorized("Not signed in"));
      if (req.user.role !== Role.ADMIN) return next(forbidden("Admin access required"));
      next();
    });
  }
  if (req.user.role !== Role.ADMIN) {
    return next(forbidden("Admin access required"));
  }
  next();
}

export async function requireAdminMfa(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    return requireAuth(req, res, (err?: unknown) => {
      if (err) return next(err);
      finish();
    });
  }
  finish();

  function finish() {
    if (!req.user) return next(unauthorized("Not signed in"));
    if (req.user.role !== Role.ADMIN) return next(forbidden("Admin access required"));
    if (!req.session.mfaVerified) return next(forbidden("MFA verification required", "MFA_REQUIRED"));
    next();
  }
}

export function requireActiveMembership(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(unauthorized("Not signed in"));
  }
  if (!req.user.entitlement.isActiveMember) {
    return next(forbidden("Active subscription required", "MEMBERSHIP_REQUIRED"));
  }
  next();
}
