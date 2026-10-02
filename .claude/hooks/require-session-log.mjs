// Stop hook: if there are uncommitted changes but docs/ai was not updated, ask Claude to
// record the session before finishing, so the next session can pick up without re-explaining.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  // no input: fall through with defaults
}
// Already continuing because of this hook: never loop.
if (input.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
let status = "";
try {
  status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch {
  process.exit(0);
}

const changed = status
  .split("\n")
  .filter(Boolean)
  .map((line) => line.slice(3).split(" -> ").pop().replace(/^"|"$/g, ""));

if (changed.length === 0) process.exit(0);
if (changed.some((file) => file.startsWith("docs/ai/"))) process.exit(0);

process.stdout.write(
  JSON.stringify({
    decision: "block",
    reason:
      "There are uncommitted changes but docs/ai/ was not updated. Before finishing, record this session: " +
      "update docs/ai/STATE.md (current snapshot) and add or extend today's entry in docs/ai/SESSION_LOG.md " +
      "(see the /handoff skill). If the change is trivial, a one-line note in the current session entry is enough.",
  }),
);
process.exit(0);
