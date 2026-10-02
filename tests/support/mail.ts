import { readFile } from "node:fs/promises";

import { OUTBOX_FILE } from "@/lib/email";

type Mail = { to: string; subject: string; text: string; at: number };

/** Latest console-transport email to `to` (tests and E2E read links from here). */
export async function lastMailTo(to: string, subject?: RegExp): Promise<Mail | null> {
  let raw = "";
  try {
    raw = await readFile(OUTBOX_FILE, "utf8");
  } catch {
    return null;
  }
  const mails = raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Mail)
    .filter((m) => m.to === to && (!subject || subject.test(m.subject)));
  return mails.at(-1) ?? null;
}

export function linkIn(mail: Mail | null): string {
  const m = mail?.text.match(/https?:\/\/\S+/);
  if (!m) throw new Error("No link in email");
  return m[0];
}
