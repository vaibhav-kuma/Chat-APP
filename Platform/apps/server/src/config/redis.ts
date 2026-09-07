import { Redis } from "ioredis";
import { env } from "./env.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

export const redisPub = redis.duplicate();
export const redisSub = redis.duplicate();

redis.on("error", (err) => {
  console.error("[redis] error:", err.message);
});
