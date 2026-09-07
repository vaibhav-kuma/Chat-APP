import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireActiveMembership, requireAuth, requireAdmin } from "../middleware/auth.js";
import { commentLimiter } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";
import { badRequest, notFound, forbidden } from "../utils/httpError.js";
import { notifyUser } from "../services/notifications.js";

export const socialRouter = Router();

const commentSchema = z.object({
  body: z.string().min(1).max(2000),
  parentId: z.string().optional(),
});

// ---- Comments ----

socialRouter.get("/videos/:videoId/comments", async (req, res, next) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { videoId: req.params.videoId, status: "ACTIVE", parentId: null },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        replies: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
          take: 50,
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });
    return res.json({ items: comments });
  } catch (err) {
    next(err);
  }
});

socialRouter.post("/videos/:videoId/comments", requireAuth, requireActiveMembership, commentLimiter, validateBody(commentSchema), async (req, res, next) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.videoId } });
    if (!video || video.status !== "PUBLISHED") throw notFound("Video not found");

    if (req.body.parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: req.body.parentId } });
      if (!parent || parent.videoId !== video.id) throw badRequest("Invalid parent comment", "BAD_PARENT");
    }

    const user = req.user!;
    const comment = await prisma.comment.create({
      data: {
        videoId: video.id,
        userId: user.id,
        body: req.body.body,
        parentId: req.body.parentId,
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    return res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
});

socialRouter.delete("/comments/:id", requireAuth, async (req, res, next) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) throw notFound("Comment not found");
    if (comment.userId !== req.user!.id && req.user!.role !== "ADMIN") {
      throw forbidden("You cannot delete this comment");
    }
    await prisma.comment.update({ where: { id: comment.id }, data: { status: "REMOVED" } });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---- Likes ----

socialRouter.post("/videos/:videoId/like", requireAuth, requireActiveMembership, async (req, res, next) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.videoId } });
    if (!video || video.status !== "PUBLISHED") throw notFound("Video not found");

    await prisma.like.upsert({
      where: { userId_videoId: { userId: req.user!.id, videoId: video.id } },
      create: { userId: req.user!.id, videoId: video.id },
      update: {},
    });
    const count = await prisma.like.count({ where: { videoId: video.id } });
    return res.status(201).json({ liked: true, count });
  } catch (err) {
    next(err);
  }
});

socialRouter.delete("/videos/:videoId/like", requireAuth, async (req, res, next) => {
  try {
    await prisma.like.deleteMany({ where: { userId: req.user!.id, videoId: req.params.videoId } });
    const count = await prisma.like.count({ where: { videoId: req.params.videoId } });
    return res.json({ liked: false, count });
  } catch (err) {
    next(err);
  }
});

// ---- Follows ----

socialRouter.post("/users/:userId/follow", requireAuth, requireActiveMembership, async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    if (targetId === req.user!.id) throw badRequest("You cannot follow yourself", "SELF_FOLLOW");

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw notFound("User not found");

    await prisma.follow.upsert({
      where: { followerId_followeeId: { followerId: req.user!.id, followeeId: targetId } },
      create: { followerId: req.user!.id, followeeId: targetId },
      update: {},
    });
    await notifyUser(targetId, "FOLLOW", `${req.user!.name} started following you`);
    return res.status(201).json({ following: true });
  } catch (err) {
    next(err);
  }
});

socialRouter.delete("/users/:userId/follow", requireAuth, async (req, res, next) => {
  try {
    await prisma.follow.deleteMany({ where: { followerId: req.user!.id, followeeId: req.params.userId } });
    return res.json({ following: false });
  } catch (err) {
    next(err);
  }
});

socialRouter.get("/following", requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.follow.findMany({
      where: { followerId: req.user!.id },
      include: { followee: { select: { id: true, name: true, avatarUrl: true } } },
    });
    return res.json({ items: rows.map((r) => r.followee) });
  } catch (err) {
    next(err);
  }
});

// ---- Reports ----

const reportSchema = z.object({
  targetType: z.enum(["VIDEO", "COMMENT", "CHAT", "USER", "LIVESTREAM"]),
  targetId: z.string().min(1),
  reason: z.string().min(1).max(200),
  details: z.string().max(2000).optional(),
});

socialRouter.post("/reports", requireAuth, validateBody(reportSchema), async (req, res, next) => {
  try {
    const report = await prisma.report.create({
      data: {
        reporterId: req.user!.id,
        targetType: req.body.targetType,
        targetId: req.body.targetId,
        reason: req.body.reason,
        details: req.body.details,
      },
    });
    return res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
});
