const http = require("http");

async function apiRequest(path, method = "GET", body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, "http://127.0.0.1:8000");
    const headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(raw);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );

    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exit(1);
  }
}

async function runVerification() {
  console.log("==================================================");
  console.log("AYAAN CLOTHING — DYNAMIC CATALOG VERIFICATION SUITE");
  console.log("==================================================\n");

  // Step 0: Login Admin
  console.log("▶ Step 0: Authenticate Admin");
  const loginRes = await apiRequest("/api/v1/auth/login", "POST", {
    email: "admin@ayaan-demo.local",
    password: "Admin@12345",
  });
  assert(loginRes.status === 200, "Admin login successful");
  const token = loginRes.data.data.token;
  assert(!!token, "Admin bearer token retrieved");

  // Step 1: Clean Database State (Zero brands, categories, products)
  console.log("\n▶ STEP 1: Database contains zero brands/categories/products");
  const initialHomepage = await apiRequest("/api/v1/homepage");
  assert(initialHomepage.status === 200, "Homepage API returned 200");
  assert(initialHomepage.data.data.featured_brands.length === 0, "Initial featured brands count is 0");
  assert(initialHomepage.data.data.hot_sale_categories.length === 0, "Initial hot sale categories count is 0");
  assert(initialHomepage.data.data.featured_products.length === 0, "Initial featured products count is 0");

  const initialLandingBrands = await apiRequest("/api/v1/brands/landing");
  assert(initialLandingBrands.data.data.length === 0, "Landing brands endpoint returns 0 brands");

  const initialLandingCategories = await apiRequest("/api/v1/categories/landing");
  assert(initialLandingCategories.data.data.length === 0, "Landing categories endpoint returns 0 categories");

  // Step 2 & 3: Admin creates Brand 'Nike' with Show on Landing Page = YES
  console.log("\n▶ STEP 2 & 3: Admin creates Brand: Nike with Show on Landing Page = YES");
  const createNike = await apiRequest("/api/v1/brands", "POST", {
    name: "Nike",
    slug: "nike",
    is_active: true,
    is_featured_on_landing: true,
    landing_sort_order: 1,
  }, token);
  assert(createNike.status === 201 || createNike.status === 200, "Nike brand created");
  const nikeId = createNike.data.data.id;
  assert(createNike.data.data.name === "Nike", "Brand name is Nike");
  assert(createNike.data.data.is_featured_on_landing === true, "Nike is_featured_on_landing is true");

  // Step 4: Admin creates Category: T-Shirts with Show on Landing Page = YES
  console.log("\n▶ STEP 4: Admin creates Category: T-Shirts with Show on Landing Page = YES");
  const createTshirts = await apiRequest("/api/v1/categories", "POST", {
    name: "T-Shirts",
    slug: "t-shirts",
    is_active: true,
    is_featured_on_landing: true,
    landing_sort_order: 1,
  }, token);
  assert(createTshirts.status === 201 || createTshirts.status === 200, "T-Shirts category created");
  const tshirtsId = createTshirts.data.data.id;
  assert(createTshirts.data.data.name === "T-Shirts", "Category name is T-Shirts");
  assert(createTshirts.data.data.is_featured_on_landing === true, "T-Shirts is_featured_on_landing is true");

  // Step 5: Storefront refreshes
  console.log("\n▶ STEP 5: Storefront queries backend");
  const step5Homepage = await apiRequest("/api/v1/homepage");
  assert(step5Homepage.data.data.featured_brands.length === 1, "Shop By Brand contains exactly 1 brand");
  assert(step5Homepage.data.data.featured_brands[0].brand.name === "Nike", "Shop By Brand item is Nike");
  assert(step5Homepage.data.data.hot_sale_categories.length === 1, "Hot Sale contains exactly 1 category");
  assert(step5Homepage.data.data.hot_sale_categories[0].category.name === "T-Shirts", "Hot Sale item is T-Shirts");

  // Step 6: Admin adds another brand: Adidas, but does NOT select it for landing page
  console.log("\n▶ STEP 6: Admin adds Brand: Adidas (NOT selected for landing page)");
  const createAdidas = await apiRequest("/api/v1/brands", "POST", {
    name: "Adidas",
    slug: "adidas",
    is_active: true,
    is_featured_on_landing: false,
    landing_sort_order: 2,
  }, token);
  assert(createAdidas.status === 201 || createAdidas.status === 200, "Adidas brand created");
  const adidasId = createAdidas.data.data.id;

  // Admin directory has Adidas
  const adminBrands = await apiRequest("/api/v1/brands?all=true", "GET", null, token);
  assert(adminBrands.data.data.some((b) => b.name === "Adidas"), "Admin directory contains Adidas");

  // Storefront Shop By Brand still only has Nike
  const step6Homepage = await apiRequest("/api/v1/homepage");
  assert(step6Homepage.data.data.featured_brands.length === 1, "Storefront Shop By Brand still has only 1 brand");
  assert(step6Homepage.data.data.featured_brands[0].brand.name === "Nike", "Storefront brand is Nike (Adidas NOT shown)");

  // Step 7: Admin selects Adidas for landing page
  console.log("\n▶ STEP 7: Admin selects Adidas for landing page");
  const updateAdidas = await apiRequest(`/api/v1/brands/${adidasId}`, "PUT", {
    is_featured_on_landing: true,
    landing_sort_order: 2,
  }, token);
  assert(updateAdidas.status === 200, "Adidas updated to featured on landing");

  const step7Homepage = await apiRequest("/api/v1/homepage");
  assert(step7Homepage.data.data.featured_brands.length === 2, "Shop By Brand now contains both brands");
  assert(step7Homepage.data.data.featured_brands[0].brand.name === "Nike", "1st brand is Nike");
  assert(step7Homepage.data.data.featured_brands[1].brand.name === "Adidas", "2nd brand is Adidas");

  // Step 8: Admin changes ordering (Adidas #1, Nike #2) via Homepage Management
  console.log("\n▶ STEP 8: Admin changes brand order (Adidas #1, Nike #2)");
  const reorderRes = await apiRequest("/api/v1/admin/homepage/featured-brands", "POST", {
    brands: [
      { brand_id: adidasId, sort_order: 0, is_active: true },
      { brand_id: nikeId, sort_order: 1, is_active: true },
    ],
  }, token);
  assert(reorderRes.status === 200, "Homepage brands reordered successfully");

  const step8Homepage = await apiRequest("/api/v1/homepage");
  assert(step8Homepage.data.data.featured_brands[0].brand.name === "Adidas", "Storefront 1st brand is now Adidas");
  assert(step8Homepage.data.data.featured_brands[1].brand.name === "Nike", "Storefront 2nd brand is now Nike");

  // Step 9: Admin removes Nike from landing page
  console.log("\n▶ STEP 9: Admin removes Nike from landing page");
  const removeNike = await apiRequest("/api/v1/admin/homepage/featured-brands", "POST", {
    brands: [
      { brand_id: adidasId, sort_order: 0, is_active: true },
    ],
  }, token);
  assert(removeNike.status === 200, "Nike removed from landing page");

  const step9Homepage = await apiRequest("/api/v1/homepage");
  assert(step9Homepage.data.data.featured_brands.length === 1, "Shop By Brand now has only 1 brand");
  assert(step9Homepage.data.data.featured_brands[0].brand.name === "Adidas", "Only Adidas remains; Nike disappeared");

  // Step 10: Admin removes T-Shirts from landing page
  console.log("\n▶ STEP 10: Admin removes T-Shirts from landing page");
  const removeTshirts = await apiRequest("/api/v1/admin/homepage/hot-sale-categories", "POST", {
    categories: [],
  }, token);
  assert(removeTshirts.status === 200, "T-Shirts removed from Hot Sale");

  const step10Homepage = await apiRequest("/api/v1/homepage");
  assert(step10Homepage.data.data.hot_sale_categories.length === 0, "Hot Sale categories is now 0");

  // Clean up created test entities to restore pristine database
  console.log("\n▶ Teardown: Restoring clean pristine database");
  await apiRequest(`/api/v1/brands/${nikeId}`, "DELETE", null, token);
  await apiRequest(`/api/v1/brands/${adidasId}`, "DELETE", null, token);
  await apiRequest(`/api/v1/categories/${tshirtsId}`, "DELETE", null, token);

  const finalCheck = await apiRequest("/api/v1/homepage");
  assert(finalCheck.data.data.featured_brands.length === 0, "Pristine featured brands = 0");
  assert(finalCheck.data.data.hot_sale_categories.length === 0, "Pristine hot sale categories = 0");

  console.log("\n==================================================");
  console.log("🎉 ALL 10 VERIFICATION STEPS PASSED PERFECTLY!");
  console.log("==================================================");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
