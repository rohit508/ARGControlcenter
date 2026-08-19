import nodemailer, { Transporter } from "nodemailer";
import { env } from "../env";

/**
 * SMTP is optional (see env.ts). Without SMTP_HOST configured, sendMail logs the email to the
 * console instead of failing — so ticket-assignment notifications work out of the box in every
 * environment, and real delivery is just a matter of filling in SMTP_* in .env later.
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export async function sendMail(params: { to: string; subject: string; text: string; html?: string }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[mailer] SMTP not configured — logging instead of sending:\n  to: ${params.to}\n  subject: ${params.subject}\n  body: ${params.text}`);
    return;
  }
  try {
    await t.sendMail({ from: env.SMTP_FROM, to: params.to, subject: params.subject, text: params.text, html: params.html });
  } catch (err) {
    // Notification delivery must never break the request that triggered it (e.g. ticket
    // assignment) — log and move on rather than throwing.
    console.error(`[mailer] failed to send email to ${params.to}:`, err);
  }
}
