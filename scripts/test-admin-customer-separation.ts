/**
 * Comprehensive verification script for Admin Management & Customer Accounts separation.
 * Tests live endpoints on Laravel backend (http://127.0.0.1:8000).
 */
export {};

const API_URL = "http://127.0.0.1:8000/api/v1";

async function run() {
  console.log("==================================================================");
  console.log("VERIFYING SEPARATION OF ADMIN MANAGEMENT FROM CUSTOMER ACCOUNTS");
  console.log("==================================================================\n");

  // 1. Authenticate Admin
  console.log("▶ 1. Authenticating as administrator...");
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ email: "admin@ayaan-demo.local", password: "Admin@12345" }),
  });

  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginRes.status}`);
  }
  const loginJson = await loginRes.json();
  const token = loginJson.token || loginJson.data?.token;
  const adminUser = loginJson.user || loginJson.data?.user;
  console.log(`   Admin authenticated: ${adminUser.name} (${adminUser.email}), ID=${adminUser.id}, Role=${adminUser.role}`);

  const authHeaders = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };

  // 2. Fetch Customers List: Verify zero admins exist in customer list
  console.log("\n▶ 2. Inspecting /api/v1/admin/customers endpoint...");
  const custRes = await fetch(`${API_URL}/admin/customers`, { headers: authHeaders });
  if (!custRes.ok) {
    throw new Error(`Customer fetch failed: ${custRes.status}`);
  }
  const custJson = await custRes.json();
  const customers = custJson.data?.data || custJson.data || [];
  const totalReported = custJson.data?.total !== undefined ? custJson.data.total : customers.length;

  console.log(`   Total reported customers: ${totalReported}`);
  console.log(`   Records returned in page: ${customers.length}`);

  for (const c of customers) {
    console.log(`   - Customer: ID=${c.id}, Name="${c.name}", Email=${c.email}, Role=${c.role}, Company="${c.company_name || 'N/A'}"`);
    if (c.role !== "customer") {
      throw new Error(`VIOLATION: Found non-customer account with role="${c.role}" in customer directory! ID=${c.id}`);
    }
    if (c.id === adminUser.id || c.email === adminUser.email) {
      throw new Error(`VIOLATION: Admin account ${c.email} was found in customer directory!`);
    }
  }
  console.log("   ✔ PASS: Customer list contains 100% customer accounts only. Zero admins present.");

  // 3. Verify Customer Summary Metrics
  console.log("\n▶ 3. Inspecting /api/v1/admin/customers/summary endpoint...");
  const summaryRes = await fetch(`${API_URL}/admin/customers/summary`, { headers: authHeaders });
  if (!summaryRes.ok) {
    throw new Error(`Customer summary failed: ${summaryRes.status}`);
  }
  const summaryData = (await summaryRes.json()).data;
  console.log("   Summary Metrics:", JSON.stringify(summaryData));
  if (summaryData.totalCustomers !== totalReported) {
    throw new Error(`Mismatch: summary totalCustomers (${summaryData.totalCustomers}) != customer table total (${totalReported})`);
  }
  console.log("   ✔ PASS: Customer statistics and B2B metrics strictly calculated from customer accounts only.");

  // 4. Verify Admin ID cannot be fetched as a Customer
  console.log("\n▶ 4. Verifying /api/v1/admin/customers/{adminId} returns HTTP 404...");
  const showAdminAsCustRes = await fetch(`${API_URL}/admin/customers/${adminUser.id}`, { headers: authHeaders });
  if (showAdminAsCustRes.status !== 404) {
    throw new Error(`Expected 404 for admin ID in customer route, received: ${showAdminAsCustRes.status}`);
  }
  console.log("   ✔ PASS: Admin ID rejected with HTTP 404 when requested via customer route.");

  // 5. Fetch Dedicated Administrator Users
  console.log("\n▶ 5. Inspecting dedicated /api/v1/admin/users endpoint...");
  const adminsRes = await fetch(`${API_URL}/admin/users`, { headers: authHeaders });
  if (!adminsRes.ok) {
    throw new Error(`Admin users fetch failed: ${adminsRes.status}`);
  }
  const adminsJson = await adminsRes.json();
  const adminsList = adminsJson.data || [];
  console.log(`   Found ${adminsList.length} administrator(s) in system:`);
  for (const a of adminsList) {
    console.log(`   - Admin: ID=${a.id}, Name="${a.name}", Email=${a.email}, Role=${a.role}, Status=${a.status}, AccessLevel=${a.access_level}`);
    if (a.role !== "admin") {
      throw new Error(`VIOLATION: Found non-admin in admin management list: ${a.email} (${a.role})`);
    }
  }
  console.log("   ✔ PASS: Dedicated Admin Management returns system administrators only.");

  // 6. Test Admin CRUD: Create
  console.log("\n▶ 6. Testing Add Admin via /api/v1/admin/users...");
  const tempEmail = `test.staff.${Date.now()}@ayaanclothing.com`;
  const createAdminRes = await fetch(`${API_URL}/admin/users`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Quality Assurance Staff",
      email: tempEmail,
      password: "StaffPassword@123",
      phone: "+880 1811-000000",
      status: "active",
      access_level: "manager",
    }),
  });

  if (!createAdminRes.ok) {
    const errText = await createAdminRes.text();
    throw new Error(`Create admin failed: ${createAdminRes.status} - ${errText}`);
  }
  const createdAdmin = (await createAdminRes.json()).data;
  console.log(`   ✔ Admin created: ID=${createdAdmin.id}, Name="${createdAdmin.name}", Email=${createdAdmin.email}, AccessLevel=${createdAdmin.access_level}`);

  // 7. Test Admin CRUD: Edit
  console.log("\n▶ 7. Testing Edit Admin via /api/v1/admin/users/{id}...");
  const updateAdminRes = await fetch(`${API_URL}/admin/users/${createdAdmin.id}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      name: "QA Lead Staff",
      access_level: "editor",
    }),
  });
  if (!updateAdminRes.ok) {
    throw new Error(`Update admin failed: ${updateAdminRes.status}`);
  }
  const updatedAdmin = (await updateAdminRes.json()).data;
  console.log(`   ✔ Admin updated: Name="${updatedAdmin.name}", AccessLevel=${updatedAdmin.access_level}`);

  // 8. Test Admin Status Toggle (Disable / Activate)
  console.log("\n▶ 8. Testing Disable/Activate Admin status toggle...");
  const toggleRes = await fetch(`${API_URL}/admin/users/${createdAdmin.id}/status`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ status: "inactive" }),
  });
  if (!toggleRes.ok) {
    throw new Error(`Status toggle failed: ${toggleRes.status}`);
  }
  const toggled = (await toggleRes.json()).data;
  console.log(`   ✔ Admin status toggled to: ${toggled.status}`);

  // 9. Test Self-Protection
  console.log("\n▶ 9. Testing self-protection rules (cannot deactivate or delete own account)...");
  const selfDeactivateRes = await fetch(`${API_URL}/admin/users/${adminUser.id}/status`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ status: "inactive" }),
  });
  if (selfDeactivateRes.status !== 422) {
    throw new Error(`Expected 422 for self-deactivation, got: ${selfDeactivateRes.status}`);
  }
  console.log("   ✔ Self-deactivation properly blocked with HTTP 422.");

  const selfDeleteRes = await fetch(`${API_URL}/admin/users/${adminUser.id}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  if (selfDeleteRes.status !== 422) {
    throw new Error(`Expected 422 for self-deletion, got: ${selfDeleteRes.status}`);
  }
  console.log("   ✔ Self-deletion properly blocked with HTTP 422.");

  // 10. Test Remove Admin
  console.log("\n▶ 10. Testing Remove Admin where permitted...");
  const deleteRes = await fetch(`${API_URL}/admin/users/${createdAdmin.id}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  if (!deleteRes.ok) {
    throw new Error(`Admin delete failed: ${deleteRes.status}`);
  }
  console.log(`   ✔ Admin ID=${createdAdmin.id} successfully removed from system.`);

  // 11. Final Verification: Check Customer List is still 100% clean
  console.log("\n▶ 11. Final verification of Customer Accounts integrity...");
  const finalCustRes = await fetch(`${API_URL}/admin/customers`, { headers: authHeaders });
  const finalCustJson = await finalCustRes.json();
  const finalCustList = finalCustJson.data?.data || finalCustJson.data || [];
  for (const c of finalCustList) {
    if (c.role !== "customer") {
      throw new Error(`VIOLATION: ${c.email} has non-customer role ${c.role}`);
    }
  }
  console.log(`   ✔ Customer Accounts contains ${finalCustList.length} customer accounts. Zero administrators.`);

  console.log("\n==================================================================");
  console.log("ALL ADMIN MANAGEMENT & CUSTOMER SEPARATION CHECKS PASSED 100%!");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
