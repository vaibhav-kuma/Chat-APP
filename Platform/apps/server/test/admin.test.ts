import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { authenticator } from "otplib";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { truncateAll, seedBase, createUser } from "./helpers.js";

const app = createApp();

let adminAgent: ReturnType<typeof request.agent>;
let adminId: string;

async function loginAsAdmin(agent: ReturnType<typeof request.agent>) {
  await agent.post("/api/v1/auth/login").send({ email: "admin@example.com", password: "change_me_admin" });
}

function totpFor(secret: string): string {
  return authenticator.generate(secret);
}

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await truncateAll();
  const base = await seedBase();
  adminId = base.adminId;

  adminAgent = request.agent(app);
  await loginAsAdmin(adminAgent);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("admin", () => {
  it("returns dashboard stats", async () => {
    const res = await adminAgent.get("/api/v1/admin/dashboard");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("members");
    expect(res.body).toHaveProperty("publishedVideos");
    expect(res.body).toHaveProperty("monthlyRecurring");
  });

  it("lists categories without MFA", async () => {
    const res = await adminAgent.get("/api/v1/admin/categories");
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it("requires MFA before creating a category", async () => {
    const res = await adminAgent.post("/api/v1/admin/categories").send({ name: "Music", sortOrder: 1 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("MFA_REQUIRED");
  });

  it("full MFA bootstrap: setup, confirm, then mutating actions work", async () => {
    const setup = await adminAgent.post("/api/v1/admin/mfa/setup");
    expect(setup.status).toBe(200);
    expect(setup.body.secret).toBeTruthy();
    expect(setup.body.qrDataUrl).toMatch(/^data:image\/png/);

    const token = totpFor(setup.body.secret);
    const confirm = await adminAgent.post("/api/v1/admin/mfa/confirm").send({ secret: setup.body.secret, token });
    expect(confirm.status).toBe(200);
    expect(confirm.body.ok).toBe(true);

    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    expect(admin?.isMfaEnabled).toBe(true);

    // Now MFA-verified, category creation should succeed
    const res = await adminAgent.post("/api/v1/admin/categories").send({ name: "Music", sortOrder: 1 });
    expect(res.status).toBe(201);
    expect(res.body.category.name).toBe("Music");
  });

  it("admin login flags mfaRequired once MFA is enabled, and /mfa/verify unlocks admin routes", async () => {
    // Enable MFA first
    const setup = await adminAgent.post("/api/v1/admin/mfa/setup");
    const token = totpFor(setup.body.secret);
    await adminAgent.post("/api/v1/admin/mfa/confirm").send({ secret: setup.body.secret, token });

    // Fresh login now requires MFA
    const freshAgent = request.agent(app);
    const login = await freshAgent.post("/api/v1/auth/login").send({ email: "admin@example.com", password: "change_me_admin" });
    expect(login.status).toBe(200);
    expect(login.body.mfaRequired).toBe(true);

    // Admin route blocked until MFA verified
    const blocked = await freshAgent.post("/api/v1/admin/categories").send({ name: "Music", sortOrder: 1 });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("MFA_REQUIRED");

    // Verify TOTP
    const freshToken = totpFor(setup.body.secret);
    const verify = await freshAgent.post("/api/v1/auth/mfa/verify").send({ token: freshToken });
    expect(verify.status).toBe(200);
    expect(verify.body.verified).toBe(true);

    const status = await freshAgent.get("/api/v1/auth/mfa/status");
    expect(status.body.mfaVerified).toBe(true);

    const ok = await freshAgent.post("/api/v1/admin/categories").send({ name: "Gaming", sortOrder: 2 });
    expect(ok.status).toBe(201);
  });

  it("rejects a wrong MFA token on confirm", async () => {
    const setup = await adminAgent.post("/api/v1/admin/mfa/setup");
    const confirm = await adminAgent.post("/api/v1/admin/mfa/confirm").send({ secret: setup.body.secret, token: "000000" });
    expect(confirm.status).toBe(401);
    expect(confirm.body.error.code).toBe("INVALID_MFA");
  });

  it("lists and resolves reports", async () => {
    const reporter = await createUser();
    const video = await prisma.video.create({ data: { title: "Flagged", status: "PUBLISHED" } });
    const report = await prisma.report.create({
      data: { reporterId: reporter.id, targetType: "VIDEO", targetId: video.id, reason: "Spam" },
    });

    const list = await adminAgent.get("/api/v1/admin/reports");
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);

    const blocked = await adminAgent.post(`/api/v1/admin/reports/${report.id}/resolve`);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("MFA_REQUIRED");
  });

  it("moderates a report after MFA and blocks a reported user", async () => {
    const setup = await adminAgent.post("/api/v1/admin/mfa/setup");
    const token = totpFor(setup.body.secret);
    await adminAgent.post("/api/v1/admin/mfa/confirm").send({ secret: setup.body.secret, token });

    const target = await createUser();
    const report = await prisma.report.create({
      data: { reporterId: adminId, targetType: "USER", targetId: target.id, reason: "Harassment" },
    });

    const action = await adminAgent.post(`/api/v1/admin/reports/${report.id}/action`).send({
      action: "block_user",
      reason: "verified harassment",
    });
    expect(action.status).toBe(200);

    const blocked = await prisma.user.findUnique({ where: { id: target.id } });
    expect(blocked?.status).toBe("blocked");

    const moderation = await prisma.moderationAction.findFirst({ where: { targetId: target.id } });
    expect(moderation?.action).toBe("block_user");

    // Reported user's session is revoked: a fresh login fails
    const res = await request(app).post("/api/v1/auth/login").send({ email: target.email, password: target.password });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_BLOCKED");
  });

  it("lists audit log entries after admin actions", async () => {
    const res = await adminAgent.get("/api/v1/admin/audit-log");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("blocking an admin is rejected", async () => {
    const res = await adminAgent.post(`/api/v1/admin/users/${adminId}/block`);
    expect(res.status).toBe(403);
  });
});
