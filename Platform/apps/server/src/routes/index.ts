import { Router } from "express";
import { authRouter } from "./auth.js";
import { subscriptionsRouter } from "./subscriptions.js";
import { videosRouter } from "./videos.js";
import { liveRouter } from "./live.js";
import { socialRouter } from "./social.js";
import { notificationsRouter } from "./notifications.js";
import { adminRouter } from "./admin.js";

export function createRouter(): Router {
  const router = Router();

  router.use("/auth", authRouter);
  router.use("/subscriptions", subscriptionsRouter);
  router.use("/videos", videosRouter);
  router.use("/live", liveRouter);
  router.use("/social", socialRouter);
  router.use("/notifications", notificationsRouter);
  router.use("/admin", adminRouter);

  return router;
}
