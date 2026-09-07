import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { validateQuery } from "../middleware/validate.js";
import { getPagination } from "../utils/pagination.js";

export const notificationsRouter = Router();

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

notificationsRouter.get("/", requireAuth, validateQuery(listSchema), async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);
    const where = { userId: req.user!.id };
    const [total, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return res.json({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.get("/unread-count", requireAuth, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });
    return res.json({ count });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post("/:id/read", requireAuth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { isRead: true },
    });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post("/read-all", requireAuth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
