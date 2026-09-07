import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { sessionMiddleware } from "./services/session.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { createRouter } from "./routes/index.js";
import { handleMuxWebhook } from "./services/muxWebhook.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: false, // SPA serves its own CSP headers
    })
  );
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  );
  app.use(sessionMiddleware);

  app.use(
    "/api/v1/subscriptions/webhook",
    express.raw({ type: "application/json" }) // raw body required for signature verification
  );
  app.use(
    "/api/v1/webhooks/mux",
    express.raw({ type: "application/json" })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", ts: new Date().toISOString() });
  });

  app.post("/api/v1/webhooks/mux", async (req, res) => {
    try {
      const raw = req.body as Buffer;
      const signature = req.get("x-mux-signature") ?? "";
      const result = await handleMuxWebhook(raw, signature);
      res.status(200).json(result);
    } catch (err) {
      res.status(400).json({ error: { code: "INVALID_SIGNATURE", message: "Invalid Mux webhook signature" } });
    }
  });

  app.use("/api/v1", apiLimiter, createRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
