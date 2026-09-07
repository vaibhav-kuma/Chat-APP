import { NotificationType, type Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { getIo } from "../sockets/index.js";

export async function notifyUser(
  userId: string,
  type: NotificationType,
  title: string,
  body?: string,
  data?: Prisma.InputJsonValue
): Promise<void> {
  try {
    const notif = await prisma.notification.create({
      data: { userId, type, title, body, data },
    });
    const io = getIo();
    io?.to(`user:${userId}`).emit("notification", {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      body: notif.body,
      data: notif.data,
      isRead: notif.isRead,
      createdAt: notif.createdAt,
    });
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}
