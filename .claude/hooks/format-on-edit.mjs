// PostToolUse hook: format the file Claude just edited with the project's Prettier.
// No-op until Prettier is installed (pre-scaffold), and never blocks the agent.
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const FORMATTABLE = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".css", ".md", ".mdx", ".yml", ".yaml",
]);

try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const filePath = input?.tool_input?.file_path;
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? input?.cwd ?? process.cwd();
  const prettierBin = path.join(projectDir, "node_modules", "prettier", "bin", "prettier.cjs");

  if (
    filePath &&
    FORMATTABLE.has(path.extname(filePath).toLowerCase()) &&
    existsSync(filePath) &&
    existsSync(prettierBin)
  ) {
    spawnSync(process.execPath, [prettierBin, "--write", "--log-level", "warn", filePath], {
      cwd: projectDir,
      stdio: "ignore",
      timeout: 25_000,
    });
  }
} catch {
  // Formatting is best-effort; never fail the tool call.
}
process.exit(0);
