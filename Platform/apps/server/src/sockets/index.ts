import type { Server as HttpServer } from "node:http";
import { Server as SocketServer, type ServerOptions } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { unsign } from "cookie-signature";
import { redisPub, redisSub } from "../config/redis.js";
import { env } from "../config/env.js";
import { prisma } from "../prisma.js";
import { getAuthEpoch } from "../services/session.js";
import { getEntitlement } from "../services/membership.js";

let io: SocketServer | null = null;

export function getIo(): SocketServer | null {
  return io;
}

function parseCookies(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx > -1) out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

/**
 * Resolve the express-session store key from the "sid" cookie value.
 * express-session writes `s:<uid>.<signature>` (URL-encoded); the store is
 * keyed by the signature-verified uid (connect-redis uses `session:<uid>`).
 */
function sessionIdFromCookie(value: string): string | null {
  let raw: string;
  try {
    raw = decodeURIComponent(value);
  } catch {
    raw = value;
  }
  if (raw.startsWith("s:")) {
    const unsigned = unsign(raw.slice(2), env.SESSION_SECRET);
    return unsigned === false ? null : unsigned;
  }
  return raw;
}

async function loadSessionUser(sid: string) {
  const { redis } = await import("../config/redis.js");
  const raw = await redis.get(`session:${sid}`);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { userId?: string; epoch?: number };
    if (!data.userId) return null;

    const epoch = await getAuthEpoch(data.userId);
    if (data.epoch !== undefined && data.epoch !== epoch) return null;

    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user || user.status !== "active") return null;

    const entitlement = await getEntitlement(user);
    return { user, entitlement, sessionEpoch: data.epoch };
  } catch {
    return null;
  }
}

export function createSocketServer(httpServer: HttpServer, options?: Partial<ServerOptions>): SocketServer {
  const server = new SocketServer(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
    ...options,
  });

  server.adapter(createAdapter(redisPub, redisSub));

  server.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const rawSid = cookies["sid"];
      if (!rawSid) return next(new Error("UNAUTHENTICATED"));

      const sid = sessionIdFromCookie(rawSid);
      if (!sid) return next(new Error("UNAUTHENTICATED"));

      const ctx = await loadSessionUser(sid);
      if (!ctx) return next(new Error("UNAUTHENTICATED"));

      (socket as { data: Record<string, unknown> }).data = {
        user: ctx.user,
        entitlement: ctx.entitlement,
        userId: ctx.user.id,
        isAdmin: ctx.user.role === "ADMIN",
      };
      next();
    } catch (err) {
      next(err as Error);
    }
  });

  server.on("connection", (socket) => {
    const data = socket.data as { userId: string; isAdmin: boolean };
    socket.join(`user:${data.userId}`);

    socket.on("chat:join", (streamId: string) => {
      if (typeof streamId !== "string") return;
      socket.join(`live:${streamId}`);
    });

    socket.on("chat:leave", (streamId: string) => {
      if (typeof streamId !== "string") return;
      socket.leave(`live:${streamId}`);
    });

    socket.on("disconnect", () => {
      socket.leave(`user:${data.userId}`);
    });
  });

  return server;
}
