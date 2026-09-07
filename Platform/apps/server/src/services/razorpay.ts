import crypto from "node:crypto";
import Razorpay from "razorpay";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

const isConfigured = (v: string): boolean => Boolean(v) && v !== "xxx" && !v.startsWith("rzp_test_");

export const razorpay = isConfigured(env.RAZORPAY_KEY_ID) && isConfigured(env.RAZORPAY_KEY_SECRET)
  ? new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    })
  : null;

export type RazorpayEvent =
  | "subscription.activated"
  | "subscription.charged"
  | "subscription.charged.failed"
  | "subscription.cancelled"
  | "subscription.paused"
  | "subscription.resumed"
  | "subscription.completed"
  | "subscription.halted"
  | "subscription.authenticated"
  | "subscription.pending"
  | "payment.captured"
  | "payment.failed";

const knownEvents = new Set<string>([
  "subscription.activated",
  "subscription.charged",
  "subscription.charged.failed",
  "subscription.cancelled",
  "subscription.paused",
  "subscription.resumed",
  "subscription.completed",
  "subscription.halted",
  "subscription.authenticated",
  "subscription.pending",
  "payment.captured",
  "payment.failed",
]);

/**
 * Verify a Razorpay webhook signature. Uses HMAC-SHA256 over the raw body.
 * Throws on mismatch to reject the request.
 */
export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  if (provided.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, provided);
}

export function isKnownEvent(type: string): type is RazorpayEvent {
  return knownEvents.has(type);
}

export async function createSubscription(planRazorpayId: string, customerEmail: string, customerName: string, totalCount = 1200) {
  if (!razorpay) {
    throw new HttpError(500, "Razorpay not configured", "PAYMENTS_UNAVAILABLE");
  }
  // total_count: monthly subscriptions auto-renew until this many charges.
  // 1200 ~ 100 years, effectively indefinite until the user cancels.
  return razorpay.subscriptions.create({
    plan_id: planRazorpayId,
    total_count: totalCount,
    customer_notify: 1,
    notes: { customer_email: customerEmail, customer_name: customerName },
  });
}

export function parseWebhookEntity(payload: unknown) {
  const body = payload as {
    entity?: string;
    event?: string;
    subscription_id?: string;
    payload?: {
      subscription?: { entity?: { id?: string } };
      payment?: { entity?: { order_id?: string; amount?: number } };
    };
  };
  return body;
}
