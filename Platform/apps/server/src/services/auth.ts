import { Role } from "@prisma/client";
import argon2 from "argon2";
import { authenticator } from "otplib";
import { env } from "../config/env.js";
import { prisma } from "../prisma.js";
import { conflict, forbidden, unauthorized } from "../utils/httpError.js";
import { stampAuthEpoch } from "./session.js";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function registerUser(input: { email: string; password: string; name: string }) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw conflict("An account with this email already exists", "EMAIL_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name: input.name.trim() },
  });

  return user;
}

export async function loginUser(input: { email: string; password: string }) {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }
  if (user.status !== "active") {
    throw forbidden("Account is blocked", "ACCOUNT_BLOCKED");
  }

  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) {
    throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  }

  return user;
}

/**
 * Admin MFA: returns whether MFA is required and, if enabled, the challenge status.
 */
export function adminMfaRequired(user: { role: Role; isMfaEnabled: boolean }): boolean {
  return user.role === Role.ADMIN && user.isMfaEnabled;
}

export function verifyTOTP(secret: string, token: string): boolean {
  return authenticator.verify({ token, secret });
}

export function generateMfaSecret(): { secret: string; otpauthUrl: string } {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(env.ADMIN_EMAIL, "Video Platform", secret);
  return { secret, otpauthUrl };
}

export async function establishSession(sess: SessionLike, user: { id: string; role: Role; email: string }) {
  sess.userId = user.id;
  sess.role = user.role;
  sess.email = user.email;
  await stampAuthEpoch(sess, user.id);
}

interface SessionLike {
  userId?: string;
  role?: string;
  email?: string;
  mfaVerified?: boolean;
  epoch?: number;
}

export { revokeAllSessions } from "./session.js";
