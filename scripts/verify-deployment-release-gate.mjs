#!/usr/bin/env node
/**
 * Ayaan Clothing — Mandatory Deployment Release Gate
 *
 * Verifies live application health, process status, and static asset consistency
 * immediately following a deployment or reload.
 *
 * Requirements:
 * 1. PM2 processes 'ayaan-customer' and 'ayaan-admin' are online.
 * 2. Backend API health endpoint (/api/v1/health) returns HTTP 200 with database and redis ok.
 * 3. Storefront and Admin routes return HTTP 200.
 * 4. Extracts all referenced JavaScript and CSS assets from page HTML.
 * 5. Verifies EVERY chunk returns HTTP 200 through both upstream port 3000 and Nginx.
 * 6. Exits with code 0 on complete success, or code 1 on ANY asset or health failure.
 */

import http from "http";
import https from "https";
import { execSync } from "child_process";

const TARGET_HOST = process.env.DEPLOY_TARGET_HOST || "127.0.0.1";
const TARGET_PORT = parseInt(process.env.DEPLOY_TARGET_PORT || "3000", 10);
const HOSTNAME_HEADER = process.env.DEPLOY_HOSTNAME || "ayaanclothing.com";

const ROUTES_TO_AUDIT = [
  { path: "/", name: "Storefront Home", isAdmin: false },
  { path: "/products", name: "Product Catalogue", isAdmin: false },
  { path: "/rfq", name: "Customer RFQ Form", isAdmin: false },
  { path: "/dashboard/rfq", name: "Customer Dashboard RFQ", isAdmin: false },
  { path: "/ayc", name: "Admin Portal Gateway", isAdmin: true },
  { path: "/ayc/rfq", name: "Admin RFQ Management", isAdmin: true },
];

function fetchEndpoint(urlStr, headers = {}, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const isHttps = url.protocol === "https:";
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: "GET",
      headers: {
        Host: HOSTNAME_HEADER,
        "User-Agent": "AYC-Deployment-Release-Gate/1.0",
        ...headers,
      },
      rejectUnauthorized: false,
      servername: HOSTNAME_HEADER,
      timeout: timeoutMs,
    };

    const req = client.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout after ${timeoutMs}ms`));
    });

    req.end();
  });
}

function verifyPm2Processes() {
  process.stdout.write("▶ [Gate 1/4] Verifying PM2 Daemons... ");
  try {
    const stdout = execSync("su - ayaan -c 'pm2 jlist'", { encoding: "utf-8", timeout: 10000 });
    const list = JSON.parse(stdout);
    const requiredApps = ["ayaan-customer", "ayaan-admin"];

    for (const appName of requiredApps) {
      const proc = list.find((p) => p.name === appName);
      if (!proc) {
        throw new Error(`PM2 process '${appName}' was not found`);
      }
      if (proc.pm2_env?.status !== "online") {
        throw new Error(`PM2 process '${appName}' status is '${proc.pm2_env?.status}' (expected 'online')`);
      }
    }
    console.log("✔ [PASS] Both ayaan-customer and ayaan-admin are ONLINE");
    return true;
  } catch (err) {
    console.log(`✖ [FAIL] ${err.message}`);
    return false;
  }
}

async function verifyBackendHealth() {
  process.stdout.write("▶ [Gate 2/4] Verifying Backend API Health (/api/v1/health)... ");
  try {
    const res = await fetchEndpoint(`https://${TARGET_HOST}/api/v1/health`);
    if (res.statusCode !== 200) {
      throw new Error(`API health returned HTTP ${res.statusCode}`);
    }
    const json = JSON.parse(res.body);
    if (json.data?.database !== "ok") {
      throw new Error(`Database reported '${json.data?.database}'`);
    }
    if (json.data?.redis !== "ok") {
      throw new Error(`Redis reported '${json.data?.redis}'`);
    }
    console.log("✔ [PASS] Database: ok, Redis: ok");
    return true;
  } catch (err) {
    console.log(`✖ [FAIL] ${err.message}`);
    return false;
  }
}

async function verifyPagesAndAssets() {
  process.stdout.write("▶ [Gate 3/4] Auditing HTML Routes & Extracting Static Chunks...\n");
  const uniqueChunks = new Set();
  let pagesOk = true;

  for (const r of ROUTES_TO_AUDIT) {
    const headers = {};
    if (r.isAdmin) {
      headers["x-admin-app"] = "true";
      headers["x-is-admin-host"] = "1";
    }

    try {
      const res = await fetchEndpoint(`http://${TARGET_HOST}:${TARGET_PORT}${r.path}`, headers);
      if (res.statusCode < 200 || res.statusCode >= 400) {
        console.error(`  ✖ Page '${r.name}' (${r.path}) returned HTTP ${res.statusCode}`);
        pagesOk = false;
        continue;
      }

      // Extract referenced scripts and stylesheets
      const chunkMatches = res.body.match(/\/_next\/static\/(?:chunks|css)\/[a-zA-Z0-9_\.\-]+\.(?:js|css)/g) || [];
      for (const m of chunkMatches) {
        uniqueChunks.add(m);
      }
      console.log(`  ✔ [${res.statusCode}] ${r.name} (${r.path}) -> ${chunkMatches.length} asset references`);
    } catch (err) {
      console.error(`  ✖ Page '${r.name}' (${r.path}) failed: ${err.message}`);
      pagesOk = false;
    }
  }

  if (!pagesOk) {
    return { success: false, chunks: [] };
  }

  console.log(`\n▶ [Gate 4/4] Testing HTTP Status for All ${uniqueChunks.size} Unique Static Chunks...`);
  const failedChunks = [];

  for (const chunkPath of uniqueChunks) {
    try {
      // Test 1: Direct upstream Next.js process (Port 3000)
      const directRes = await fetchEndpoint(`http://${TARGET_HOST}:${TARGET_PORT}${chunkPath}`);
      if (directRes.statusCode !== 200) {
        failedChunks.push({ chunk: chunkPath, path: "Port 3000", status: directRes.statusCode });
        continue;
      }

      // Test 2: Ingress via Nginx HTTPS
      const nginxRes = await fetchEndpoint(`https://${TARGET_HOST}${chunkPath}`);
      if (nginxRes.statusCode !== 200) {
        failedChunks.push({ chunk: chunkPath, path: "Nginx HTTPS", status: nginxRes.statusCode });
      }
    } catch (err) {
      failedChunks.push({ chunk: chunkPath, error: err.message });
    }
  }

  if (failedChunks.length > 0) {
    console.error(`\n❌ RELEASE GATE FAILED: ${failedChunks.length} chunk(s) failed retrieval:`);
    for (const f of failedChunks) {
      console.error(`  - ${f.chunk} [${f.path || "Network"}]: HTTP ${f.status || f.error}`);
    }
    return { success: false, failedChunks };
  }

  console.log(`✔ [PASS] 100% of static chunks (${uniqueChunks.size}/${uniqueChunks.size}) returned HTTP 200 OK without errors\n`);
  return { success: true, count: uniqueChunks.size };
}

async function main() {
  console.log("==========================================================");
  console.log("  AYAAN CLOTHING — MANDATORY DEPLOYMENT RELEASE GATE      ");
  console.log("==========================================================");
  console.log(`Target: http://${TARGET_HOST}:${TARGET_PORT} (Host: ${HOSTNAME_HEADER})\n`);

  const pm2Ok = verifyPm2Processes();
  if (!pm2Ok) {
    console.error("\n❌ RELEASE GATE REJECTED: PM2 processes are not healthy.");
    process.exit(1);
  }

  const apiOk = await verifyBackendHealth();
  if (!apiOk) {
    console.error("\n❌ RELEASE GATE REJECTED: Backend API health check failed.");
    process.exit(1);
  }

  const assetsRes = await verifyPagesAndAssets();
  if (!assetsRes.success) {
    console.error("\n❌ RELEASE GATE REJECTED: Page or static asset inconsistencies detected.");
    process.exit(1);
  }

  console.log("==========================================================");
  console.log("🎉 ALL RELEASE GATES PASSED: DEPLOYMENT VERIFIED 100% OK");
  console.log("==========================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("Release gate runner crashed:", err);
  process.exit(1);
});
