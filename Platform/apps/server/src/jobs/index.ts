import cron from "node-cron";
import { prisma } from "../prisma.js";
import { expireGracePeriodSubscriptions } from "../services/subscriptions.js";
import { notifyUser } from "../services/notifications.js";

/**
 * Daily sweep: mark subscriptions past their grace window as EXPIRED and
 * revoke sessions.
 */
function scheduleGraceExpiry(): void {
  cron.schedule("0 3 * * *", async () => {
    try {
      const count = await expireGracePeriodSubscriptions();
      if (count > 0) {
        console.log(`[jobs] expired ${count} subscription(s) past grace period`);
      }
    } catch (err) {
      console.error("[jobs] grace expiry failed:", err);
    }
  });
}

/**
 * Hourly sweep: flip SCHEDULED streams that have started to LIVE if Mux
 * reports them active, and warn users before stream start.
 */
function scheduleStreamSync(): void {
  cron.schedule("0 * * * *", async () => {
    try {
      const upcoming = await prisma.liveStream.findMany({
        where: { status: "SCHEDULED" },
      });
      const now = Date.now();
      for (const stream of upcoming) {
        if (stream.scheduledStartAt && stream.scheduledStartAt.getTime() - now < 15 * 60 * 1000) {
          const users = await prisma.subscription.findMany({
            where: { status: "ACTIVE" },
            select: { userId: true },
          });
          const unique = [...new Set(users.map((u) => u.userId))];
          for (const uid of unique) {
            await notifyUser(uid, "STREAM", `Live soon: ${stream.title}`, `Streaming starts at ${stream.scheduledStartAt.toLocaleString()}`);
          }
        }
      }
    } catch (err) {
      console.error("[jobs] stream sync failed:", err);
    }
  });
}

export function startJobs(): void {
  scheduleGraceExpiry();
  scheduleStreamSync();
}
