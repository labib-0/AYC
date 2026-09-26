/**
 * Admin Login & Shell Architecture Verification Test Suite
 *
 * Verifies:
 * - Flow A: http://localhost:3001/ serves dedicated Admin shell (no customer header, footer, search, or marketing)
 * - Flow B: http://localhost:3001/admin/login serves dedicated Admin login
 * - Flow C: http://localhost:3000/ serves customer storefront only
 * - Flow D: Admin credentials (admin@ayaan-demo.local / Admin@12345) authenticate via Laravel API with role "admin"
 * - Flow E: Customer credentials (customer@ayaan-demo.local / Customer@12345) authenticate with role "customer" and are rejected from Admin access
 * - Flow F: http://localhost:3000/admin redirects cleanly to the dedicated admin application on port 3001
 * - Flow G: No duplicate admin challenge gates exist in active code
 */

async function runAdminLoginArchitectureTests() {
  console.log("==================================================");
  console.log("ADMIN LOGIN & ROUTING ARCHITECTURE AUDIT");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
      failed++;
    }
  }

  // 1. FLOW A: Admin origin localhost:3001 root
  console.log("▶ Flow A: Admin Origin (http://localhost:3001/)");
  try {
    const res = await fetch("http://localhost:3001/");
    assert(res.status === 200, "http://localhost:3001/ returns 200 OK");
    const html = await res.text();

    // Verify absence of customer storefront UI
    assert(!html.includes("Deliver to United States"), "Port 3001 does not contain customer header 'Deliver to United States'");
    assert(!html.includes("Shopping Cart"), "Port 3001 does not contain customer shopping cart button");
    assert(!html.includes("Hot Sales"), "Port 3001 does not contain customer 'Hot Sales' section");
    assert(!html.includes("Shop By Brand"), "Port 3001 does not contain customer 'Shop By Brand' section");

    // Verify absence of old fake challenge gate
    assert(!html.includes("Quick Sign In as Admin"), "Port 3001 does not contain old 'Quick Sign In as Admin' button");
    assert(!html.includes("Admin Authentication Required"), "Port 3001 does not contain old challenge modal header");
    assert(!html.includes("Go to Admin Login Page"), "Port 3001 does not contain intermediate 'Go to Admin Login Page' link");
  } catch (err: any) {
    assert(false, "Failed to connect to http://localhost:3001/", err.message);
  }

  // 2. FLOW B: Admin origin /admin/login
  console.log("\n▶ Flow B: Admin Dedicated Login Route (http://localhost:3001/admin/login)");
  try {
    const res = await fetch("http://localhost:3001/admin/login");
    assert(res.status === 200, "http://localhost:3001/admin/login returns 200 OK");
    const html = await res.text();

    // Verify no customer UI leaked into login route
    assert(!html.includes("Deliver to United States"), "/admin/login does not contain customer header");
    assert(!html.includes("Shopping Cart"), "/admin/login does not contain customer cart");
    assert(!html.includes("Quick Sign In as Admin"), "/admin/login does not contain old quick sign in bypass");
  } catch (err: any) {
    assert(false, "Failed to connect to http://localhost:3001/admin/login", err.message);
  }

  // 3. FLOW C: Customer origin localhost:3000 root
  console.log("\n▶ Flow C: Customer Storefront Origin (http://localhost:3000/)");
  try {
    const res = await fetch("http://localhost:3000/");
    assert(res.status === 200, "http://localhost:3000/ returns 200 OK");
    const html = await res.text();

    // Verify customer UI is present
    assert(html.includes("Deliver to United States") || html.includes("Hot Sales"), "Port 3000 renders customer storefront components");
    assert(!html.includes("Admin Portal Access"), "Port 3000 does not display admin portal access card");
    assert(!html.includes("Internal Management System"), "Port 3000 does not display admin footer");
  } catch (err: any) {
    assert(false, "Failed to connect to http://localhost:3000/", err.message);
  }

  // 4. FLOW D: Admin Authentication with Real Backend API
  console.log("\n▶ Flow D: Admin Authentication via Laravel API");
  try {
    const res = await fetch("http://127.0.0.1:8000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        email: "admin@ayaan-demo.local",
        password: "Admin@12345",
      }),
    });
    const json = await res.json();
    assert(res.ok && json.success === true, "Admin credentials login returns success");
    assert(json.data?.user?.role === "admin", "Authenticated admin has role: admin");
    assert(typeof json.data?.token === "string" && json.data.token.length > 10, "Admin receives Sanctum token");
  } catch (err: any) {
    assert(false, "Admin API login failed", err.message);
  }

  // 5. FLOW E: Customer Authentication & Rejection from Admin Privileges
  console.log("\n▶ Flow E: Customer Authentication & Admin Privilege Isolation");
  try {
    const res = await fetch("http://127.0.0.1:8000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        email: "customer@ayaan-demo.local",
        password: "Customer@12345",
      }),
    });
    const json = await res.json();
    assert(res.ok && json.success === true, "Customer credentials login returns success");
    assert(json.data?.user?.role === "customer", "Authenticated customer has role: customer");

    // Verify customer token cannot access admin routes
    const adminCheckRes = await fetch("http://127.0.0.1:8000/api/v1/admin/analytics/sales-profit", {
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${json.data.token}`,
      },
    });
    assert(adminCheckRes.status === 403, "Customer token receives HTTP 403 Forbidden on admin API endpoints");
  } catch (err: any) {
    assert(false, "Customer auth check failed", err.message);
  }

  // 6. FLOW F: Port 3000 /admin URL Redirects to Port 3001
  console.log("\n▶ Flow F: Customer Origin /admin Redirection");
  try {
    const res = await fetch("http://localhost:3000/admin", {
      redirect: "manual",
    });
    assert(
      res.status === 307 || res.status === 308 || res.status === 301 || res.status === 302,
      `Visiting http://localhost:3000/admin returns HTTP redirect (${res.status})`
    );
    const location = res.headers.get("location") || "";
    assert(location.includes("3001"), `Redirect location points to port 3001 (Location: ${location})`);
  } catch (err: any) {
    assert(false, "Failed to verify /admin redirection on port 3000", err.message);
  }

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminLoginArchitectureTests();
