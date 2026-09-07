import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";
import { establishSession, loginUser, registerUser, verifyTOTP } from "../services/auth.js";
import { badRequest, unauthorized } from "../utils/httpError.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const mfaSchema = z.object({
  token: z.string().regex(/^\d{6}$/),
});

authRouter.post("/register", authLimiter, validateBody(registerSchema), async (req, res, next) => {
  try {
    const user = await registerUser(req.body);
    await establishSession(req.session, user);
    return res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", authLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const user = await loginUser(req.body);
    await establishSession(req.session, user);
    return res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      mfaRequired: user.role === "ADMIN" && user.isMfaEnabled,
    });
  } catch (err) {
    next(err);
  }
});

// Admin MFA verification step (after login when admin has MFA enabled)
authRouter.post("/mfa/verify", authLimiter, requireAuth, validateBody(mfaSchema), async (req, res, next) => {
  try {
    const user = req.user!;
    if (user.role !== "ADMIN" || !user.mfaSecret) {
      throw badRequest("MFA not configured", "MFA_NOT_CONFIGURED");
    }
    if (!verifyTOTP(user.mfaSecret, req.body.token)) {
      throw unauthorized("Invalid verification code", "INVALID_MFA");
    }
    req.session.mfaVerified = true;
    return res.json({ verified: true });
  } catch (err) {
    next(err);
  }
});

// Verify MFA status (for admin frontend routing)
authRouter.get("/mfa/status", requireAuth, async (req, res, _next) => {
  const user = req.user!;
  return res.json({
    mfaEnabled: user.isMfaEnabled,
    mfaVerified: Boolean(req.session.mfaVerified),
  });
});

authRouter.post("/logout", requireAuth, (req, res, _next) => {
  req.session.destroy(() => {
    res.clearCookie("sid", { path: "/" });
    return res.json({ ok: true });
  });
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;
    const subscription = user.entitlement.subscription;
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      membership: {
        isActive: user.entitlement.isActiveMember,
        subscription,
      },
    });
  } catch (err) {
    next(err);
  }
});
