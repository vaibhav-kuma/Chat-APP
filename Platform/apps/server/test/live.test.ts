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

  const member = await createUser({ email: "member@live.test", password: "password123" });
  memberCookie = await login(member.email, member.password);

  const active = await createUser({ email: "active@live.test", password: "password123" });
  activeCookie = await login(active.email, active.password);
  await activateSubscription(active.id, planId);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("live", () => {
  it("admin creates a live stream (SCHEDULED) with ingest details", async () => {
    const res = await request(app)
      .post("/api/v1/live")
      .set("Cookie", adminCookie)
      .send({ title: "Live Q&A", description: "Evening show" });
    expect(res.status).toBe(201);
    expect(res.body.stream.status).toBe("SCHEDULED");
    expect(res.body.stream.muxStreamId).toBeTruthy();
    expect(res.body.stream.streamKey).toBeTruthy();
  });

  it("anonymous cannot create a live stream", async () => {
    const res = await request(app).post("/api/v1/live").send({ title: "No" });
    expect(res.status).toBe(401);
  });

  it("member cannot create a live stream", async () => {
    const res = await request(app).post("/api/v1/live").set("Cookie", memberCookie).send({ title: "No" });
    expect(res.status).toBe(403);
  });

  it("active member can fetch a stream detail but non-member cannot", async () => {
    const created = await request(app)
      .post("/api/v1/live")
      .set("Cookie", adminCookie)
      .send({ title: "Detail Stream" });
    const id = created.body.stream.id;

    const denied = await request(app).get(`/api/v1/live/${id}`).set("Cookie", memberCookie);
    expect(denied.status).toBe(403);

    const ok = await request(app).get(`/api/v1/live/${id}`).set("Cookie", activeCookie);
    expect(ok.status).toBe(200);
  });

  it("chat requires a LIVE stream and active membership", async () => {
    const created = await request(app)
      .post("/api/v1/live")
      .set("Cookie", adminCookie)
      .send({ title: "Chat Stream" });
    const id = created.body.stream.id;

    // Not live yet -> 400 STREAM_NOT_LIVE
    const early = await request(app)
      .post(`/api/v1/live/${id}/chat`)
      .set("Cookie", activeCookie)
      .send({ body: "hi" });
    expect(early.status).toBe(400);
    expect(early.body.error.code).toBe("STREAM_NOT_LIVE");

    await request(app).post(`/api/v1/live/${id}/start`).set("Cookie", adminCookie);

    // Non-member blocked
    const blocked = await request(app)
      .post(`/api/v1/live/${id}/chat`)
      .set("Cookie", memberCookie)
      .send({ body: "hi" });
    expect(blocked.status).toBe(403);

    // Active member can chat
    const chat = await request(app)
      .post(`/api/v1/live/${id}/chat`)
      .set("Cookie", activeCookie)
      .send({ body: "hello everyone" });
    expect(chat.status).toBe(201);
    expect(chat.body.message.body).toBe("hello everyone");
  });

  it("returns recent chat history for an active member", async () => {
    const created = await request(app)
      .post("/api/v1/live")
      .set("Cookie", adminCookie)
      .send({ title: "History Stream" });
    const id = created.body.stream.id;
    await request(app).post(`/api/v1/live/${id}/start`).set("Cookie", adminCookie);

    await prisma.chatMessage.create({
      data: { liveStreamId: id, userId: (await prisma.user.findFirstOrThrow({ where: { email: "active@live.test" } })).id, body: "first" },
    });

    const res = await request(app).get(`/api/v1/live/${id}/chat`).set("Cookie", activeCookie);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it("admin can start and end a stream", async () => {
    const created = await request(app)
      .post("/api/v1/live")
      .set("Cookie", adminCookie)
      .send({ title: "Lifecycle" });
    const id = created.body.stream.id;

    const start = await request(app).post(`/api/v1/live/${id}/start`).set("Cookie", adminCookie);
    expect(start.status).toBe(200);
    expect(start.body.stream.status).toBe("LIVE");
    expect(start.body.stream.actualStartAt).toBeTruthy();

    const end = await request(app).post(`/api/v1/live/${id}/end`).set("Cookie", adminCookie);
    expect(end.status).toBe(200);
    expect(end.body.stream.status).toBe("ENDED");
    expect(end.body.stream.actualEndAt).toBeTruthy();
  });

  it("recording-to-VOD fails until a recording asset exists", async () => {
    const created = await request(app)
      .post("/api/v1/live")
      .set("Cookie", adminCookie)
      .send({ title: "Record Stream" });
    const id = created.body.stream.id;

    const res = await request(app).post(`/api/v1/live/${id}/record`).set("Cookie", adminCookie);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NO_RECORDING");
  });
});
