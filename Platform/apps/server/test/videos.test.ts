import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { truncateAll, seedBase, createUser, activateSubscription } from "./helpers.js";

const app = createApp();

let adminCookie: string;
let memberCookie: string;
let activeCookie: string;
let planId: string;

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await truncateAll();
  const base = await seedBase();
  planId = base.planId;

  adminCookie = (await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "admin@example.com", password: "change_me_admin" })).headers["set-cookie"][0];

  const member = await createUser({ email: "member@videos.test", password: "password123" });
  memberCookie = (await request(app)
    .post("/api/v1/auth/login")
    .send({ email: member.email, password: member.password })).headers["set-cookie"][0];

  const active = await createUser({ email: "active@videos.test", password: "password123" });
  activeCookie = (await request(app)
    .post("/api/v1/auth/login")
    .send({ email: active.email, password: active.password })).headers["set-cookie"][0];
  await activateSubscription(active.id, planId);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("videos", () => {
  it("lists published videos with pagination", async () => {
    await prisma.video.create({ data: { title: "Public A", status: "PUBLISHED" } });
    await prisma.video.create({ data: { title: "Public B", status: "PUBLISHED" } });
    await prisma.video.create({ data: { title: "Hidden Draft", status: "DRAFT" } });

    const res = await request(app).get("/api/v1/videos?limit=10");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
    expect(res.body.items.every((v: { status: string }) => v.status === "PUBLISHED")).toBe(true);
  });

  it("admin creates an upload via the dev NullProvider", async () => {
    const res = await request(app).post("/api/v1/videos/upload").set("Cookie", adminCookie).send({});
    expect(res.status).toBe(201);
    expect(res.body.videoId).toBeTruthy();
    expect(res.body.uploadUrl).toContain("example.invalid");
  });

  it("publishing without a media asset returns 400 NO_ASSET", async () => {
    const up = await request(app).post("/api/v1/videos/upload").set("Cookie", adminCookie).send({});
    const res = await request(app).post(`/api/v1/videos/${up.body.videoId}/publish`).set("Cookie", adminCookie);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NO_ASSET");
  });

  it("admin sees all statuses in admin list", async () => {
    await prisma.video.create({ data: { title: "Draft", status: "DRAFT" } });
    await prisma.video.create({ data: { title: "Pub", status: "PUBLISHED" } });
    const res = await request(app).get("/api/v1/videos/admin/all").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
  });

  it("member without subscription cannot fetch video detail", async () => {
    const video = await prisma.video.create({ data: { title: "Gate", status: "PUBLISHED" } });
    const res = await request(app).get(`/api/v1/videos/${video.id}`).set("Cookie", memberCookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("MEMBERSHIP_REQUIRED");
  });

  it("active member can fetch detail and dev stream-url", async () => {
    const video = await prisma.video.create({
      data: { title: "Gate", status: "PUBLISHED", muxPlaybackId: "pb_test" },
    });
    const detail = await request(app).get(`/api/v1/videos/${video.id}`).set("Cookie", activeCookie);
    expect(detail.status).toBe(200);
    expect(detail.body.video.title).toBe("Gate");

    const url = await request(app).get(`/api/v1/videos/${video.id}/stream-url`).set("Cookie", activeCookie);
    expect(url.status).toBe(200);
    expect(url.body.devMode).toBe(true);
    expect(url.body.playbackId).toBe("pb_test");
  });

  it("admin can update a video title", async () => {
    const video = await prisma.video.create({ data: { title: "Old", status: "DRAFT" } });
    const res = await request(app)
      .put(`/api/v1/videos/${video.id}`)
      .set("Cookie", adminCookie)
      .send({ title: "New", description: "desc" });
    expect(res.status).toBe(200);
    expect(res.body.video.title).toBe("New");
  });

  it("admin can unpublish a video", async () => {
    const video = await prisma.video.create({ data: { title: "Pub", status: "PUBLISHED" } });
    const res = await request(app).post(`/api/v1/videos/${video.id}/unpublish`).set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.video.status).toBe("UNPUBLISHED");
  });

  it("admin can soft-delete a video", async () => {
    const video = await prisma.video.create({ data: { title: "Del", status: "DRAFT" } });
    const res = await request(app).delete(`/api/v1/videos/${video.id}`).set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const after = await prisma.video.findUnique({ where: { id: video.id } });
    expect(after?.status).toBe("DELETED");
  });
});
