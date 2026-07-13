import fs from "node:fs";
import path from "node:path";

const serviceWorkerPath = path.resolve(process.argv[2] ?? "dist/sw.js");
if (!fs.existsSync(serviceWorkerPath)) {
  throw new Error(`Missing generated service worker: ${serviceWorkerPath}`);
}

const source = fs.readFileSync(serviceWorkerPath, "utf8");
const forbidden = [
  ["precache entry HTML", /["']?url["']?\s*:\s*["'](?:\.?\/)?index\.html["']/],
  ["navigation fallback", /NavigationRoute|createHandlerBoundToURL/],
];

for (const [label, pattern] of forbidden) {
  if (pattern.test(source)) {
    throw new Error(`Generated service worker contains forbidden ${label}`);
  }
}

console.log("PWA build verified: entry HTML and navigation fallback are not cached.");
