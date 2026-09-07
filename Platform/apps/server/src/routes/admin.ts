import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, requireAdmin, requireAdminMfa } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { audit } from "../services/audit.js";
import { badRequest, notFound, unauthorized, forbidden } from "../utils/httpError.js";
import { generateMfaSecret, verifyTOTP, hashPassword } from "../services/auth.js";
import { revokeAllSessions } from "../services/session.js";
import { notifyUser } from "../services/notifications.js";
import qrcode from "qrcode";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

// ---- Dashboard stats ----
adminRouter.get("/dashboard", async (req, res, next) => {
  try {
    const [members, admins, activeSubs, publishedVideos, liveStreams, openReports] = await Promise.all([
      prisma.user.count({ where: { role: "MEMBER" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.video.count({ where: { status: "PUBLISHED" } }),
      prisma.liveStream.count({ where: { status: { in: ["SCHEDULED", "LIVE"] } } }),
      prisma.report.count({ where: { status: "FLAGGED" } }),
    ]);

    const plans = await prisma.plan.findMany({ where: { isActive: true } });
    const activeSubsWithPlans = await prisma.subscription.findMany({
      where: { status: { in: ["ACTIVE", "PAST_DUE"] } },
      include: { plan: true },
    });
    const monthlyRecurring = activeSubsWithPlans.reduce((sum, s) => sum + s.plan.pricePaise, 0) / 100;

    return res.json({
      members,
      admins,
      activeSubscriptions: activeSubs,
      publishedVideos,
      liveStreams,
      openReports,
      plans,
      monthlyRecurring,
    });
  } catch (err) {
    next(err);
  }
});

// ---- Categories ----
const categorySchema = z.object({
  name: z.string().min(1).max(80),
  sortOrder: z.coerce.number().int().default(0),
});

adminRouter.get("/categories", async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
    return res.json({ items: categories });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/categories", requireAdminMfa, validateBody(categorySchema), async (req, res, next) => {
  try {
    const slug = req.body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const category = await prisma.category.create({
      data: { name: req.body.name, slug, sortOrder: req.body.sortOrder },
    });
    await audit({ adminId: req.user!.id, action: "create_category", entityType: "CATEGORY", entityId: category.id, req });
    return res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
});

// ---- Moderation queue ----
adminRouter.get("/reports", async (req, res, next) => {
  try {
    const status = (req.query.status as string) || "FLAGGED";
    const reports = await prisma.report.findMany({
      where: { status: status as never },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { reporter: { select: { id: true, name: true, email: true } } },
    });
    return res.json({ items: reports });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/reports/:id/resolve", requireAdminMfa, async (req, res, next) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) throw notFound("Report not found");

    await prisma.report.update({
      where: { id: report.id },
      data: { status: "ACTIVE", resolvedAt: new Date(), resolvedById: req.user!.id },
    });
    await audit({ adminId: req.user!.id, action: "resolve_report", entityType: "REPORT", entityId: report.id, req });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/reports/:id/action", requireAdminMfa, async (req, res, next) => {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) throw notFound("Report not found");

    const action = (req.body.action as string) ?? "";
    const reason = (req.body.reason as string) ?? undefined;

    if (report.targetType === "COMMENT") {
      await prisma.comment.update({ where: { id: report.targetId }, data: { status: "REMOVED" } });
    } else if (report.targetType === "CHAT") {
      await prisma.chatMessage.update({ where: { id: report.targetId }, data: { status: "REMOVED" } });
    } else if (report.targetType === "VIDEO") {
      await prisma.video.update({ where: { id: report.targetId }, data: { status: "UNPUBLISHED" } });
    } else if (report.targetType === "USER") {
      await prisma.user.update({ where: { id: report.targetId }, data: { status: "blocked" } });
      await revokeAllSessions(report.targetId);
    }

    await prisma.report.update({
      where: { id: report.id },
      data: { status: "ACTIVE", resolvedAt: new Date(), resolvedById: req.user!.id },
    });
    await prisma.moderationAction.create({
      data: {
        adminId: req.user!.id,
        action,
        targetType: report.targetType,
        targetId: report.targetId,
        reason,
      },
    });
    await audit({ adminId: req.user!.id, action, entityType: report.targetType, entityId: report.targetId, metadata: { reason }, req });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---- User management ----
adminRouter.get("/users", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: "MEMBER" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, email: true, name: true, status: true, createdAt: true, role: true },
    });
    return res.json({ items: users });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/users/:id/block", requireAdminMfa, async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw notFound("User not found");
    if (target.role === "ADMIN") throw forbidden("Cannot block an admin");

    await prisma.user.update({ where: { id: target.id }, data: { status: "blocked" } });
    await revokeAllSessions(target.id);
    await audit({ adminId: req.user!.id, action: "block_user", entityType: "USER", entityId: target.id, req });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/users/:id/unblock", requireAdminMfa, async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw notFound("User not found");
    await prisma.user.update({ where: { id: target.id }, data: { status: "active" } });
    await audit({ adminId: req.user!.id, action: "unblock_user", entityType: "USER", entityId: target.id, req });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---- Notifications broadcast ----
const notifySchema = z.object({
  userId: z.string().optional(),
  type: z.enum(["SYSTEM", "VIDEO", "STREAM", "MODERATION"]).default("SYSTEM"),
  title: z.string().min(1).max(200),
  body: z.string().max(1000).optional(),
});

adminRouter.post("/notifications", requireAdminMfa, validateBody(notifySchema), async (req, res, next) => {
  try {
    const { userId, type, title, body } = req.body;
    if (userId) {
      await notifyUser(userId, type, title, body);
    } else {
      const members = await prisma.user.findMany({ where: { role: "MEMBER" }, select: { id: true } });
      for (const m of members) {
        await notifyUser(m.id, type, title, body);
      }
    }
    await audit({ adminId: req.user!.id, action: "broadcast_notification", entityType: "NOTIFICATION", metadata: { title }, req });
    return res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---- Audit log ----
adminRouter.get("/audit-log", async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { admin: { select: { id: true, name: true, email: true } } },
    });
    return res.json({ items: logs });
  } catch (err) {
    next(err);
  }
});

// ---- MFA management (admin) ----
// Setup is the bootstrap path: a fresh admin (MFA not yet enabled) may generate
// a secret without prior verification. Re-keying after enablement requires MFA.
adminRouter.post("/mfa/setup", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const user = req.user!;
    if (user.isMfaEnabled && !req.session.mfaVerified) {
      return res.status(403).json({ error: { code: "MFA_REQUIRED", message: "Verify current MFA before changing" } });
    }
    const { secret, otpauthUrl } = generateMfaSecret();
    const qrDataUrl = await qrcode.toDataURL(otpauthUrl);
    return res.json({ secret, otpauthUrl, qrDataUrl });
  } catch (err) {
    next(err);
  }
});

const mfaConfirmSchema = z.object({
  secret: z.string().min(1),
  token: z.string().regex(/^\d{6}$/),
});

adminRouter.post("/mfa/confirm", requireAuth, requireAdmin, validateBody(mfaConfirmSchema), async (req, res, next) => {
  try {
    if (!verifyTOTP(req.body.secret, req.body.token)) {
      throw unauthorized("Invalid verification code", "INVALID_MFA");
    }
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { mfaSecret: req.body.secret, isMfaEnabled: true },
    });
    req.session.mfaVerified = true;
    await audit({ adminId: req.user!.id, action: "enable_mfa", entityType: "USER", entityId: req.user!.id, req });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/mfa/disable", requireAdminMfa, validateBody(mfaConfirmSchema), async (req, res, next) => {
  try {
    const user = req.user!;
    if (!user.mfaSecret) throw badRequest("MFA not enabled", "MFA_NOT_ENABLED");
    if (!verifyTOTP(user.mfaSecret, req.body.token)) {
      throw unauthorized("Invalid verification code", "INVALID_MFA");
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: null, isMfaEnabled: false },
    });
    req.session.mfaVerified = false;
    await audit({ adminId: user.id, action: "disable_mfa", entityType: "USER", entityId: user.id, req });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---- Admin user creation ----
const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80),
});

adminRouter.post("/users", requireAdminMfa, validateBody(createAdminSchema), async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw badRequest("Email already in use", "EMAIL_EXISTS");
    const passwordHash = await hashPassword(req.body.password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name: req.body.name, role: "ADMIN" },
    });
    await audit({ adminId: req.user!.id, action: "create_admin", entityType: "USER", entityId: user.id, req });
    return res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    next(err);
  }
});
