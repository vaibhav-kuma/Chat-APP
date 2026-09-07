import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { truncateAll, seedBase, createUser, activateSubscription } from "./helpers.js";

const app = createApp();

let adminCookie: string;
let freeCookie: string;
let activeCookie: string;
let planId: string;

async function login(email: string, password: string): Promise<string> {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });
  return (res.headers["set-cookie"] as string[])[0];
}

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await truncateAll();
  const base = await seedBase();
  planId = base.planId;

  adminCookie = await login("admin@example.com", "change_me_admin");

  const free = await createUser({ email: "free@member.test", password: "password123" });
  freeCookie = await login(free.email, free.password);

  const active = await createUser({ email: "paid@member.test", password: "password123" });
  activeCookie = await login(active.email, active.password);
  await activateSubscription(active.id, planId);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("membership gating", () => {
  it("blocked users get 403 on protected routes", async () => {
    const blocked = await createUser({ email: "blocked@member.test", password: "password123", status: "blocked" });
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: blocked.email, password: blocked.password });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_BLOCKED");
  });

  it("free member cannot fetch a video detail", async () => {
    const video = await prisma.video.create({ data: { title: "Gate", status: "PUBLISHED" } });
    const res = await request(app).get(`/api/v1/videos/${video.id}`).set("Cookie", freeCookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("MEMBERSHIP_REQUIRED");
  });

  it("free member cannot get a signed stream URL", async () => {
    const video = await prisma.video.create({
      data: { title: "Gate", status: "PUBLISHED", muxPlaybackId: "pb_gate" },
    });
    const res = await request(app).get(`/api/v1/videos/${video.id}/stream-url`).set("Cookie", freeCookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("MEMBERSHIP_REQUIRED");
  });

  it("active member gets a playback response for a published video", async () => {
    const video = await prisma.video.create({
      data: { title: "Open", status: "PUBLISHED", muxPlaybackId: "pb_open" },
    });
    const res = await request(app).get(`/api/v1/videos/${video.id}/stream-url`).set("Cookie", activeCookie);
    expect(res.status).toBe(200);
    expect(res.body.playbackId).toBe("pb_open");
    expect(res.body.devMode).toBe(true);
  });

  it("unpublished video is not accessible even for active members", async () => {
    const video = await prisma.video.create({ data: { title: "Hidden", status: "UNPUBLISHED" } });
    const res = await request(app).get(`/api/v1/videos/${video.id}`).set("Cookie", activeCookie);
    expect(res.status).toBe(404);
  });

  it("admin bypasses membership gating on live detail", async () => {
    const stream = await prisma.liveStream.create({
      data: { title: "Admin only", status: "SCHEDULED", muxStreamId: "stream_admin", muxPlaybackId: "pb_admin" },
    });
    const res = await request(app).get(`/api/v1/live/${stream.id}`).set("Cookie", adminCookie);
    expect(res.status).toBe(200);
  });

  it("free member cannot join a live chat", async () => {
    const stream = await prisma.liveStream.create({
      data: { title: "Chat Gate", status: "LIVE", muxStreamId: "stream_chat", muxPlaybackId: "pb_chat" },
    });
    const res = await request(app)
      .post(`/api/v1/live/${stream.id}/chat`)
      .set("Cookie", freeCookie)
      .send({ body: "hello" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("MEMBERSHIP_REQUIRED");
  });

  it("free member cannot comment", async () => {
    const video = await prisma.video.create({ data: { title: "Comment Gate", status: "PUBLISHED" } });
    const res = await request(app)
      .post(`/api/v1/social/videos/${video.id}/comments`)
      .set("Cookie", freeCookie)
      .send({ body: "hello" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("MEMBERSHIP_REQUIRED");
  });

  it("admin always has access even with no subscription record", async () => {
    const video = await prisma.video.create({
      data: { title: "Admin gate", status: "PUBLISHED", muxPlaybackId: "pb_adm" },
    });
    const res = await request(app).get(`/api/v1/videos/${video.id}`).set("Cookie", adminCookie);
    expect(res.status).toBe(200);
  });
});
