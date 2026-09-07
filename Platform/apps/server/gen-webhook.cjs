import crypto from "node:crypto";
import { env } from "./src/config/env.js";

const secret = env.RAZORPAY_WEBHOOK_SECRET;

const payload = {
  event: "subscription.activated",
  payload: {
    subscription: {
      entity: {
        id: "sub_test_001",
        status: "active",
        current_start: Math.floor(Date.now() / 1000),
        current_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      },
    },
  },
};

const body = JSON.stringify(payload);
const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
console.log(sig);
console.log(body);
