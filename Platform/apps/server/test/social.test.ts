import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { truncateAll, seedBase, createUser, activateSubscription } from "./helpers.js";

const app = createApp();

let activeCookie: string;
let otherCookie: string;
let activeUserIdValue: string;
let otherUserIdValue: string;
let planId: string;
let videoId: string;

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await truncateAll();
  const base = await seedBase();
  planId = base.planId;

  const active = await createUser({ email: "social1@test.com", password: "password123" });
  activeUserIdValue = active.id;
  activeCookie = (await request(app)
    .post("/api/v1/auth/login")
    .send({ email: active.email, password: active.password })).headers["set-cookie"][0];
  await activateSubscription(active.id, planId);

  const other = await createUser({ email: "social2@test.com", password: "password123" });
  otherUserIdValue = other.id;
  otherCookie = (await request(app)
    .post("/api/v1/auth/login")
    .send({ email: other.email, password: other.password })).headers["set-cookie"][0];
  await activateSubscription(other.id, planId);

  const video = await prisma.video.create({ data: { title: "Social Video", status: "PUBLISHED" } });
  videoId = video.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("social", () => {
  it("non-member cannot comment", async () => {
    const member = await createUser({ email: "free@social.test", password: "password123" });
    const cookie = (await request(app)
      .post("/api/v1/auth/login")
      .send({ email: member.email, password: member.password })).headers["set-cookie"][0];
    const res = await request(app)
      .post(`/api/v1/social/videos/${videoId}/comments`)
      .set("Cookie", cookie)
      .send({ body: "hello" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("MEMBERSHIP_REQUIRED");
  });

  it("active member can post and list comments", async () => {
    const created = await request(app)
      .post(`/api/v1/social/videos/${videoId}/comments`)
      .set("Cookie", activeCookie)
      .send({ body: "Great video!" });
    expect(created.status).toBe(201);
    expect(created.body.comment.body).toBe("Great video!");

    const list = await request(app).get(`/api/v1/social/videos/${videoId}/comments`);
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].body).toBe("Great video!");
  });

  it("allows replies to a comment", async () => {
    const created = await request(app)
      .post(`/api/v1/social/videos/${videoId}/comments`)
      .set("Cookie", activeCookie)
      .send({ body: "parent" });
    const parentId = created.body.comment.id;

    const reply = await request(app)
      .post(`/api/v1/social/videos/${videoId}/comments`)
      .set("Cookie", otherCookie)
      .send({ body: "reply", parentId });
    expect(reply.status).toBe(201);
    expect(reply.body.comment.parentId).toBe(parentId);
  });

  it("rejects a reply to a comment on a different video", async () => {
    const otherVideo = await prisma.video.create({ data: { title: "Other", status: "PUBLISHED" } });
    const comment = await prisma.comment.create({ data: { videoId: otherVideo.id, userId: otherUserIdValue, body: "x" } });

    const res = await request(app)
      .post(`/api/v1/social/videos/${videoId}/comments`)
      .set("Cookie", activeCookie)
      .send({ body: "nope", parentId: comment.id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_PARENT");
  });

  it("owner can delete their own comment", async () => {
    const comment = await prisma.comment.create({ data: { videoId, userId: activeUserIdValue, body: "mine" } });
    const res = await request(app).delete(`/api/v1/social/comments/${comment.id}`).set("Cookie", activeCookie);
    expect(res.status).toBe(200);
    const after = await prisma.comment.findUnique({ where: { id: comment.id } });
    expect(after?.status).toBe("REMOVED");
  });

  it("another user cannot delete someone else's comment", async () => {
    const comment = await prisma.comment.create({ data: { videoId, userId: activeUserIdValue, body: "mine" } });
    const res = await request(app).delete(`/api/v1/social/comments/${comment.id}`).set("Cookie", otherCookie);
    expect(res.status).toBe(403);
  });

  it("like and unlike a video", async () => {
    const like = await request(app).post(`/api/v1/social/videos/${videoId}/like`).set("Cookie", activeCookie);
    expect(like.status).toBe(201);
    expect(like.body.liked).toBe(true);
    expect(like.body.count).toBe(1);

    const unlike = await request(app).delete(`/api/v1/social/videos/${videoId}/like`).set("Cookie", activeCookie);
    expect(unlike.status).toBe(200);
    expect(unlike.body.liked).toBe(false);
    expect(unlike.body.count).toBe(0);
  });

  it("prevents following yourself", async () => {
    const me = await prisma.user.findFirstOrThrow({ where: { email: "social1@test.com" } });
    const res = await request(app).post(`/api/v1/social/users/${me.id}/follow`).set("Cookie", activeCookie);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("SELF_FOLLOW");
  });

  it("follows and unfollows another user, and lists following", async () => {
    const target = await prisma.user.findFirstOrThrow({ where: { email: "social2@test.com" } });

    const follow = await request(app).post(`/api/v1/social/users/${target.id}/follow`).set("Cookie", activeCookie);
    expect(follow.status).toBe(201);
    expect(follow.body.following).toBe(true);

    const list = await request(app).get("/api/v1/social/following").set("Cookie", activeCookie);
    expect(list.status).toBe(200);
    expect(list.body.items.some((u: { id: string }) => u.id === target.id)).toBe(true);

    const unfollow = await request(app).delete(`/api/v1/social/users/${target.id}/follow`).set("Cookie", activeCookie);
    expect(unfollow.status).toBe(200);
    expect(unfollow.body.following).toBe(false);
  });

  it("submits a report", async () => {
    const res = await request(app)
      .post("/api/v1/social/reports")
      .set("Cookie", activeCookie)
      .send({ targetType: "VIDEO", targetId: videoId, reason: "Inappropriate content", details: "seen offensive scene" });
    expect(res.status).toBe(201);
    expect(res.body.report.status).toBe("FLAGGED");
  });
});
