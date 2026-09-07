import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { truncateAll, seedBase } from "./helpers.js";

const app = createApp();

let adminCookie: string;
let memberCookie: string;
let activeMemberCookie: string;

async function registerAndLogin(email: string, password: string) {
  await request(app).post("/api/v1/auth/register").send({ email, password, name: email.split("@")[0] });
  const login = await request(app).post("/api/v1/auth/login").send({ email, password });
  return (login.headers["set-cookie"] as string[])[0];
}

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await truncateAll();
  const { adminId, planId } = await seedBase();

  adminCookie = (await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "admin@example.com", password: "change_me_admin" })).headers["set-cookie"][0];

  memberCookie = await registerAndLogin("member@test.com", "password123");
  activeMemberCookie = await registerAndLogin("active@test.com", "password123");

  const activeUser = await prisma.user.findUnique({ where: { email: "active@test.com" } });
  await prisma.subscription.create({
    data: {
      userId: activeUser!.id,
      planId,
      razorpaySubscriptionId: "rzp_test_sub_active",
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    },
  });
  void adminId;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("RBAC", () => {
  it("anonymous gets 401 on admin routes", async () => {
    const res = await request(app).get("/api/v1/admin/dashboard");
    expect(res.status).toBe(401);
  });

  it("member gets 403 on admin dashboard", async () => {
    const res = await request(app).get("/api/v1/admin/dashboard").set("Cookie", memberCookie);
    expect(res.status).toBe(403);
  });

  it("admin can access dashboard", async () => {
    const res = await request(app).get("/api/v1/admin/dashboard").set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("members");
  });

  it("anonymous gets 401 on admin video upload", async () => {
    const res = await request(app).post("/api/v1/videos/upload").send({});
    expect(res.status).toBe(401);
  });

  it("member gets 403 on video upload", async () => {
    const res = await request(app).post("/api/v1/videos/upload").set("Cookie", memberCookie).send({});
    expect(res.status).toBe(403);
  });

  it("admin can create an upload", async () => {
    const res = await request(app).post("/api/v1/videos/upload").set("Cookie", adminCookie).send({});
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("videoId");
    expect(res.body).toHaveProperty("uploadUrl");
  });

  it("admin MFA-gated actions require verified MFA", async () => {
    const res = await request(app).post("/api/v1/admin/categories").set("Cookie", adminCookie).send({ name: "Music", sortOrder: 1 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("MFA_REQUIRED");
  });

  it("member without subscription gets 403 on membership-gated video detail", async () => {
    const video = await prisma.video.create({
      data: { title: "Test", status: "PUBLISHED", muxPlaybackId: "pb_test" },
    });
    const res = await request(app).get(`/api/v1/videos/${video.id}`).set("Cookie", memberCookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("MEMBERSHIP_REQUIRED");
  });

  it("active member can fetch video detail", async () => {
    const video = await prisma.video.create({
      data: { title: "Test", status: "PUBLISHED", muxPlaybackId: "pb_test" },
    });
    const res = await request(app).get(`/api/v1/videos/${video.id}`).set("Cookie", activeMemberCookie);
    expect(res.status).toBe(200);
    expect(res.body.video.title).toBe("Test");
  });

  it("admin bypasses membership gate", async () => {
    const video = await prisma.video.create({
      data: { title: "Admin video", status: "PUBLISHED", muxPlaybackId: "pb_admin" },
    });
    const res = await request(app).get(`/api/v1/videos/${video.id}/stream-url`).set("Cookie", adminCookie);
    expect(res.status).toBe(200);
  });
});
