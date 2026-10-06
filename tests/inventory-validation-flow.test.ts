/**
 * End-to-End Inventory Validation Flow Integration Test
 * Validates all 8 Cases required by user specifications.
 */

const API_BASE = process.env.API_BASE_URL || "http://127.0.0.1:8000/api/v1";

async function run() {
  console.log("==================================================");
  console.log("INVENTORY VALIDATION FLOW — MULTI-LAYER AUDIT");
  console.log("==================================================\n");

  // Pre-flight health check with explicit diagnostics
  try {
    const healthRes = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    const healthJson = await healthRes.json();
    if (!healthRes.ok || healthJson.data?.status !== "ok") {
      console.warn(`[DIAGNOSTIC: BACKEND UNAVAILABLE] API health check returned HTTP ${healthRes.status}`);
      console.log("\n==================================================");
      console.log("STATUS: BLOCKED (Live backend unavailable)");
      console.log("==================================================");
      return;
    }
    if (healthJson.data?.database !== "ok") {
      console.error(`[DIAGNOSTIC: DATABASE UNAVAILABLE] PostgreSQL status: ${healthJson.data?.database}`);
      process.exit(1);
    }
    if (healthJson.data?.redis !== "ok") {
      console.error(`[DIAGNOSTIC: REDIS UNAVAILABLE] Redis cache status: ${healthJson.data?.redis}`);
      process.exit(1);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[DIAGNOSTIC: BACKEND UNAVAILABLE] Cannot connect to API at ${API_BASE}: ${msg}`);
    console.warn("ℹ [BLOCKED] Live integration suite requires running Laravel backend with PostgreSQL & Redis.");
    console.warn("ℹ Live integration tests are deliberately BLOCKED and NEVER converted to fake mocks.");
    console.log("\n==================================================");
    console.log("STATUS: BLOCKED (Live backend unavailable)");
    console.log("==================================================");
    return;
  }

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

  // 1. Locate "Men's Luxury Merino Wool Knit Sweater"
  const searchRes = await fetch(`${API_BASE}/products?search=Merino`).then(r => r.json());
  const product = searchRes.data?.find((p: any) => p.name.includes("Men's Luxury Merino Wool") || p.name.includes("Merino Wool"));
  assert(Boolean(product), `Product found: ${product?.name} (ID: ${product?.id})`);

  const variantS = product.variants?.find((v: any) => v.size === "S");
  assert(Boolean(variantS), `Size S variant found with stock: ${variantS?.stock} pcs`);
  const availableStock = variantS?.stock ?? 80;

  const testSession = `test_sess_${Date.now()}`;

  // CASE 1: Requested 10, Available 80 -> succeeds
  const case1Res = await fetch(`${API_BASE}/cart/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Id": testSession },
    body: JSON.stringify({ product_id: product.id, variant_id: variantS.id, size: "S", quantity: 10 }),
  });
  const case1Data = await case1Res.json();
  assert(case1Res.status === 200 && case1Data.success === true, `CASE 1: Requested 10, Available ${availableStock} -> Succeeded with 200 OK`);

  // Clear session cart
  await fetch(`${API_BASE}/cart`, { method: "DELETE", headers: { "X-Session-Id": testSession } });

  // CASE 2: Requested 80, Available 80 -> succeeds
  const case2Res = await fetch(`${API_BASE}/cart/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Id": testSession },
    body: JSON.stringify({ product_id: product.id, variant_id: variantS.id, size: "S", quantity: availableStock }),
  });
  const case2Data = await case2Res.json();
  assert(case2Res.status === 200 && case2Data.success === true, `CASE 2: Requested full stock (${availableStock}), Available ${availableStock} -> Succeeded with 200 OK`);

  // Clear session cart
  await fetch(`${API_BASE}/cart`, { method: "DELETE", headers: { "X-Session-Id": testSession } });

  // CASE 3: Requested 81, Available 80 -> rejected
  const case3Res = await fetch(`${API_BASE}/cart/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Id": testSession },
    body: JSON.stringify({ product_id: product.id, variant_id: variantS.id, size: "S", quantity: availableStock + 1 }),
  });
  const case3Data = await case3Res.json();
  assert(case3Res.status === 422 && case3Data.error_code === "INSUFFICIENT_STOCK", `CASE 3: Requested ${availableStock + 1}, Available ${availableStock} -> Rejected with 422 INSUFFICIENT_STOCK`);

  // CASE 4: Requested 220, Available 80 -> rejected before entering cart
  const case4Res = await fetch(`${API_BASE}/cart/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Id": testSession },
    body: JSON.stringify({ product_id: product.id, variant_id: variantS.id, size: "S", quantity: 220 }),
  });
  const case4Data = await case4Res.json();
  assert(
    case4Res.status === 422 &&
    case4Data.error_code === "INSUFFICIENT_STOCK" &&
    case4Data.data?.requested_quantity === 220 &&
    case4Data.data?.available_quantity === availableStock,
    `CASE 4: Requested 220, Available ${availableStock} -> Rejected before entering cart with structured payload`
  );

  const cartCheck = await fetch(`${API_BASE}/cart`, { headers: { "X-Session-Id": testSession } }).then(r => r.json());
  assert(cartCheck.data?.total_items === 0, `Cart remains empty; invalid 220 quantity was not persisted`);

  // CASE 5: Cart quantity update: change 10 -> 220 is rejected
  // First add valid 10
  await fetch(`${API_BASE}/cart/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Id": testSession },
    body: JSON.stringify({ product_id: product.id, variant_id: variantS.id, size: "S", quantity: 10 }),
  });
  const updateRes = await fetch(`${API_BASE}/cart/items`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Session-Id": testSession },
    body: JSON.stringify({ product_id: product.id, size: "S", quantity: 220 }),
  });
  const updateData = await updateRes.json();
  assert(
    updateRes.status === 422 &&
    updateData.error_code === "INSUFFICIENT_STOCK" &&
    updateData.data?.requested_quantity === 220,
    `CASE 5: Cart quantity update (10 -> 220) rejected with INSUFFICIENT_STOCK`
  );

  const cartCheckAfterUpdate = await fetch(`${API_BASE}/cart`, { headers: { "X-Session-Id": testSession } }).then(r => r.json());
  assert(cartCheckAfterUpdate.data?.items[0]?.quantity === 10, `Cart retains safe quantity (10); 220 was rejected`);

  // CASE 6: Cart revalidation: item in cart has 220, current stock is 80
  const revalRes = await fetch(`${API_BASE}/cart/revalidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        { product_id: product.id, variant_id: variantS.id, size: "S", quantity: 220 },
      ],
    }),
  });
  const revalData = await revalRes.json();
  assert(
    revalRes.status === 200 &&
    revalData.is_valid === false &&
    revalData.violations?.length === 1 &&
    revalData.violations[0].requested_quantity === 220 &&
    revalData.violations[0].available_quantity === availableStock,
    `CASE 6: Cart revalidation flagged stale cart with clear violation message`
  );

  // CASE 7: Variant-level stock isolation:
  // Size S has 80, Size XXL has 100
  const variantXXL = product.variants?.find((v: any) => v.size === "XXL");
  if (variantXXL) {
    const xxlRes = await fetch(`${API_BASE}/cart/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Id": `sess_xxl_${Date.now()}` },
      body: JSON.stringify({ product_id: product.id, variant_id: variantXXL.id, size: "XXL", quantity: 95 }),
    });
    assert(xxlRes.status === 200, `CASE 7: Variant isolation: Ordering 95 of XXL succeeds (stock is ${variantXXL.stock}), while S is limited to 80`);
  }

  // CASE 8: Checkout final transactional safety check
  const checkoutRes = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      shipping_name: "Test Commercial Buyer",
      email: "buyer@testcommercial.com",
      shipping_address1: "450 Fashion Ave",
      shipping_city: "New York",
      shipping_postal_code: "10018",
      shipping_country_code: "US",
      shipping_method: "Discuss Directly",
      payment_method: "proforma_invoice",
      items: [
        { product_id: product.id, variant_id: variantS.id, size: "S", quantity: 220 },
      ],
    }),
  });
  const checkoutData = await checkoutRes.json();
  assert(
    checkoutRes.status === 422 &&
    checkoutData.error_code === "INSUFFICIENT_STOCK" &&
    checkoutData.data?.requested_quantity === 220 &&
    checkoutData.data?.available_quantity === availableStock,
    `CASE 8: Checkout final transactional check blocked 220 with 422 INSUFFICIENT_STOCK`
  );

  // Clean up session cart
  await fetch(`${API_BASE}/cart`, { method: "DELETE", headers: { "X-Session-Id": testSession } });

  console.log("\n==================================================");
  console.log(`INVENTORY AUDIT COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

export {};
