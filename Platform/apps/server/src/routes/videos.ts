import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { requireActiveMembership, requireAdmin, requireAuth } from "../middleware/auth.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { getPagination } from "../utils/pagination.js";
import { videoProvider } from "../services/videoProvider.js";
import { audit } from "../services/audit.js";
import { badRequest, notFound } from "../utils/httpError.js";

export const videosRouter = Router();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  categoryId: z.string().optional(),
  q: z.string().max(120).optional(),
});

const uploadSchema = z.object({});

const titleSchema = z.object({  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  categoryId: z.string().optional(),
});

// Public catalog — requires membership to view details, but list is metadata-only
videosRouter.get("/", validateQuery(listSchema), async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);
    const { categoryId, q } = req.query as { categoryId?: string; q?: string };

    const where: Prisma.VideoWhereInput = {
      status: "PUBLISHED",
      categoryId: categoryId || undefined,
      title: q ? { contains: q, mode: "insensitive" } : undefined,
    };

    const [total, videos] = await Promise.all([
      prisma.video.count({ where }),
      prisma.video.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { publishedAt: "desc" },
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
    ]);

    return res.json({
      items: videos,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

videosRouter.get("/:id", requireAuth, requireActiveMembership, async (req, res, next) => {
  try {
    const video = await prisma.video.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });
    if (!video || video.status !== "PUBLISHED") {
      throw notFound("Video not found");
    }
    return res.json({ video });
  } catch (err) {
    next(err);
  }
});

// Admin video list (all statuses) — must be declared before /:id routes
videosRouter.get("/admin/all", requireAdmin, validateQuery(listSchema), async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);
    const where: Prisma.VideoWhereInput = {};
    const [total, videos] = await Promise.all([
      prisma.video.count({ where }),
      prisma.video.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { category: true },
      }),
    ]);
    return res.json({ items: videos, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

// Signed playback URL — membership-gated, short TTL
videosRouter.get("/:id/stream-url", requireAuth, requireActiveMembership, async (req, res, next) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.id } });
    if (!video || video.status !== "PUBLISHED" || !video.muxPlaybackId) {
      throw notFound("Video not found");
    }

    // Increment view count (best-effort)
    prisma.video
      .update({ where: { id: video.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);

    const url = await videoProvider.signPlaybackUrl(video.muxPlaybackId, 60);
    if (!url) {
      // Dev fallback — no Mux configured
      return res.json({ playbackId: video.muxPlaybackId, url: null, expiresIn: 60, devMode: true });
    }
    return res.json({ playbackId: video.muxPlaybackId, url, expiresIn: 60 });
  } catch (err) {
    next(err);
  }
});

// ---- Admin endpoints ----

// Step 1: create a signed upload URL (admin only).
// Mux auto-creates the asset when the upload completes using new_asset_settings,
// with passthrough = video.id so the asset.ready webhook can reconcile the record.
videosRouter.post("/upload", requireAdmin, validateBody(uploadSchema), async (req, res, next) => {
  try {
    const video = await prisma.video.create({
      data: {
        title: "Untitled",
        status: "DRAFT",
        uploadAdminId: req.user!.id,
      },
    });
    const { uploadId, url } = await videoProvider.createUpload(video.id);
    await audit({ adminId: req.user!.id, action: "create_upload", entityType: "VIDEO", entityId: video.id, req });
    return res.status(201).json({ videoId: video.id, uploadId, uploadUrl: url });
  } catch (err) {
    next(err);
  }
});

videosRouter.put("/:id", requireAdmin, validateBody(titleSchema), async (req, res, next) => {
  try {
    const video = await prisma.video.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title,
        description: req.body.description,
        categoryId: req.body.categoryId,
      },
    });
    await audit({ adminId: req.user!.id, action: "update_video", entityType: "VIDEO", entityId: video.id, req });
    return res.json({ video });
  } catch (err) {
    next(err);
  }
});

videosRouter.post("/:id/publish", requireAdmin, async (req, res, next) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.id } });
    if (!video) throw notFound("Video not found");
    if (!video.muxAssetId) throw badRequest("Video has no media asset yet", "NO_ASSET");

    const updated = await prisma.video.update({
      where: { id: video.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    await audit({ adminId: req.user!.id, action: "publish_video", entityType: "VIDEO", entityId: video.id, req });
    return res.json({ video: updated });
  } catch (err) {
    next(err);
  }
});

videosRouter.post("/:id/unpublish", requireAdmin, async (req, res, next) => {
  try {
    const video = await prisma.video.update({
      where: { id: req.params.id },
      data: { status: "UNPUBLISHED" },
    });
    await audit({ adminId: req.user!.id, action: "unpublish_video", entityType: "VIDEO", entityId: video.id, req });
    return res.json({ video });
  } catch (err) {
    next(err);
  }
});

videosRouter.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.id } });
    if (!video) throw notFound("Video not found");

    if (video.muxAssetId) {
      await videoProvider.deleteAsset(video.muxAssetId).catch(() => undefined);
    }
    await prisma.video.update({ where: { id: video.id }, data: { status: "DELETED" } });
    await audit({ adminId: req.user!.id, action: "delete_video", entityType: "VIDEO", entityId: video.id, req });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
