import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const WEB_ROOT = process.cwd();
const STASH_DIR = path.join(WEB_ROOT, ".apk-build-stash");

const SERVER_ONLY_PATHS = [
  "src/app/api",
  "src/app/apple-icon.tsx",
];

function moveIfExists(srcRel, destDir) {
  const srcFull = path.join(WEB_ROOT, srcRel);
  if (!fs.existsSync(srcFull)) return null;
  const destFull = path.join(destDir, srcRel);
  fs.mkdirSync(path.dirname(destFull), { recursive: true });
  fs.renameSync(srcFull, destFull);
  return { srcFull, destFull };
}

const movedItems = [];

try {
  console.log("[1/3] Preparing static export for Android APK...");
  fs.rmSync(STASH_DIR, { recursive: true, force: true });

  for (const rel of SERVER_ONLY_PATHS) {
    const moved = moveIfExists(rel, STASH_DIR);
    if (moved) movedItems.push(moved);
  }

  console.log("[2/3] Building Next.js static bundle (`out/`)...");
  execSync("npx next build", {
    cwd: WEB_ROOT,
    stdio: "inherit",
    env: { ...process.env, BUILD_TARGET: "apk" },
  });
} finally {
  // Always restore server-only routes immediately
  for (const { srcFull, destFull } of movedItems.reverse()) {
    if (fs.existsSync(destFull)) {
      fs.mkdirSync(path.dirname(srcFull), { recursive: true });
      fs.renameSync(destFull, srcFull);
    }
  }
  fs.rmSync(STASH_DIR, { recursive: true, force: true });
}

console.log("[3/3] Syncing bundle into Capacitor Android project...");
if (!fs.existsSync(path.join(WEB_ROOT, "android"))) {
  execSync("npx cap add android", { cwd: WEB_ROOT, stdio: "inherit" });
}
execSync("npx cap sync android", { cwd: WEB_ROOT, stdio: "inherit" });
console.log(" Capacitor Android sync complete (`web/android`).");
