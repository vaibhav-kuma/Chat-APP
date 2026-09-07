import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { truncateAll, seedBase } from "./helpers.js";

const app = createApp();

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  await truncateAll();
  await seedBase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("auth", () => {
  it("registers a member and sets a session cookie", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "member@test.com",
      password: "password123",
      name: "Member",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("member@test.com");
    expect(res.body.user.role).toBe("MEMBER");
    expect(res.headers["set-cookie"]?.some((c: string) => c.startsWith("sid="))).toBe(true);
  });

  it("rejects duplicate email with 409", async () => {
    await request(app).post("/api/v1/auth/register").send({
      email: "dup@test.com",
      password: "password123",
      name: "Dup",
    });
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "dup@test.com",
      password: "password123",
      name: "Dup2",
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_EXISTS");
  });

  it("rejects short passwords with 422", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "weak@test.com",
      password: "short",
      name: "Weak",
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION");
  });

  it("logs in and returns user + mfaRequired", async () => {
    await request(app).post("/api/v1/auth/register").send({
      email: "login@test.com",
      password: "password123",
      name: "Login",
    });
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "login@test.com",
      password: "password123",
    });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("login@test.com");
    expect(res.body.mfaRequired).toBe(false);
  });

  it("rejects wrong password with 401", async () => {
    await request(app).post("/api/v1/auth/register").send({
      email: "badpass@test.com",
      password: "password123",
      name: "Bad",
    });
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "badpass@test.com",
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects blocked user login with 403", async () => {
    await prisma.user.create({
      data: {
        email: "blocked@test.com",
        name: "Blocked",
        passwordHash: "$2b$10$invalid",
        status: "blocked",
      },
    });
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "blocked@test.com",
      password: "password123",
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ACCOUNT_BLOCKED");
  });

  it("GET /me returns user + membership after login", async () => {
    await request(app).post("/api/v1/auth/register").send({
      email: "me@test.com",
      password: "password123",
      name: "Me",
    });
    const login = await request(app).post("/api/v1/auth/login").send({
      email: "me@test.com",
      password: "password123",
    });
    const res = await request(app).get("/api/v1/auth/me").set("Cookie", login.headers["set-cookie"]);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("me@test.com");
    expect(res.body.membership.isActive).toBe(false);
  });

  it("GET /me without session is 401", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("logs out and clears the session", async () => {
    await request(app).post("/api/v1/auth/register").send({
      email: "logout@test.com",
      password: "password123",
      name: "Out",
    });
    const login = await request(app).post("/api/v1/auth/login").send({
      email: "logout@test.com",
      password: "password123",
    });
    const cookie = login.headers["set-cookie"];
    const out = await request(app).post("/api/v1/auth/logout").set("Cookie", cookie);
    expect(out.status).toBe(200);
    const me = await request(app).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(401);
  });
});
