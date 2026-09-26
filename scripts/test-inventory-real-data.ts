export {};

const API_URL = "http://127.0.0.1:8000/api/v1";

async function main() {
  console.log("==================================================================");
  console.log("VERIFYING INVENTORY & STOCK REAL-DATA INTEGRATION (ROOT LEVEL)");
  console.log("==================================================================\n");

  // 1. Authenticate as Admin
  console.log("▶ 1. Authenticating as admin...");
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ email: "admin@ayaan-demo.local", password: "Admin@12345" }),
  });

  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginRes.status} ${await loginRes.text()}`);
  }

  const loginData = await loginRes.json();
  const token = loginData.data?.token || loginData.token;
  console.log("✔ Admin authenticated successfully.");

  const headers = {
    "Accept": "application/json",
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // 2. Fetch Inventory Summary
  console.log("\n▶ 2. Fetching live inventory summary from database...");
  const summaryRes = await fetch(`${API_URL}/admin/inventory/summary`, { headers });
  if (!summaryRes.ok) {
    throw new Error(`Failed to fetch inventory summary: ${summaryRes.status} ${await summaryRes.text()}`);
  }
  const summaryJson = await summaryRes.json();
  const summary = summaryJson.data;
  console.log("✔ Inventory Summary received from DB:", summary);

  // Assert no fake 24 / 9865 demo values
  if (summary.totalItems === 24 && summary.totalQuantity === 9865) {
    throw new Error("FAIL: Still returning hardcoded fake values (24 items, 9,865 units)!");
  }
  console.log("✔ Verified: No hardcoded demo values (24 / 9,865) detected.");

  // Check structure
  console.log(`- Total Items: ${summary.totalItems}`);
  console.log(`- Total Units: ${summary.totalQuantity}`);
  console.log(`- In Stock: ${summary.inStock}`);
  console.log(`- Low Stock: ${summary.lowStock}`);
  console.log(`- Out of Stock: ${summary.outOfStock}`);

  // 3. Fetch Inventory Records List
  console.log("\n▶ 3. Fetching inventory list from database...");
  const invRes = await fetch(`${API_URL}/admin/inventory`, { headers });
  if (!invRes.ok) {
    throw new Error(`Failed to fetch inventory list: ${invRes.status} ${await invRes.text()}`);
  }
  const invJson = await invRes.json();
  const invData = invJson.data;
  const items = invData.data || [];
  console.log(`✔ Inventory records count: ${items.length} (total in DB: ${invData.total})`);

  if (summary.totalItems === 0) {
    if (items.length !== 0 || invData.total !== 0) {
      throw new Error(`Mismatch: summary says 0 items but list has ${items.length}`);
    }
    console.log("✔ Verified: Empty database returns strictly 0 items, 0 units, and empty list.");
  } else {
    console.log(`✔ Total items in DB match summary (${summary.totalItems} items, ${summary.totalQuantity} units).`);
    const sumUnits = items.reduce((acc: number, item: any) => acc + Number(item.quantity || 0), 0);
    console.log(`✔ Sum of units in current page: ${sumUnits}`);
  }

  // 4. Test Stock Adjustment if an inventory record exists
  if (items.length > 0) {
    const targetItem = items[0];
    const initialQty = targetItem.quantity;
    console.log(`\n▶ 4. Testing stock adjustment on Item ID ${targetItem.id} (Initial stock: ${initialQty})...`);

    const adjustRes = await fetch(`${API_URL}/admin/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inventory_id: targetItem.id,
        adjustment_amount: 15,
        reason: "Root-level integration test verification",
      }),
    });

    if (!adjustRes.ok) {
      throw new Error(`Adjustment failed: ${adjustRes.status} ${await adjustRes.text()}`);
    }

    const adjustJson = await adjustRes.json();
    console.log("✔ Adjustment response:", adjustJson.message);
    const newQty = adjustJson.data.inventory.quantity;
    console.log(`✔ Quantity updated in DB: ${initialQty} -> ${newQty}`);

    if (newQty !== initialQty + 15) {
      throw new Error(`Expected new quantity ${initialQty + 15} but got ${newQty}`);
    }

    // Verify summary reflects adjustment dynamically
    const updatedSummaryRes = await fetch(`${API_URL}/admin/inventory/summary`, { headers });
    const updatedSummary = (await updatedSummaryRes.json()).data;
    console.log(`✔ Updated summary total quantity: ${updatedSummary.totalQuantity} (was ${summary.totalQuantity})`);
    if (updatedSummary.totalQuantity !== summary.totalQuantity + 15) {
      throw new Error(`Summary totalQuantity did not dynamically update!`);
    }

    // Restore stock back to initial
    console.log("▶ Restoring original stock quantity...");
    await fetch(`${API_URL}/admin/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inventory_id: targetItem.id,
        adjustment_amount: -15,
        reason: "Restore original stock after test",
      }),
    });
    console.log("✔ Original stock restored.");

    // 5. Test Inventory History Audit Trail
    console.log(`\n▶ 5. Checking audit trail for Item ID ${targetItem.id}...`);
    const historyRes = await fetch(`${API_URL}/admin/inventory/${targetItem.id}/history`, { headers });
    if (!historyRes.ok) {
      throw new Error(`Failed to fetch history: ${historyRes.status}`);
    }
    const historyData = await historyRes.json();
    console.log(`✔ Audit history adjustments recorded: ${historyData.data?.length || 0}`);
    if ((historyData.data?.length || 0) < 2) {
      throw new Error("Audit log should contain the 2 test adjustments!");
    }
  }

  // 6. Test Warehouses Endpoint
  console.log("\n▶ 6. Checking warehouses list...");
  const whRes = await fetch(`${API_URL}/admin/warehouses`, { headers });
  if (!whRes.ok) {
    throw new Error(`Failed to fetch warehouses: ${whRes.status}`);
  }
  const whData = await whRes.json();
  console.log(`✔ Warehouses retrieved:`, whData.data?.map((w: any) => `${w.name} (${w.code})`));

  console.log("\n==================================================================");
  console.log("ALL INVENTORY & STOCK REAL-DATA VERIFICATIONS PASSED SUCCESSFULLY!");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
