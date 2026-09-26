/**
 * Verification test for Product ID Architecture, Admin Management, and Cart Sanitization
 */
export {};

const API_URL = "http://127.0.0.1:8000/api/v1";

async function main() {
  console.log("==================================================");
  console.log("TESTING PRODUCT ID ARCHITECTURE & ADMIN MANAGEMENT");
  console.log("==================================================\n");

  // 1. Authenticate Customer
  console.log("▶ 1. Authenticating customer...");
  const custRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ email: "customer@ayaan-demo.local", password: "Customer@12345" }),
  });
  if (!custRes.ok) throw new Error(`Customer login failed: ${custRes.status}`);
  const custData = await custRes.json();
  const customerToken = custData.token || custData.data?.token;
  console.log("   Customer token obtained.");

  // 2. Authenticate Admin
  console.log("▶ 2. Authenticating admin...");
  const adminRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ email: "admin@ayaan-demo.local", password: "Admin@12345" }),
  });
  if (!adminRes.ok) throw new Error(`Admin login failed: ${adminRes.status}`);
  const adminData = await adminRes.json();
  const adminToken = adminData.token || adminData.data?.token;
  console.log("   Admin token obtained.");

  // 3. Fetch products from real API
  console.log("▶ 3. Fetching real seeded products...");
  const prodRes = await fetch(`${API_URL}/products`, {
    headers: { "Accept": "application/json" },
  });
  if (!prodRes.ok) throw new Error(`Fetch products failed: ${prodRes.status}`);
  const prodData = await prodRes.json();
  let products = Array.isArray(prodData.data) ? prodData.data : prodData;
  console.log(`   Fetched ${products.length} products from backend.`);
  
  if (products.length === 0) {
    console.log("   Creating an initial test brand & product for test suite...");
    const brandRes = await fetch(`${API_URL}/brands`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "Authorization": `Bearer ${adminToken}` },
      body: JSON.stringify({ name: "Ayaan Prime", slug: `ayaan-prime-${Date.now()}` }),
    });
    const brandJson = await brandRes.json();
    const brandId = brandJson.data?.id || 1;

    const initProdRes = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", "Authorization": `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: "Baseline Test Shirt",
        slug: `baseline-shirt-${Date.now()}`,
        sku: `BASE-SKU-${Date.now()}`,
        product_type: "simple",
        brand_id: brandId,
        base_price: 20.00,
        wholesale_price: 15.00,
        bulk_price: 12.00,
        moq: 10,
        status: "published",
        variants: [{ size: "L", color: "Black", sku: `BASE-${Date.now()}-L`, stock: 100 }],
      }),
    });
    const initProdJson = await initProdRes.json();
    products = [initProdJson.data || initProdJson];
  }

  const sampleProduct = products[0];
  console.log(`   Sample product: ID=${sampleProduct.id} (type: ${typeof sampleProduct.id}), Name="${sampleProduct.name}", SKU="${sampleProduct.sku}"`);

  if (typeof sampleProduct.id !== "number") {
    throw new Error(`Expected numeric BIGINT product id, got: ${typeof sampleProduct.id}`);
  }

  // 4. Test Commercial Order creation with real product ID
  console.log("▶ 4. Creating Commercial Order with real numeric product ID...");
  const orderPayload = {
    email: "customer@ayaan-demo.local",
    shipping_name: "Ayaan Verified Buyer",
    shipping_phone: "+1-555-0199",
    shipping_address1: "100 Commercial Blvd",
    shipping_city: "New York",
    shipping_region: "NY",
    shipping_postal_code: "10001",
    shipping_country_code: "US",
    payment_method: "proforma_invoice",
    items: [
      {
        product_id: sampleProduct.id,
        quantity: sampleProduct.moq || 20,
        size: "Assorted",
      },
    ],
  };

  const orderRes = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${customerToken}`,
    },
    body: JSON.stringify(orderPayload),
  });

  const orderJson = await orderRes.json();
  if (!orderRes.ok) {
    throw new Error(`Order creation failed with status ${orderRes.status}: ${JSON.stringify(orderJson)}`);
  }
  const createdOrder = orderJson.data || orderJson;
  console.log(`   Order created successfully: Ref=${createdOrder.order_number || createdOrder.orderNumber}`);

  // 5. Test resilience: What happens if legacy string ID "prd0010" is sent?
  console.log("▶ 5. Testing legacy ID 'prd0010' resilience (no SQLSTATE[22P02] crash)...");
  const badOrderPayload = {
    email: "customer@ayaan-demo.local",
    shipping_name: "Test Legacy",
    shipping_phone: "+1-555-0199",
    shipping_address1: "100 Commercial Blvd",
    shipping_city: "New York",
    shipping_postal_code: "10001",
    payment_method: "proforma_invoice",
    items: [
      {
        product_id: "prd0010",
        quantity: 20,
        size: "Assorted",
      },
    ],
  };

  const badRes = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${customerToken}`,
    },
    body: JSON.stringify(badOrderPayload),
  });

  const badJson = await badRes.json();
  const errorText = JSON.stringify(badJson);
  if (errorText.includes("22P02") || errorText.includes("invalid input syntax for type bigint")) {
    throw new Error("PostgreSQL 22P02 bigint error was NOT prevented!");
  }
  console.log(`   Safe response received: HTTP ${badRes.status} (Message: ${badJson.message || "Properly rejected without SQL error"})`);

  // 6. Test Admin Product Management: Create, Read, Soft Delete
  console.log("▶ 6. Testing Admin Product Management (Create & Soft Delete)...");
  const newProductPayload = {
    name: "Automated Admin Test T-Shirt",
    slug: `test-shirt-${Date.now()}`,
    sku: `TEST-SKU-${Date.now()}`,
    product_type: "simple",
    brand_id: sampleProduct.brand_id || 1,
    base_price: 25.00,
    wholesale_price: 18.00,
    bulk_price: 15.00,
    full_stock_price: 12.00,
    bulk_threshold: 100,
    moq: 10,
    status: "published",
    short_description: "Admin test product",
    variants: [
      {
        size: "M",
        color: "Blue",
        sku: `TEST-SKU-${Date.now()}-M`,
        stock: 500,
      }
    ]
  };

  const createProdRes = await fetch(`${API_URL}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${adminToken}`,
    },
    body: JSON.stringify(newProductPayload),
  });

  if (!createProdRes.ok) {
    const err = await createProdRes.json();
    throw new Error(`Admin product create failed: ${JSON.stringify(err)}`);
  }
  const createdProd = (await createProdRes.json()).data;
  console.log(`   Admin created test product: ID=${createdProd.id}, SKU=${createdProd.sku}`);

  // Now delete it via Admin API
  const deleteProdRes = await fetch(`${API_URL}/products/${createdProd.id}`, {
    method: "DELETE",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${adminToken}`,
    },
  });

  if (!deleteProdRes.ok) {
    const err = await deleteProdRes.json();
    throw new Error(`Admin product delete failed: ${JSON.stringify(err)}`);
  }
  console.log(`   Admin successfully deleted product ID=${createdProd.id}.`);

  // Verify it is no longer returned on public storefront
  const verifyRes = await fetch(`${API_URL}/products/${createdProd.id}`, {
    headers: { "Accept": "application/json" },
  });
  if (verifyRes.status !== 404) {
    throw new Error(`Expected 404 for deleted product, got: ${verifyRes.status}`);
  }
  console.log("   Verified deleted product is no longer returned on storefront (HTTP 404).");

  // 7. Verify Admin Customers Endpoint
  console.log("▶ 7. Testing Admin Customer Management...");
  const adminCustRes = await fetch(`${API_URL}/admin/customers`, {
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${adminToken}`,
    },
  });
  if (!adminCustRes.ok) {
    throw new Error(`Admin customer fetch failed: ${adminCustRes.status}`);
  }
  const adminCustData = await adminCustRes.json();
  const customerList = adminCustData.data?.data || adminCustData.data || [];
  console.log(`   Admin fetched ${customerList.length} user accounts from PostgreSQL.`);

  console.log("\n==================================================");
  console.log("ALL PRODUCT ID & ADMIN CHECKS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
