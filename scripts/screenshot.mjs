// Dev helper: `node scripts/screenshot.mjs <url> <out.png> [width] [height]` for visual checks.

import { chromium } from "@playwright/test";

const [url, out, width = "1440", height = "900"] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: node scripts/screenshot.mjs <url> <out.png> [width] [height]");
  process.exit(1);
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) } });
await page.goto(url, { waitUntil: "networkidle" });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.info(`Saved ${out}`);
