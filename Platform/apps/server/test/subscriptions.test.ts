import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { truncateAll, seedBase, createUser, webhookHeaders } from "./helpers.js";
import { env } from "../src/config/env.js";

const app = createApp();
const WEBHOOK_SECRET = env.RAZORPAY_WEBHOOK_SECRET;

let planId: string;

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await truncateAll();
  const base = await seedBase();
  planId = base.planId;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("subscriptions", () => {
  it("lists active plans", async () => {
    const res = await request(app).get("/api/v1/subscriptions/plans");
    expect(res.status).toBe(200);
    expect(res.body.plans.length).toBeGreaterThan(0);
    expect(res.body.plans[0].currency).toBe("INR");
  });

  it("rejects webhook with no signature", async () => {
    const res = await request(app)
      .post("/api/v1/subscriptions/webhook")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ event: "subscription.activated" }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_SIGNATURE");
  });

  it("rejects webhook with wrong signature", async () => {
    const body = JSON.stringify({ event: "subscription.activated" });
    const res = await request(app)
      .post("/api/v1/subscriptions/webhook")
      .set("Content-Type", "application/json")
      .set("x-razorpay-signature", "deadbeef")
      .send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_SIGNATURE");
  });

  it("activates a subscription from a valid webhook and is idempotent", async () => {
    const user = await createUser();
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId,
        razorpaySubscriptionId: "rzp_test_sub_activate",
        status: "INCOMPLETE",
      },
    });

    const payload = {
      event: "subscription.activated",
      payload: { subscription: { entity: { id: "rzp_test_sub_activate", status: "active" } } },
    };
    const body = JSON.stringify(payload);
    const headers = webhookHeaders(Buffer.from(body), WEBHOOK_SECRET);

    const res = await request(app).post("/api/v1/subscriptions/webhook").set(headers).send(body);
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    const sub = await prisma.subscription.findUnique({ where: { razorpaySubscriptionId: "rzp_test_sub_activate" } });
    expect(sub?.status).toBe("ACTIVE");
    expect(sub?.cancelAtPeriodEnd).toBe(false);

    // Duplicate delivery must be ignored
    const dup = await request(app).post("/api/v1/subscriptions/webhook").set(headers).send(body);
    expect(dup.status).toBe(200);
    expect(dup.body.duplicate).toBe(true);
  });

  it("marks subscription past-due on charged.failed", async () => {
    const user = await createUser();
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId,
        razorpaySubscriptionId: "rzp_test_sub_fail",
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });

    const payload = {
      event: "subscription.charged.failed",
      payload: { subscription: { entity: { id: "rzp_test_sub_fail" } } },
    };
    const body = JSON.stringify(payload);
    const res = await request(app)
      .post("/api/v1/subscriptions/webhook")
      .set(webhookHeaders(Buffer.from(body), WEBHOOK_SECRET))
      .send(body);
    expect(res.status).toBe(200);

    const sub = await prisma.subscription.findUnique({ where: { razorpaySubscriptionId: "rzp_test_sub_fail" } });
    expect(sub?.status).toBe("PAST_DUE");
    expect(sub?.failedPaymentCount).toBe(1);
    expect(sub?.gracePeriodEnd).not.toBeNull();
  });

  it("pauses a subscription and revokes the user session", async () => {
    const user = await createUser();
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId,
        razorpaySubscriptionId: "rzp_test_sub_pause",
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      },
    });

    // Log the user in to establish a session with a stamped epoch
    const login = await request(app).post("/api/v1/auth/login").send({ email: user.email, password: user.password });
    expect(login.status).toBe(200);
    const cookie = login.headers["set-cookie"];

    const payload = {
      event: "subscription.paused",
      payload: { subscription: { entity: { id: "rzp_test_sub_pause" } } },
    };
    const body = JSON.stringify(payload);
    const res = await request(app)
      .post("/api/v1/subscriptions/webhook")
      .set(webhookHeaders(Buffer.from(body), WEBHOOK_SECRET))
      .send(body);
    expect(res.status).toBe(200);

    const sub = await prisma.subscription.findUnique({ where: { razorpaySubscriptionId: "rzp_test_sub_pause" } });
    expect(sub?.status).toBe("PAUSED");

    // Old session must now be invalid
    const me = await request(app).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(401);
  });
});
