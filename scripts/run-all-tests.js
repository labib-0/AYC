const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const testsDir = path.join(__dirname, "../tests");
const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith(".test.ts") || f.endsWith(".ts"));

console.log(`Discovered ${testFiles.length} test suites.`);

const results = {
  passed: [],
  failed: [],
  environmentBlocked: [],
};

for (const file of testFiles) {
  const filePath = path.join(testsDir, file);
  try {
    const out = execSync(`npx tsx "${filePath}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30000,
    });
    // Check if output contains explicit FAIL
    if (out.includes("❌ [FAIL]") || out.includes("✗ FAILED") || /FAIL:\s*[1-9]/.test(out)) {
      results.failed.push({ file, output: out.slice(0, 500) });
    } else {
      results.passed.push(file);
    }
  } catch (err) {
    const combinedOutput = ((err.stdout || "") + "\n" + (err.stderr || "") + "\n" + (err.message || "")).trim();
    if (
      combinedOutput.includes("ECONNREFUSED") ||
      combinedOutput.includes("fetch failed") ||
      combinedOutput.includes("Backend API connection") ||
      combinedOutput.includes("needs live backend") ||
      combinedOutput.includes("http://localhost:8000") ||
      combinedOutput.includes("http://127.0.0.1:8000")
    ) {
      results.environmentBlocked.push({ file, reason: "Backend server offline (ECONNREFUSED / fetch failed)", detail: combinedOutput.slice(0, 300) });
    } else {
      results.failed.push({ file, error: err.message, output: combinedOutput.slice(0, 500) });
    }
  }
}

console.log("\n================ TEST SUMMARY ================");
console.log(`Total: ${testFiles.length}`);
console.log(`Passed: ${results.passed.length}`);
console.log(`Failed: ${results.failed.length}`);
console.log(`Environment Blocked (Live Backend Required): ${results.environmentBlocked.length}`);

if (results.failed.length > 0) {
  console.log("\n--- FAILING SUITES ---");
  for (const f of results.failed) {
    console.log(`File: ${f.file}`);
    console.log(`Snippet: ${f.error || f.output}\n`);
  }
}

if (results.environmentBlocked.length > 0) {
  console.log("\n--- ENVIRONMENT BLOCKED SUITES ---");
  for (const b of results.environmentBlocked) {
    console.log(`File: ${b.file} -> ${b.reason}`);
  }
}
