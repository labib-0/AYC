/**
 * End-to-End Manual Package Assortment Management Test
 * Verifies all 22 test cases specified by user prompt.
 */

const API_BASE = "http://127.0.0.1:8000/api/v1";

async function run() {
  console.log("==================================================");
  console.log("MANUAL PACKAGE ASSORTMENT MANAGEMENT TEST AUDIT");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Authenticate as Admin
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ayaan-demo.local", password: "Admin@12345" }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token || loginData.token;
  assert(Boolean(token), "Admin authenticated successfully");

  const authHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  const testSlug = `test-manual-pack-${Date.now()}`;

  // ==================================================
  // TEST 1-5: Create product with 2 colors x 4 sizes & manual assortment
  // ==================================================
  const createPayload = {
    name: "Luxury Merino Crewneck Assortment Test",
    slug: testSlug,
    sku: `AYN-PKT-${Date.now().toString().slice(-4)}`,
    wholesale_price: 32.0,
    bulk_threshold: 100,
    bulk_price: 26.0,
    moq: 20,
    status: "published",
    colors: ["Black", "White"],
    sizes: ["S", "M", "L", "XL"],
    variants: [
      { color: "Black", size: "S", stock: 100 },
      { color: "Black", size: "M", stock: 120 },
      { color: "Black", size: "L", stock: 120 },
      { color: "Black", size: "XL", stock: 80 },
      { color: "White", size: "S", stock: 60 },
      { color: "White", size: "M", stock: 90 },
      { color: "White", size: "L", stock: 90 },
      { color: "White", size: "XL", stock: 50 },
    ],
    // Manually configured values:
    // Black: S=2, M=4, L=4, XL=2 (Total = 12)
    // White: S=1, M=3, L=3, XL=1 (Total = 8)
    // Grand Total = 20 pcs
    package_allocations: [
      { package_name: "Pack A", color: "Black", size: "S", quantity: 2 },
      { package_name: "Pack A", color: "Black", size: "M", quantity: 4 },
      { package_name: "Pack A", color: "Black", size: "L", quantity: 4 },
      { package_name: "Pack A", color: "Black", size: "XL", quantity: 2 },
      { package_name: "Pack A", color: "White", size: "S", quantity: 1 },
      { package_name: "Pack A", color: "White", size: "M", quantity: 3 },
      { package_name: "Pack A", color: "White", size: "L", quantity: 3 },
      { package_name: "Pack A", color: "White", size: "XL", quantity: 1 },
    ],
  };

  const createRes = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(createPayload),
  });
  const createData = await createRes.json();
  assert(createRes.status === 201 && Boolean(createData.data?.id), "Product created with manual package assortment (201 Created)");
  const productId = createData.data?.id;

  // Reload product from backend API
  const getRes = await fetch(`${API_BASE}/products/${productId}`, { headers: authHeaders });
  const getData = await getRes.json();
  const loadedAllocations = getData.data?.package_allocations || [];

  assert(loadedAllocations.length === 8, `Loaded exact 8 allocation rows from backend API (found: ${loadedAllocations.length})`);

  const blkS = loadedAllocations.find((a: any) => a.color === "Black" && a.size === "S");
  const blkM = loadedAllocations.find((a: any) => a.color === "Black" && a.size === "M");
  const whtL = loadedAllocations.find((a: any) => a.color === "White" && a.size === "L");

  assert(blkS?.quantity === 2 && blkS?.package_name === "Pack A", "Black / S quantity exactly preserved as 2 (Pack A)");
  assert(blkM?.quantity === 4, "Black / M quantity exactly preserved as 4");
  assert(whtL?.quantity === 3, "White / L quantity exactly preserved as 3");

  // Verify it is NOT derived from inventory (Stock for Black S was 100, M was 120; assortment is 2, 4)
  assert(
    blkS?.quantity !== 100 && blkM?.quantity !== 120,
    "Assortment is strictly decoupled from variant inventory counts"
  );

  // ==================================================
  // TEST 7-11: Edit assortment after publishing & verify single cell update
  // ==================================================
  const updatedAllocations = [
    { package_name: "Pack A", color: "Black", size: "S", quantity: 2 },
    { package_name: "Pack A", color: "Black", size: "M", quantity: 6 }, // 4 -> 6
    { package_name: "Pack A", color: "Black", size: "L", quantity: 4 },
    { package_name: "Pack A", color: "Black", size: "XL", quantity: 2 },
    { package_name: "Pack A", color: "White", size: "S", quantity: 1 },
    { package_name: "Pack A", color: "White", size: "M", quantity: 1 }, // 3 -> 1 (sum stays 20)
    { package_name: "Pack A", color: "White", size: "L", quantity: 3 },
    { package_name: "Pack A", color: "White", size: "XL", quantity: 1 },
  ];

  const updateRes = await fetch(`${API_BASE}/products/${productId}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ package_allocations: updatedAllocations }),
  });
  const updateData = await updateRes.json();
  assert(updateRes.status === 200, "Assortment edited after publishing (200 OK)");

  const reloadRes = await fetch(`${API_BASE}/products/${productId}`, { headers: authHeaders });
  const reloadData = await reloadRes.json();
  const reloadedAllocs = reloadData.data?.package_allocations || [];

  const updatedBlkM = reloadedAllocs.find((a: any) => a.color === "Black" && a.size === "M");
  const updatedWhtM = reloadedAllocs.find((a: any) => a.color === "White" && a.size === "M");
  const unchangedBlkS = reloadedAllocs.find((a: any) => a.color === "Black" && a.size === "S");

  assert(updatedBlkM?.quantity === 6, "Black / M successfully modified from 4 -> 6");
  assert(updatedWhtM?.quantity === 1, "White / M successfully modified from 3 -> 1");
  assert(unchangedBlkS?.quantity === 2, "Black / S remained unchanged at 2");

  // ==================================================
  // TEST 12-13: Change inventory & description without touching assortment
  // ==================================================
  const descStockUpdateRes = await fetch(`${API_BASE}/products/${productId}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({
      description: "Updated product description without touching assortment.",
      wholesale_price: 34.0,
      variants: [
        { color: "Black", size: "S", stock: 999 },
        { color: "Black", size: "M", stock: 888 },
      ],
    }),
  });
  assert(descStockUpdateRes.status === 200, "Updated description and inventory stock");

  const checkAfterInventoryRes = await fetch(`${API_BASE}/products/${productId}`, { headers: authHeaders });
  const checkAfterInventoryData = await checkAfterInventoryRes.json();
  const allocsAfterInv = checkAfterInventoryData.data?.package_allocations || [];

  const blkMAfterInv = allocsAfterInv.find((a: any) => a.color === "Black" && a.size === "M");
  assert(
    blkMAfterInv?.quantity === 6 && allocsAfterInv.length === 8,
    "Changing variant inventory and product description did NOT reset or modify package assortment"
  );

  // ==================================================
  // TEST 14-17: Distinction between 0 and empty/unconfigured
  // ==================================================
  const zeroTestSlug = `test-zero-unconf-${Date.now()}`;
  const zeroCreateRes = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Zero vs Unconfigured Test Item",
      slug: zeroTestSlug,
      sku: `AYN-ZRO-${Date.now().toString().slice(-4)}`,
      wholesale_price: 20.0,
      moq: 10,
      status: "published",
      package_allocations: [
        { package_name: "Pack A", color: "Black", size: "S", quantity: 0 }, // 0 = intentionally excluded
        { package_name: "Pack A", color: "Black", size: "M", quantity: 10 },
        // White / S and White / M are completely unconfigured
      ],
    }),
  });
  const zeroData = await zeroCreateRes.json();
  assert(zeroCreateRes.status === 201, "Created product with explicit 0 quantity");

  const zeroGetRes = await fetch(`${API_BASE}/products/${zeroData.data?.id}`, { headers: authHeaders });
  const zeroGetData = await zeroGetRes.json();
  const zeroAllocs = zeroGetData.data?.package_allocations || [];

  const zeroCell = zeroAllocs.find((a: any) => a.color === "Black" && a.size === "S");
  const missingCell = zeroAllocs.find((a: any) => a.color === "White" && a.size === "S");

  assert(zeroCell !== undefined && zeroCell.quantity === 0, "Explicit 0 quantity is stored and returned as 0");
  assert(missingCell === undefined, "Unconfigured combination is omitted without being auto-generated");

  // ==================================================
  // TEST: Validation rules (integer, negative, decimal)
  // ==================================================
  const negRes = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Negative Test",
      slug: `neg-${Date.now()}`,
      sku: "AYN-NEG-1",
      wholesale_price: 20.0,
      moq: 10,
      package_allocations: [
        { color: "Black", size: "S", quantity: -2 },
        { color: "Black", size: "M", quantity: 12 },
      ],
    }),
  });
  assert(negRes.status === 422, "Negative quantity rejected with 422 validation error");

  const decRes = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Decimal Test",
      slug: `dec-${Date.now()}`,
      sku: "AYN-DEC-1",
      wholesale_price: 20.0,
      moq: 10,
      package_allocations: [
        { color: "Black", size: "S", quantity: 2.5 },
        { color: "Black", size: "M", quantity: 7.5 },
      ],
    }),
  });
  assert(decRes.status === 422, "Decimal quantity rejected with 422 validation error");

  // ==================================================
  // TEST: Unconfigured product never auto-calculates breakdown
  // ==================================================
  const unconfSlug = `unconf-prod-${Date.now()}`;
  const unconfRes = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Completely Unconfigured Assortment Product",
      slug: unconfSlug,
      sku: `AYN-UNC-${Date.now().toString().slice(-4)}`,
      wholesale_price: 25.0,
      moq: 10,
      status: "published",
      variants: [
        { color: "Navy", size: "S", stock: 100 },
        { color: "Navy", size: "M", stock: 100 },
      ],
      // No package allocations provided!
    }),
  });
  const unconfData = await unconfRes.json();
  assert(unconfRes.status === 201, "Created product without package allocations");

  const unconfFetch = await fetch(`${API_BASE}/products/${unconfData.data?.id}`);
  const unconfFetchData = await unconfFetch.json();
  const unconfAllocs = unconfFetchData.data?.package_allocations || [];
  assert(unconfAllocs.length === 0, "Package allocations remain completely empty, not auto-generated");

  console.log("\n==================================================");
  console.log(`MANUAL ASSORTMENT AUDIT: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

export {};
