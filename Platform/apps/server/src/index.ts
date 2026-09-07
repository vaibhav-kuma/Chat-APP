import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { redis } from "./config/redis.js";
import { createSocketServer } from "./sockets/index.js";
import { startJobs } from "./jobs/index.js";
import { seedDatabase } from "./seed.js";
import { prisma } from "./prisma.js";

async function main(): Promise<void> {
  await redis.ping();
  console.log("[redis] connected");

  await prisma.$connect();
  console.log("[db] connected");

  if (env.NODE_ENV !== "production") {
    await seedDatabase();
  } else {
    // Production bootstrap: idempotent seed (admin, plan, categories) driven by env.
    try {
      await seedDatabase();
      console.log("[seed] production bootstrap complete");
    } catch (err) {
      console.error("[seed] production bootstrap failed (continuing):", err);
    }
  }

  const app = createApp();
  const httpServer = createServer(app);
  createSocketServer(httpServer);

  startJobs();

  httpServer.listen(env.PORT, () => {
    console.log(`[server] listening on :${env.PORT} (${env.NODE_ENV})`);
  });
}

main().catch((err) => {
  console.error("[server] fatal startup error:", err);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`[server] received ${signal}, shutting down`);
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
