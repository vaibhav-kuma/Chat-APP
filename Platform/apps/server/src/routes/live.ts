import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { requireActiveMembership, requireAdmin, requireAuth } from "../middleware/auth.js";
import { chatLimiter, commentLimiter } from "../middleware/rateLimit.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { getPagination } from "../utils/pagination.js";
import { videoProvider } from "../services/videoProvider.js";
import { audit } from "../services/audit.js";
import { badRequest, forbidden, notFound } from "../utils/httpError.js";
import { getIo } from "../sockets/index.js";

export const liveRouter = Router();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  scheduledStartAt: z.string().datetime().optional(),
  scheduledEndAt: z.string().datetime().optional(),
});

const chatSchema = z.object({
  body: z.string().min(1).max(500),
});

// List live streams (metadata only, public)
liveRouter.get("/", validateQuery(listSchema), async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);
    const where: Prisma.LiveStreamWhereInput = {
      status: { in: ["SCHEDULED", "LIVE"] },
    };
    const [total, streams] = await Promise.all([
      prisma.liveStream.count({ where }),
      prisma.liveStream.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { scheduledStartAt: "asc" },
      }),
    ]);
    return res.json({
      items: streams,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

liveRouter.get("/:id", requireAuth, requireActiveMembership, async (req, res, next) => {
  try {
    const stream = await prisma.liveStream.findUnique({ where: { id: req.params.id } });
    if (!stream || stream.status === "ENDED") throw notFound("Stream not found");
    return res.json({ stream });
  } catch (err) {
    next(err);
  }
});

// Signed live HLS playback URL — membership-gated
liveRouter.get("/:id/stream-url", requireAuth, requireActiveMembership, async (req, res, next) => {
  try {
    const stream = await prisma.liveStream.findUnique({ where: { id: req.params.id } });
    if (!stream || (stream.status !== "LIVE" && stream.status !== "SCHEDULED")) {
      throw notFound("Stream not found");
    }
    if (stream.status === "SCHEDULED") {
      return res.json({ status: "scheduled", playbackId: null, url: null, scheduledStartAt: stream.scheduledStartAt });
    }
    const url = await videoProvider.signPlaybackUrl(stream.muxPlaybackId!, 60);
    return res.json({ status: "live", playbackId: stream.muxPlaybackId, url, expiresIn: 60 });
  } catch (err) {
    next(err);
  }
});

// Chat: recent messages
liveRouter.get("/:id/chat", requireAuth, requireActiveMembership, async (req, res, next) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { liveStreamId: req.params.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    return res.json({ items: messages.reverse() });
  } catch (err) {
    next(err);
  }
});

// Chat: send message (also broadcast via socket)
liveRouter.post("/:id/chat", requireAuth, requireActiveMembership, chatLimiter, validateBody(chatSchema), async (req, res, next) => {
  try {
    const stream = await prisma.liveStream.findUnique({ where: { id: req.params.id } });
    if (!stream || stream.status !== "LIVE") {
      throw badRequest("Stream is not live", "STREAM_NOT_LIVE");
    }
    const user = req.user!;
    const msg = await prisma.chatMessage.create({
      data: { liveStreamId: stream.id, userId: user.id, body: req.body.body },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    getIo()?.to(`live:${stream.id}`).emit("chat:message", {
      id: msg.id,
      body: msg.body,
      userId: user.id,
      user: msg.user,
      createdAt: msg.createdAt,
    });

    return res.status(201).json({ message: msg });
  } catch (err) {
    next(err);
  }
});

// ---- Admin endpoints ----

// Create a live stream (returns RTMP ingest details for OBS)
liveRouter.post("/", requireAdmin, validateBody(createSchema), async (req, res, next) => {
  try {
    const admin = req.user!;
    const live = await videoProvider.createLiveStream(`live:${Date.now()}`);
    const stream = await prisma.liveStream.create({
      data: {
        title: req.body.title,
        description: req.body.description,
        scheduledStartAt: req.body.scheduledStartAt ? new Date(req.body.scheduledStartAt) : undefined,
        scheduledEndAt: req.body.scheduledEndAt ? new Date(req.body.scheduledEndAt) : undefined,
        muxStreamId: live.streamId,
        muxPlaybackId: live.playbackId,
        streamKey: live.streamKey,
        status: "SCHEDULED",
        createdAdminId: admin.id,
      },
    });
    await audit({ adminId: admin.id, action: "create_live_stream", entityType: "LIVESTREAM", entityId: stream.id, req });
    return res.status(201).json({ stream });
  } catch (err) {
    next(err);
  }
});

liveRouter.post("/:id/start", requireAdmin, async (req, res, next) => {
  try {
    const stream = await prisma.liveStream.findUnique({ where: { id: req.params.id } });
    if (!stream || !stream.muxStreamId) throw notFound("Stream not found");

    const updated = await prisma.liveStream.update({
      where: { id: stream.id },
      data: { status: "LIVE", actualStartAt: new Date() },
    });
    getIo()?.to("live-status").emit("stream:status", { streamId: stream.id, status: "live" });
    await audit({ adminId: req.user!.id, action: "start_live_stream", entityType: "LIVESTREAM", entityId: stream.id, req });
    return res.json({ stream: updated });
  } catch (err) {
    next(err);
  }
});

liveRouter.post("/:id/end", requireAdmin, async (req, res, next) => {
  try {
    const stream = await prisma.liveStream.findUnique({ where: { id: req.params.id } });
    if (!stream || !stream.muxStreamId) throw notFound("Stream not found");

    if (stream.status === "LIVE") {
      await videoProvider.endLiveStream(stream.muxStreamId).catch(() => undefined);
    }
    const updated = await prisma.liveStream.update({
      where: { id: stream.id },
      data: { status: "ENDED", actualEndAt: new Date() },
    });
    getIo()?.to("live-status").emit("stream:status", { streamId: stream.id, status: "ended" });
    await audit({ adminId: req.user!.id, action: "end_live_stream", entityType: "LIVESTREAM", entityId: stream.id, req });
    return res.json({ stream: updated });
  } catch (err) {
    next(err);
  }
});

// Recording-to-VOD: publish the auto-recorded asset (created via new_asset_settings
// when the live stream went idle) as a video
liveRouter.post("/:id/record", requireAdmin, async (req, res, next) => {
  try {
    const stream = await prisma.liveStream.findUnique({ where: { id: req.params.id } });
    if (!stream || !stream.muxStreamId) throw notFound("Stream not found");
    if (!stream.recordingAssetId) {
      throw badRequest("No recording available yet — wait for the stream recording to finish", "NO_RECORDING");
    }

    const video = await prisma.video.create({
      data: {
        title: `${stream.title} (recording)`,
        description: stream.description,
        muxAssetId: stream.recordingAssetId,
        status: "PROCESSING",
        uploadAdminId: req.user!.id,
      },
    });
    await prisma.liveStream.update({
      where: { id: stream.id },
      data: { vodVideoId: video.id, status: "RECORDING_PROCESSING" },
    });
    await audit({ adminId: req.user!.id, action: "record_live_stream", entityType: "LIVESTREAM", entityId: stream.id, req });
    return res.status(201).json({ video });
  } catch (err) {
    next(err);
  }
});
