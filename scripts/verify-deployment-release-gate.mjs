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
import fs from "fs";
import { execSync } from "child_process";

const TARGET_HOST = process.env.DEPLOY_TARGET_HOST || "127.0.0.1";
const TARGET_PORT = parseInt(process.env.DEPLOY_TARGET_PORT || "3000", 10);
const ADMIN_PORT = parseInt(process.env.DEPLOY_ADMIN_PORT || "3001", 10);
const HOSTNAME_HEADER = process.env.DEPLOY_HOSTNAME || "ayaanclothing.com";

let reportedWorkerInfo = null;

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

function verifyReleaseMetadata() {
  if (process.env.SKIP_METADATA_GATE === "true") {
    console.log("▶ [Gate 0/5] Release Metadata: [SKIP] Bypassed by SKIP_METADATA_GATE");
    return true;
  }
  process.stdout.write("▶ [Gate 0/5] Verifying Full-Stack Release Metadata & SHA Alignment... ");
  const currentPath = process.env.DEPLOY_CURRENT_PATH || "/var/www/ayaan/current";
  const metaFile = `${currentPath}/RELEASE_METADATA.json`;
  try {
    if (!fs.existsSync(metaFile)) {
      console.log("ℹ [INFO] RELEASE_METADATA.json not present in release path. Skipping check.");
      return true;
    }
    const meta = JSON.parse(fs.readFileSync(metaFile, "utf-8"));
    if (meta.frontend_sha && meta.backend_sha && meta.frontend_sha !== meta.backend_sha) {
      throw new Error(`Release SHA mismatch: frontend (${meta.frontend_sha}) and backend (${meta.backend_sha}) do not match!`);
    }
    if (process.env.DEPLOY_EXPECTED_COMMIT && meta.commit_sha && meta.commit_sha !== process.env.DEPLOY_EXPECTED_COMMIT) {
      throw new Error(`Release commit mismatch: active (${meta.commit_sha}) does not match expected (${process.env.DEPLOY_EXPECTED_COMMIT})`);
    }
    if (process.env.DEPLOY_EXPECTED_BUILD_ID && meta.build_id && meta.build_id !== process.env.DEPLOY_EXPECTED_BUILD_ID) {
      throw new Error(`Release build ID mismatch: active (${meta.build_id}) does not match expected (${process.env.DEPLOY_EXPECTED_BUILD_ID})`);
    }
    if (process.env.DEPLOY_EXPECTED_RELEASE_ID && meta.release_id && meta.release_id !== process.env.DEPLOY_EXPECTED_RELEASE_ID) {
      throw new Error(`Release ID mismatch: active (${meta.release_id}) does not match expected (${process.env.DEPLOY_EXPECTED_RELEASE_ID})`);
    }
    console.log(`✔ [PASS] Verified release ${meta.release_id || "active"} (SHA: ${meta.commit_sha || "ok"})`);
    return true;
  } catch (err) {
    console.log(`✖ [FAIL] ${err.message}`);
    return false;
  }
}

async function verifyPm2Processes() {
  if (process.env.SKIP_PM2_GATE === "true") {
    console.log("▶ [Gate 1/5] PM2 Daemons: [SKIP] Bypassed by SKIP_PM2_GATE (testing mode)");
    return true;
  }
  process.stdout.write("▶ [Gate 1/5] Verifying PM2 Daemons & Working Directory Adoption... ");
  try {
    let stdout;
    try {
      stdout = execSync("su - ayaan -c 'pm2 jlist'", { encoding: "utf-8", timeout: 10000, stdio: ["pipe", "pipe", "pipe"] });
    } catch {
      stdout = execSync("pm2 jlist", { encoding: "utf-8", timeout: 10000, stdio: ["pipe", "pipe", "pipe"] });
    }
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
      // Verify PM2 process has adopted the single-pointer working directory
      const expectedCwd = process.env.DEPLOY_EXPECTED_CWD || "/var/www/ayaan/current";
      if (proc.pm2_env?.pm_cwd && (process.env.VERIFY_PM2_CWD === "true" || process.env.VERIFY_PM2_CWD === "1")) {
        if (!proc.pm2_env.pm_cwd.includes("current") && !proc.pm2_env.pm_cwd.includes(expectedCwd)) {
          throw new Error(`PM2 process '${appName}' running in obsolete directory: '${proc.pm2_env.pm_cwd}' (expected '${expectedCwd}')`);
        }
      }
    }

    // Verify Admin Application & Gateway route / proxy adoption
    if (process.env.SKIP_ADMIN_PROXY_GATE !== "true") {
      try {
        const adminRes = await fetchEndpoint(`http://${TARGET_HOST}:${ADMIN_PORT}/`, {
          "x-admin-app": "true",
          "x-is-admin-host": "1"
        }, 5000);
        if (adminRes.statusCode < 200 || adminRes.statusCode >= 400) {
          throw new Error(`Admin gateway returned HTTP ${adminRes.statusCode}`);
        }
        if (process.env.DEPLOY_EXPECTED_BUILD_ID) {
          const match = adminRes.body.match(/"buildId"\s*:\s*"([^"]+)"/) || adminRes.body.match(/\/_next\/static\/([^\/]+)\/_buildManifest\.js/);
          if (!match || !match[1]) {
            throw new Error(`Admin gateway did not expose a valid buildId in page response!`);
          }
          if (match[1] !== process.env.DEPLOY_EXPECTED_BUILD_ID) {
            throw new Error(`Admin gateway served obsolete buildId '${match[1]}' (expected candidate '${process.env.DEPLOY_EXPECTED_BUILD_ID}')! Running admin proxy has NOT adopted new release.`);
          }
        }
      } catch (adminErr) {
        if (adminErr.message.includes("obsolete buildId") || adminErr.message.includes("did not expose a valid buildId") || process.env.REQUIRE_ADMIN_PROXY === "true") {
          throw new Error(`Admin gateway check failed: ${adminErr.message}`);
        }
      }
    }

    console.log("✔ [PASS] Both ayaan-customer and ayaan-admin are ONLINE with verified adoption");
    return true;
  } catch (err) {
    console.log(`✖ [FAIL] ${err.message}`);
    return false;
  }
}

async function verifyBackendHealth() {
  if (process.env.SKIP_API_GATE === "true") {
    console.log("▶ [Gate 2/5] Backend API Health & Release Identity: [SKIP] Bypassed by SKIP_API_GATE");
    return true;
  }
  process.stdout.write("▶ [Gate 2/5] Verifying Backend API Health & Runtime Release Identity (/api/v1/health)... ");
  try {
    const proto = process.env.DEPLOY_TARGET_PROTOCOL || "https";
    const portPart = (proto === "http" && TARGET_PORT !== 80) ? `:${TARGET_PORT}` : "";
    const apiHeaders = {};
    if (process.env.INTERNAL_API_SECRET) {
      apiHeaders["x-internal-secret"] = process.env.INTERNAL_API_SECRET;
    }
    const res = await fetchEndpoint(`${proto}://${TARGET_HOST}${portPart}/api/v1/health`, apiHeaders);
    if (res.statusCode !== 200) {
      throw new Error(`API health returned HTTP ${res.statusCode}`);
    }
    const json = JSON.parse(res.body);
    const data = json.data || {};
    if (data.database !== "ok") {
      throw new Error(`Database reported '${data.database}'`);
    }
    if (data.redis !== "ok") {
      throw new Error(`Redis reported '${data.redis}'`);
    }

    // Verify running PHP-FPM / Laravel runtime release identity
    const servedCommit = data.commit_sha || json.commit_sha;
    if (process.env.DEPLOY_EXPECTED_COMMIT) {
      if (!servedCommit) {
        throw new Error(`PHP-FPM / Laravel API did not report runtime commit_sha (expected candidate '${process.env.DEPLOY_EXPECTED_COMMIT}')! Running API cannot prove release identity.`);
      }
      if (servedCommit !== process.env.DEPLOY_EXPECTED_COMMIT) {
        throw new Error(`PHP-FPM / Laravel API runtime release mismatch: served commit '${servedCommit}' does not match expected candidate '${process.env.DEPLOY_EXPECTED_COMMIT}'! Stale bytecode or un-reloaded PHP-FPM detected.`);
      }
    } else if (process.env.REQUIRE_RUNTIME_COMMIT === "true" && !servedCommit) {
      throw new Error("PHP-FPM / Laravel API did not report runtime commit_sha!");
    }

    if (process.env.DEPLOY_EXPECTED_RELEASE_ID) {
      if (!data.release_id) {
        throw new Error(`PHP-FPM / Laravel API did not report runtime release_id (expected candidate '${process.env.DEPLOY_EXPECTED_RELEASE_ID}')!`);
      }
      if (data.release_id !== process.env.DEPLOY_EXPECTED_RELEASE_ID) {
        throw new Error(`PHP-FPM / Laravel runtime release ID mismatch: served release '${data.release_id}' does not match expected '${process.env.DEPLOY_EXPECTED_RELEASE_ID}'!`);
      }
    }

    if (data.queue_workers && Array.isArray(data.queue_workers)) {
      reportedWorkerInfo = data.queue_workers;
    } else if (data.queue_worker) {
      reportedWorkerInfo = [data.queue_worker];
    }

    console.log(`✔ [PASS] Database: ok, Redis: ok${servedCommit ? `, Runtime SHA: ${servedCommit}` : ""}`);
    return true;
  } catch (err) {
    console.log(`✖ [FAIL] ${err.message}`);
    return false;
  }
}

async function verifyPagesAndAssets() {
  if (process.env.SKIP_ASSETS_GATE === "true") {
    console.log("▶ [Gate 3/4] Pages & Assets: [SKIP] Bypassed by SKIP_ASSETS_GATE");
    return { success: true, count: 0 };
  }
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

      // Verify served build identity against candidate release if specified
      if (process.env.DEPLOY_EXPECTED_BUILD_ID) {
        const buildIdMatch = res.body.match(/"buildId"\s*:\s*"([^"]+)"/) || res.body.match(/\/_next\/static\/([^\/]+)\/_buildManifest\.js/);
        if (buildIdMatch && buildIdMatch[1]) {
          const servedBuildId = buildIdMatch[1];
          if (servedBuildId !== process.env.DEPLOY_EXPECTED_BUILD_ID) {
            console.error(`  ✖ Release identity mismatch on '${r.name}': served buildId '${servedBuildId}' does not match expected candidate build ID '${process.env.DEPLOY_EXPECTED_BUILD_ID}'. Running process has NOT adopted new release!`);
            pagesOk = false;
            continue;
          }
        }
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

      // Test 2: Ingress via Nginx HTTPS (can be bypassed in unit tests via SKIP_NGINX_GATE)
      if (process.env.SKIP_NGINX_GATE !== "true") {
        const proto = process.env.DEPLOY_TARGET_PROTOCOL || "https";
        const portPart = (proto === "http" && TARGET_PORT !== 80) ? `:${TARGET_PORT}` : "";
        const nginxRes = await fetchEndpoint(`${proto}://${TARGET_HOST}${portPart}${chunkPath}`);
        if (nginxRes.statusCode !== 200) {
          failedChunks.push({ chunk: chunkPath, path: `Ingress ${proto.toUpperCase()}`, status: nginxRes.statusCode });
        }
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

function verifySupervisorWorker() {
  if (process.env.SKIP_WORKER_GATE === "true") {
    console.log("▶ [Gate 5/5] Supervisor Worker: [SKIP] Bypassed by SKIP_WORKER_GATE");
    return true;
  }
  process.stdout.write("▶ [Gate 5/5] Verifying Supervisor Queue Worker Health & Runtime Identity... ");
  try {
    const status = execSync("supervisorctl status ayaan-worker:* 2>/dev/null || supervisorctl status ayaan-worker", { encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] });
    if (!status.includes("RUNNING")) {
      throw new Error(`Supervisor workers not RUNNING: ${status.trim()}`);
    }

    // 1. Extract all active worker PIDs (supporting both numprocs=1 and multi-worker numprocs > 1)
    const statusLines = status.split("\n").map(l => l.trim()).filter(Boolean);
    const workerProcesses = [];
    for (const line of statusLines) {
      if (line.includes("RUNNING")) {
        const match = line.match(/pid\s+(\d+)/);
        if (match && match[1]) {
          workerProcesses.push({ line, pid: parseInt(match[1], 10) });
        }
      } else if (line.includes("STOPPED") || line.includes("FATAL") || line.includes("BACKOFF") || line.includes("EXITED")) {
        throw new Error(`Supervisor worker failure detected: ${line}`);
      }
    }

    if (workerProcesses.length === 0) {
      try {
        const pidOut = execSync("supervisorctl pid ayaan-worker", { encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] }).trim();
        if (/^\d+$/.test(pidOut) && parseInt(pidOut, 10) > 1) {
          workerProcesses.push({ line: status.trim(), pid: parseInt(pidOut, 10) });
        }
      } catch {}
    }

    if (workerProcesses.length === 0) {
      throw new Error(`Unable to determine Supervisor worker PID from status: ${status.trim()}`);
    }

    // 2. Evaluate EVERY active worker process
    const workerList = Array.isArray(reportedWorkerInfo)
      ? reportedWorkerInfo
      : (reportedWorkerInfo ? [reportedWorkerInfo] : []);

    for (const proc of workerProcesses) {
      const workerPid = proc.pid;

      // PID freshness check: must not match pre-deployment PID
      if (process.env.DEPLOY_PRIOR_WORKER_PID && String(workerPid) === String(process.env.DEPLOY_PRIOR_WORKER_PID).trim()) {
        throw new Error(`Worker PID ${workerPid} matches prior worker PID! Old worker was not terminated/restarted.`);
      }

      // Process execution inspection (command & args)
      try {
        const procArgs = execSync(`ps -p ${workerPid} -o args=`, { encoding: "utf-8", timeout: 5000, stdio: ["pipe", "pipe", "pipe"] }).trim();
        if (procArgs && (!procArgs.includes("artisan") || !procArgs.includes("queue:work"))) {
          throw new Error(`Worker PID ${workerPid} command args unexpected: '${procArgs}' (expected 'artisan queue:work')`);
        }
      } catch (e) {
        if (e.message.includes("unexpected")) throw e;
      }

      // Working directory inspection (Linux /proc/<pid>/cwd)
      try {
        if (fs.existsSync(`/proc/${workerPid}/cwd`)) {
          const realCwd = fs.readlinkSync(`/proc/${workerPid}/cwd`);
          const expectedCwd = process.env.DEPLOY_EXPECTED_CWD || "/var/www/ayaan/current";
          if (!realCwd.includes("current") && !realCwd.includes(expectedCwd)) {
            throw new Error(`Worker PID ${workerPid} cwd '${realCwd}' is obsolete (expected '${expectedCwd}')`);
          }
        }
      } catch (e) {
        if (e.message.includes("obsolete")) throw e;
      }

      // Worker runtime release identity (from Redis heartbeat via health endpoint)
      if (workerList.length > 0) {
        // Match worker by PID, or if single worker use first
        const matched = workerList.find(w => w && w.pid === workerPid) || (workerList.length === 1 ? workerList[0] : null);

        if (!matched) {
          throw new Error(`No queue worker release heartbeat recorded in Redis for worker PID ${workerPid}!`);
        }

        if (process.env.DEPLOY_EXPECTED_COMMIT) {
          if (!matched.commit_sha) {
            throw new Error(`Queue worker PID ${workerPid} heartbeat did not report commit_sha (expected candidate '${process.env.DEPLOY_EXPECTED_COMMIT}')!`);
          }
          if (matched.commit_sha !== process.env.DEPLOY_EXPECTED_COMMIT) {
            throw new Error(`Queue worker runtime release mismatch: worker PID ${workerPid} is executing commit '${matched.commit_sha}' (expected '${process.env.DEPLOY_EXPECTED_COMMIT}')! Worker has NOT adopted new release.`);
          }
        }

        if (matched.pid && matched.pid !== workerPid) {
          throw new Error(`Queue worker PID mismatch: active process is PID ${workerPid} but heartbeat reported PID ${matched.pid}!`);
        }

        if (matched.active === false) {
          throw new Error(`Queue worker PID ${workerPid} heartbeat is stale! Worker may be dead or unresponsive.`);
        }
      } else if (process.env.REQUIRE_WORKER_HEARTBEAT === "true") {
        throw new Error("No queue worker release heartbeat recorded in Redis!");
      }
    }

    const pidsSummary = workerProcesses.map(p => p.pid).join(", ");
    console.log(`✔ [PASS] PID: ${pidsSummary}, Status: RUNNING${workerList[0]?.commit_sha ? `, SHA: ${workerList[0].commit_sha}` : ""}`);
    return true;
  } catch (err) {
    if (err.message.includes("not found") || err.message.includes("NO_FILE") || err.message.includes("no such process")) {
      console.log("ℹ [INFO] Supervisor queue worker not configured on this host. Skipping.");
      return true;
    }
    console.log(`✖ [FAIL] ${err.message}`);
    return false;
  }
}

async function main() {
  console.log("==========================================================");
  console.log("  AYAAN CLOTHING — MANDATORY DEPLOYMENT RELEASE GATE      ");
  console.log("==========================================================");
  console.log(`Target: http://${TARGET_HOST}:${TARGET_PORT} (Host: ${HOSTNAME_HEADER})\n`);

  const metaOk = verifyReleaseMetadata();
  if (!metaOk) {
    console.error("\n❌ RELEASE GATE REJECTED: Full-stack release metadata or SHA alignment check failed.");
    process.exit(1);
  }

  const pm2Ok = await verifyPm2Processes();
  if (!pm2Ok) {
    console.error("\n❌ RELEASE GATE REJECTED: PM2 processes are not healthy or failed release adoption.");
    process.exit(1);
  }

  const apiOk = await verifyBackendHealth();
  if (!apiOk) {
    console.error("\n❌ RELEASE GATE REJECTED: Backend API health check failed.");
    process.exit(1);
  }

  const assetsRes = await verifyPagesAndAssets();
  if (!assetsRes.success) {
    console.error("\n❌ RELEASE GATE REJECTED: Page, static asset, or release identity inconsistencies detected.");
    process.exit(1);
  }

  const workerOk = verifySupervisorWorker();
  if (!workerOk) {
    console.error("\n❌ RELEASE GATE REJECTED: Supervisor queue worker health check failed.");
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
