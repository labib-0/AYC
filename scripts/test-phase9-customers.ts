import { adminCustomerService } from "../src/services/admin/customer.service";
import { mockStore } from "../src/lib/mock-data/mock-store";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runPhase9StaticValidation() {
  console.log("============================================================");
  console.log("PHASE 9 — CUSTOMER / COMPANY MANAGEMENT STATIC VALIDATION");
  console.log("============================================================");

  // 1. Initial State & Pagination Verification
  console.log("\n--- 1. Customer List & Pagination Tests ---");
  const page1 = await adminCustomerService.getCustomers({ page: 1, per_page: 20 });
  assert(page1.data.length === 20, `Page 1 returns 20 customers (received ${page1.data.length})`);
  assert(page1.total >= 25, `Total non-admin customers >= 25 (found ${page1.total})`);
  assert(page1.current_page === 1, "Current page is 1");
  assert(page1.last_page === 2, "Last page is 2 for 25 customers with 20/page");

  const page2 = await adminCustomerService.getCustomers({ page: 2, per_page: 20 });
  assert(page2.data.length >= 5, `Page 2 returns remaining customers (received ${page2.data.length})`);
  assert(page2.current_page === 2, "Current page is 2");
  assert(page1.data[0].id !== page2.data[0].id, "Page 1 and Page 2 customers are distinct");

  // 2. Summary KPI Metrics
  console.log("\n--- 2. Customer Summary KPI Metrics Tests ---");
  const summary = await adminCustomerService.getCustomerSummary();
  assert(summary.totalCustomers === page1.total, `Summary total customers matches store total (${summary.totalCustomers})`);
  assert(summary.b2bAccounts > 0, `B2B accounts count: ${summary.b2bAccounts}`);
  assert(summary.approvedB2b > 0, `Approved B2B accounts count: ${summary.approvedB2b}`);
  assert(summary.pendingB2b > 0, `Pending review accounts count: ${summary.pendingB2b}`);

  // 3. Multi-Field Filter Tests
  console.log("\n--- 3. Multi-Field Filter Tests ---");
  // Filter by role: corporate (accounts with registered company)
  const corporateOnly = await adminCustomerService.getCustomers({ role: "corporate" });
  assert(
    corporateOnly.data.every((c) => Boolean(c.company_name)),
    "Filter 'corporate' returns accounts with registered company names"
  );

  // Filter by role: customer
  const retailOnly = await adminCustomerService.getCustomers({ role: "customer" });
  assert(
    retailOnly.data.every((c) => c.role === "customer"),
    "Role filter 'customer' returns only retail accounts"
  );

  // Filter by B2B approval status: approved
  const approvedFilter = await adminCustomerService.getCustomers({ b2b_approval_status: "approved" });
  assert(
    approvedFilter.data.every((c) => c.b2b_approval_status === "approved"),
    "B2B status filter 'approved' matches all returned items"
  );

  // Filter by B2B approval status: pending
  const pendingFilter = await adminCustomerService.getCustomers({ b2b_approval_status: "pending" });
  assert(
    pendingFilter.data.every((c) => c.b2b_approval_status === "pending"),
    "B2B status filter 'pending' matches all returned items"
  );

  // Filter by B2B approval status: rejected
  const rejectedFilter = await adminCustomerService.getCustomers({ b2b_approval_status: "rejected" });
  assert(
    rejectedFilter.data.every((c) => c.b2b_approval_status === "rejected"),
    "B2B status filter 'rejected' matches all returned items"
  );

  // 4. Search Functionality Tests
  console.log("\n--- 4. Search Functionality Tests ---");
  const sampleCust = page1.data[0];

  // Search by name
  const searchByName = await adminCustomerService.getCustomers({ search: sampleCust.name });
  assert(
    searchByName.data.some((c) => c.name.toLowerCase().includes(sampleCust.name.toLowerCase())),
    `Found customer by name (${sampleCust.name})`
  );

  // Search by email
  const searchByEmail = await adminCustomerService.getCustomers({ search: sampleCust.email });
  assert(
    searchByEmail.data.some((c) => c.email.toLowerCase().includes(sampleCust.email.toLowerCase())),
    `Found customer by email (${sampleCust.email})`
  );

  // Search by company
  if (sampleCust.company_name) {
    const searchByCompany = await adminCustomerService.getCustomers({ search: sampleCust.company_name });
    assert(
      searchByCompany.data.some((c) => c.company_name === sampleCust.company_name),
      `Found customer by company (${sampleCust.company_name})`
    );
  }

  // 5. Dynamic Spend and Order Counts
  console.log("\n--- 5. Dynamic Spend & Order Calculation Tests ---");
  // Find customer 102 (Marcus Vance)
  const vance = page1.data.find((c) => c.id === 102);
  assert(Boolean(vance), "Customer 102 (Marcus Vance) exists in directory");
  if (vance) {
    assert(vance.orders_count > 0, `Customer orders count derived from orders: ${vance.orders_count}`);
    assert(vance.total_spent > 0, `Customer total spent derived from paid orders: $${vance.total_spent}`);
  }

  // 6. Customer Detail Route Tests
  console.log("\n--- 6. Customer Detail Route Tests ---");
  const detail = await adminCustomerService.getCustomerById(102);
  assert(detail.id === 102, "getCustomerById retrieves correct customer by ID");
  assert(detail.name === "Marcus Vance", "Detail contains customer name");
  assert(detail.email === "buyer@ayaanclothing.com", "Detail contains email");
  assert(Boolean(detail.company_name), `Detail contains company: ${detail.company_name}`);
  assert(Array.isArray(detail.addresses) && detail.addresses.length > 0, `Detail includes saved addresses (found ${detail.addresses?.length || 0})`);
  assert(Array.isArray(detail.recent_orders) && detail.recent_orders.length > 0, `Detail includes recent orders (found ${detail.recent_orders?.length || 0})`);
  assert(Boolean(detail.recent_orders?.[0]?.order_number), `Recent order contains order number: ${detail.recent_orders?.[0]?.order_number}`);

  // Test not-found error
  let notFoundCaught = false;
  try {
    await adminCustomerService.getCustomerById(999999);
  } catch {
    notFoundCaught = true;
  }
  assert(notFoundCaught, "getCustomerById correctly throws for non-existent customer ID");

  // 7. B2B Configuration Mutation & Persistence
  console.log("\n--- 7. B2B Configuration Mutation & Persistence Tests ---");
  const updatedB2B = await adminCustomerService.updateCustomer(102, {
    b2b_approval_status: "approved",
    b2b_payment_terms: "net_60",
    b2b_credit_limit: 85000,
    tax_id: "GB987654321-REV",
  });
  assert(updatedB2B.b2b_payment_terms === "net_60", "Payment terms updated to net_60");
  assert(updatedB2B.b2b_credit_limit === 85000, "Credit limit updated to 85000");
  assert(updatedB2B.tax_id === "GB987654321-REV", "Tax ID updated");

  // Verify persistence in mockStore
  const userInStore = mockStore.getUserById(102);
  assert(userInStore?.b2b_payment_terms === "net_60", "Changes persisted in mockStore");
  assert(userInStore?.b2b_credit_limit === 85000, "Credit limit persisted in mockStore");
  assert(userInStore?.tax_id === "GB987654321-REV", "Tax ID persisted in mockStore");

  // 8. Role Change Mutation & Persistence
  console.log("\n--- 8. Role Change Mutation & Persistence Tests ---");
  const updatedRole = await adminCustomerService.updateCustomer(101, {
    role: "sales",
  });
  assert(updatedRole.role === "sales", "Customer 101 role changed to 'sales'");
  const user101InStore = mockStore.getUserById(101);
  assert(user101InStore?.role === "sales", "Role change persisted in mockStore");

  // Restore 101 for idempotency
  await adminCustomerService.updateCustomer(101, { role: "customer" });

  console.log("\n============================================================");
  console.log("ALL PHASE 9 STATIC & CODE-LEVEL VALIDATION TESTS PASSED! 🎉");
  console.log("============================================================");
}

runPhase9StaticValidation().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
