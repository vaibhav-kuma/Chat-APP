import { env } from "../config/env.js";

interface MailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Minimal email dispatch. Supports Resend API or SMTP.
 * Falls back to logging in development/test when no provider configured.
 */
export async function sendEmail(input: MailInput): Promise<void> {
  try {
    if (env.RESEND_API_KEY) {
      await sendViaResend(input);
      return;
    }
    if (env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS) {
      await sendViaSmtp(input);
      return;
    }
    if (env.NODE_ENV !== "production") {
      console.log(`[email:dev] to=${input.to} subject="${input.subject}"`);
      console.log(input.text);
      return;
    }
    console.warn("[email] no provider configured; email not sent");
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}

async function sendViaResend(input: MailInput): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  }
}

async function sendViaSmtp(input: MailInput): Promise<void> {
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT ?? 587,
    secure: env.EMAIL_PORT === 465,
    auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
  });
  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
