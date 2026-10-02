// SessionStart hook: print the project's current state so a fresh session can continue
// without the user re-explaining earlier sessions. Stdout is added to Claude's context.
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const LOG_ENTRIES = 2;

const read = (rel) => {
  const file = path.join(root, rel);
  return existsSync(file) ? readFileSync(file, "utf8").trim() : null;
};
const git = (...args) => {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

const out = [
  "# Session context (auto-injected by .claude/hooks/session-context.mjs)",
  "Continue from this state. Do not ask the user to re-explain earlier sessions: the record is",
  "docs/ai/STATE.md, docs/ai/SESSION_LOG.md, docs/product/ROADMAP.md and git history.",
];

const state = read("docs/ai/STATE.md");
if (state) out.push("", state);

const log = read("docs/ai/SESSION_LOG.md");
if (log) {
  const entries = log.split(/^(?=## )/m).filter((e) => e.startsWith("## "));
  if (entries.length) {
    out.push("", `# Latest ${Math.min(LOG_ENTRIES, entries.length)} session log entries (newest first)`);
    out.push(...entries.slice(0, LOG_ENTRIES).map((e) => e.trim()));
  }
}

const status = git("status", "--short");
out.push(
  "",
  "# Git",
  `Branch: ${git("branch", "--show-current") || "(detached/unknown)"}`,
  "Uncommitted changes:",
  status ? status.split("\n").slice(0, 30).join("\n") : "(none)",
  "Recent commits:",
  git("log", "--oneline", "-n", "8") || "(none)",
);

process.stdout.write(out.join("\n") + "\n");
