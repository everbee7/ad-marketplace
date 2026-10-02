import "server-only";

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { render } from "@react-email/render";
import { createTransport, type Transporter } from "nodemailer";
import type { ReactElement } from "react";

import { env } from "@/env";
import { logger } from "@/lib/logger";

// Transports (ADR-0005): `console` in dev/preview (also appends to .data/mail/outbox.jsonl so E2E
// tests can read links), `smtp` with the client's own mailbox in staging/production.

export type MailMessage = { to: string; subject: string; react: ReactElement; text: string };

export const OUTBOX_FILE = path.join(process.cwd(), ".data", "mail", "outbox.jsonl");

let transporter: Transporter | undefined;

function smtp() {
  transporter ??= createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

export async function sendMail(msg: MailMessage): Promise<void> {
  if (env.EMAIL_TRANSPORT === "console") {
    logger.info("email.console", { to: msg.to, subject: msg.subject, text: msg.text });
    if (env.NODE_ENV !== "production") {
      await mkdir(path.dirname(OUTBOX_FILE), { recursive: true });
      await appendFile(
        OUTBOX_FILE,
        JSON.stringify({ to: msg.to, subject: msg.subject, text: msg.text, at: Date.now() }) + "\n",
      );
    }
    return;
  }
  const html = await render(msg.react);
  await smtp().sendMail({
    from: env.EMAIL_FROM,
    to: msg.to,
    subject: msg.subject,
    html,
    text: msg.text,
  });
}
