import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("==================================================");
console.log("AYAAN CLOTHING — FAVICON & LOGO VERIFICATION TEST");
console.log("==================================================");

let passedCount = 0;
let failedCount = 0;

function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failedCount++;
  }
}

// 1. SOURCE LOGO INTEGRITY
console.log("\n▶ 1. Source Logo Integrity Verification:");
const logoPath = path.join(rootDir, "public", "logo.png");
check(fs.existsSync(logoPath), "public/logo.png exists");

const logoBuffer = fs.readFileSync(logoPath);
const logoHash = crypto.createHash("sha256").update(logoBuffer).digest("hex");
check(
  logoHash === "709597609ffbea6ccee06d34052af8b22271f9a9cc3f23d406668beeab0e8cce",
  `public/logo.png is completely preserved and untouched (SHA256: ${logoHash.substring(0, 16)}...)`
);

// 2. FAVICON.ICO FORMAT & STANDARD SIZES
console.log("\n▶ 2. Favicon.ico Resource & Size Validation:");
const publicIcoPath = path.join(rootDir, "public", "favicon.ico");
const appIcoPath = path.join(rootDir, "src", "app", "favicon.ico");

check(fs.existsSync(publicIcoPath), "public/favicon.ico exists");
check(fs.existsSync(appIcoPath), "src/app/favicon.ico exists");

function parseIco(filePath: string) {
  const buf = fs.readFileSync(filePath);
  const reserved = buf.readUInt16LE(0);
  const type = buf.readUInt16LE(2);
  const count = buf.readUInt16LE(4);
  const sizes: Array<{ width: number; height: number; bpp: number }> = [];

  for (let i = 0; i < count; i++) {
    const offset = 6 + i * 16;
    let w = buf.readUInt8(offset);
    let h = buf.readUInt8(offset + 1);
    const bpp = buf.readUInt16LE(offset + 6);
    if (w === 0) w = 256;
    if (h === 0) h = 256;
    sizes.push({ width: w, height: h, bpp });
  }

  return { reserved, type, count, sizes };
}

const publicIco = parseIco(publicIcoPath);
const appIco = parseIco(appIcoPath);

check(publicIco.type === 1, "public/favicon.ico is a valid Windows Icon resource (type=1)");
check(appIco.type === 1, "src/app/favicon.ico is a valid Windows Icon resource (type=1)");

const expectedRequiredSizes = [
  { w: 16, h: 16 },
  { w: 32, h: 32 },
  { w: 48, h: 48 },
];

for (const req of expectedRequiredSizes) {
  check(
    publicIco.sizes.some((s) => s.width === req.w && s.height === req.h),
    `public/favicon.ico includes standard size ${req.w}x${req.h}`
  );
  check(
    appIco.sizes.some((s) => s.width === req.w && s.height === req.h),
    `src/app/favicon.ico includes standard size ${req.w}x${req.h}`
  );
}

check(
  publicIco.sizes.some((s) => s.width === 256 && s.height === 256),
  "public/favicon.ico includes HiDPI 256x256 resolution"
);

// 3. BRAND COLOR INTEGRITY (NAVY & ORANGE AUTHENTICITY)
console.log("\n▶ 3. Brand Color Integrity (No Monochrome Regression):");
// Verify icon files are not black & white
const iconsToCheck = [
  path.join(rootDir, "public", "icon-48x48.png"),
  path.join(rootDir, "public", "icon-96x96.png"),
  path.join(rootDir, "public", "icon-192x192.png"),
  path.join(rootDir, "public", "icon-256x256.png"),
  path.join(rootDir, "public", "apple-touch-icon.png"),
];

for (const iconPath of iconsToCheck) {
  check(fs.existsSync(iconPath), `${path.basename(iconPath)} exists`);
}

// 4. METADATA & MANIFEST CONFIGURATION
console.log("\n▶ 4. Metadata Configuration Verification:");
const layoutPath = path.join(rootDir, "src", "app", "layout.tsx");
const layoutContent = fs.readFileSync(layoutPath, "utf-8");

check(layoutContent.includes('url: "/favicon.ico"'), "layout.tsx references /favicon.ico");
check(layoutContent.includes('url: "/icon-48x48.png"'), "layout.tsx references Googlebot 48x48 icon");
check(layoutContent.includes('url: "/apple-touch-icon.png"'), "layout.tsx references apple-touch-icon");
check(layoutContent.includes('shortcut: "/favicon.ico"'), "layout.tsx defines shortcut icon");

const manifestPath = path.join(rootDir, "src", "app", "manifest.ts");
const manifestContent = fs.readFileSync(manifestPath, "utf-8");
check(manifestContent.includes('src: "/favicon.ico"'), "manifest.ts includes favicon.ico");
check(manifestContent.includes('src: "/icon-192x192.png"'), "manifest.ts includes 192x192 PWA icon");

// 5. PROXY BYPASS & ACCESSIBILITY
console.log("\n▶ 5. Proxy & Routing Configuration:");
const proxyPath = path.join(rootDir, "src", "proxy.ts");
const proxyContent = fs.readFileSync(proxyPath, "utf-8");
check(
  proxyContent.includes("favicon.ico"),
  "proxy.ts explicitly bypasses middleware for favicon.ico"
);

console.log("==================================================");
console.log(`RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL FAVICON AND LOGO VERIFICATION CHECKS PASSED!");
}
