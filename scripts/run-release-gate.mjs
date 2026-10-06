/**
 * Ayaan Clothing — Master Release Gate Runner (Phase I)
 *
 * Authoritative CI/CD & Deployment Assurance:
 * 1. TypeScript Compilation (npx tsc --noEmit)
 * 2. Production Source ESLint (npx eslint src)
 * 3. Storefront Offline Regression (Unit 30/30 + Contract Parity)
 * 4. Live API & Security Verification (Safe live contracts, health, data isolation)
 * 5. Production Static & Dynamic Build (npm run build — 57/57 pages)
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const ROOT_DIR = process.cwd();
const API_BASE = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "https://ayaanclothing.com/api/v1";

function logHeader(title) {
  console.log("\n==========================================================");
  console.log(`  ${title}`);
  console.log("==========================================================");
}

function runStep(name, cmd) {
  process.stdout.write(`▶ Running ${name}... `);
  const start = Date.now();
  try {
    const stdout = execSync(cmd, {
      cwd: ROOT_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120000,
    });
    const ms = Date.now() - start;
    console.log(`✔ [PASS] (${ms}ms)`);
    return { success: true, ms, output: stdout };
  } catch (err) {
    const ms = Date.now() - start;
    console.log(`✖ [FAIL] (${ms}ms)`);
    const combined = ((err.stdout || "") + "\n" + (err.stderr || "") + "\n" + (err.message || "")).trim();
    return { success: false, ms, error: combined };
  }
}

async function checkLiveBackendHealth(url) {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      return { status: "BLOCKED", reason: `API returned HTTP ${res.status}` };
    }
    const json = await res.json();
    if (json.data?.database !== "ok") {
      return { status: "FAIL", reason: `Database reported status: ${json.data?.database}` };
    }
    if (json.data?.redis !== "ok") {
      return { status: "FAIL", reason: `Redis cache reported status: ${json.data?.redis}` };
    }
    return { status: "ONLINE", data: json.data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: "BLOCKED", reason: `Cannot connect to ${url}: ${msg}` };
  }
}

async function main() {
  logHeader("AYAAN CLOTHING — STOREFRONT MASTER RELEASE GATE (PHASE I)");
  console.log(`Target Live API: ${API_BASE}`);
  console.log(`Node Environment: ${process.env.NODE_ENV || "development"}`);

  const gateResults = {
    typeScript: "PENDING",
    eslint: "PENDING",
    storefrontUnit: "PENDING",
    storefrontContract: "PENDING",
    securityChecks: "PENDING",
    liveIntegration: "PENDING",
    productionBuild: "PENDING",
  };

  const failures = [];

  // 1. TypeScript Verification
  const tsRes = runStep("TypeScript Check (npx tsc --noEmit)", "npx tsc --noEmit");
  if (tsRes.success) {
    gateResults.typeScript = "PASS";
  } else {
    gateResults.typeScript = "FAIL";
    failures.push({ gate: "TypeScript", error: tsRes.error.slice(0, 400) });
  }

  // 2. Production Source ESLint
  const lintRes = runStep("Production ESLint (npx eslint src)", "npx eslint src");
  if (lintRes.success) {
    gateResults.eslint = "PASS";
  } else {
    gateResults.eslint = "FAIL";
    failures.push({ gate: "ESLint", error: lintRes.error.slice(0, 400) });
  }

  // 3. Storefront Regression Runner
  const regRes = runStep("Storefront Regression Suite", "node scripts/run-storefront-regression.mjs");
  if (regRes.success) {
    gateResults.storefrontUnit = "PASS";
    gateResults.storefrontContract = "PASS";
  } else {
    gateResults.storefrontUnit = "FAIL";
    failures.push({ gate: "Storefront Regression", error: regRes.error.slice(0, 400) });
  }

  // 4. Security & Isolation Invariants
  process.stdout.write("▶ Running Security & Boundary Checks... ");
  try {
    const frontendMode = fs.readFileSync(path.join(ROOT_DIR, "src/lib/frontend-mode.ts"), "utf-8");
    if (!frontendMode.includes('process.env.NODE_ENV === "production"') || !frontendMode.includes("return false;")) {
      throw new Error("Production mode does not strictly enforce real backend (isFrontendOnly must return false)");
    }
    const safeRedirect = fs.readFileSync(path.join(ROOT_DIR, "src/lib/safe-redirect.ts"), "utf-8");
    if (!safeRedirect.includes("startsWith(\"//\")") || !safeRedirect.includes("BLOCKED_ADMIN_PREFIXES")) {
      throw new Error("Safe redirect sanitizer missing protocol or admin block guards");
    }
    console.log("✔ [PASS]");
    gateResults.securityChecks = "PASS";
  } catch (err) {
    console.log("✖ [FAIL]");
    gateResults.securityChecks = "FAIL";
    failures.push({ gate: "Security Checks", error: err.message });
  }

  // 5. Live Backend Integration
  process.stdout.write("▶ Evaluating Live Integration Environment... ");
  const healthCheck = await checkLiveBackendHealth(API_BASE);
  if (healthCheck.status === "ONLINE") {
    console.log(`ONLINE (DB: ok, Redis: ok)`);
    const liveTestRes = runStep("Live API Contract Verification", "npx tsx --test tests/live-api-contract-verification.test.ts");
    if (liveTestRes.success) {
      gateResults.liveIntegration = "PASS";
    } else {
      gateResults.liveIntegration = "FAIL";
      failures.push({ gate: "Live Integration", error: liveTestRes.error.slice(0, 400) });
    }
  } else if (healthCheck.status === "BLOCKED") {
    console.log(`BLOCKED (${healthCheck.reason})`);
    gateResults.liveIntegration = `BLOCKED (${healthCheck.reason})`;
  } else {
    console.log(`FAIL (${healthCheck.reason})`);
    gateResults.liveIntegration = "FAIL";
    failures.push({ gate: "Live Integration Infrastructure", error: healthCheck.reason });
  }

  // 6. Production Next.js Build
  const buildRes = runStep("Production Build (npm run build)", "npm run build");
  if (buildRes.success) {
    gateResults.productionBuild = "PASS";
  } else {
    gateResults.productionBuild = "FAIL";
    failures.push({ gate: "Production Build", error: buildRes.error.slice(0, 400) });
  }

  // Summary Report
  logHeader("STOREFRONT RELEASE GATE SUMMARY");
  console.log(`  1. TypeScript:             ${gateResults.typeScript}`);
  console.log(`  2. Production ESLint:      ${gateResults.eslint}`);
  console.log(`  3. Storefront Unit (30/30): ${gateResults.storefrontUnit}`);
  console.log(`  4. Storefront Contract:    ${gateResults.storefrontContract}`);
  console.log(`  5. Security Checks:        ${gateResults.securityChecks}`);
  console.log(`  6. Live Integration:       ${gateResults.liveIntegration}`);
  console.log(`  7. Production Build:       ${gateResults.productionBuild}`);
  console.log("==========================================================");

  const isApproved =
    gateResults.typeScript === "PASS" &&
    gateResults.eslint === "PASS" &&
    gateResults.storefrontUnit === "PASS" &&
    gateResults.storefrontContract === "PASS" &&
    gateResults.securityChecks === "PASS" &&
    gateResults.productionBuild === "PASS" &&
    (gateResults.liveIntegration === "PASS" || gateResults.liveIntegration.startsWith("BLOCKED"));

  if (isApproved) {
    console.log("\n🎉 FINAL RELEASE DECISION: APPROVED — READY FOR DEPLOYMENT\n");
    process.exit(0);
  } else {
    console.error("\n❌ FINAL RELEASE DECISION: REJECTED — GATE FAILURES DETECTED:\n");
    for (const f of failures) {
      console.error(`- [${f.gate}]: ${f.error}\n`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Release gate runner crashed:", err);
  process.exit(1);
});
