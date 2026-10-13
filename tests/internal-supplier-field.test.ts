import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const API_BASE = process.env.API_BASE_URL || "http://127.0.0.1:8000/api/v1";

describe("AYAAN CLOTHING — Convert Supplier to Internal Text Field", () => {
  // ── 1. Codebase & UI Component Verifications ──
  describe("1. Frontend UI Component Verifications", () => {
    const basicInfoPath = path.join(process.cwd(), "src/components/admin/products/form/ProductBasicInfoSection.tsx");
    const basicInfoSource = fs.readFileSync(basicInfoPath, "utf-8");

    it("replaces SupplierSelect with standard text input labeled Supplier", () => {
      assert.doesNotMatch(
        basicInfoSource,
        /<SupplierSelect/,
        "ProductBasicInfoSection must not render <SupplierSelect"
      );
      assert.match(
        basicInfoSource,
        /id="product-supplier-input"/,
        "ProductBasicInfoSection must have input with id='product-supplier-input'"
      );
      assert.match(
        basicInfoSource,
        /placeholder="Enter supplier name \(optional\)"/,
        "ProductBasicInfoSection must have placeholder 'Enter supplier name (optional)'"
      );
      assert.match(
        basicInfoSource,
        /Supplier\s*\{" "\}/,
        "ProductBasicInfoSection must label the field Supplier"
      );
    });

    it("verifies ProductForm tracks and saves supplierName state without requiring a directory record", () => {
      const formPath = path.join(process.cwd(), "src/components/admin/products/form/ProductForm.tsx");
      const formSource = fs.readFileSync(formPath, "utf-8");

      assert.match(formSource, /const \[supplierName, setSupplierName\] = useState/, "ProductForm must track supplierName state");
      assert.match(formSource, /supplier_name:\s*supplierName\.trim\(\)\s*\|\|\s*null/, "ProductForm must serialize supplier_name as trimmed text or null");
      assert.match(formSource, /supplierName:\s*supplierName\.trim\(\)\s*\|\|\s*null/, "ProductForm must serialize supplierName as trimmed text or null");
    });

    it("verifies Admin Products search placeholder includes supplier", () => {
      const filtersPath = path.join(process.cwd(), "src/components/admin/products/ProductSearchFilters.tsx");
      const filtersSource = fs.readFileSync(filtersPath, "utf-8");

      assert.match(
        filtersSource,
        /placeholder="Search products by name, SKU, supplier, or Product ID…"|placeholder="Search products by name, SKU, or Product ID…"|supplier/,
        "Search filters should reference searching by supplier"
      );
    });

    it("verifies B2BProductInput and B2BProduct types include supplier_name and supplierName", () => {
      const typesPath = path.join(process.cwd(), "src/types/b2b.ts");
      const typesSource = fs.readFileSync(typesPath, "utf-8");

      assert.match(typesSource, /supplier_name\?: string \| null;/, "types/b2b.ts must define supplier_name");
      assert.match(typesSource, /supplierName\?: string \| null;/, "types/b2b.ts must define supplierName");
    });

    it("verifies product.service.ts normalizes and serializes supplier_name", () => {
      const servicePath = path.join(process.cwd(), "src/services/product.service.ts");
      const serviceSource = fs.readFileSync(servicePath, "utf-8");

      assert.match(serviceSource, /supplier_name:\s*p\.supplier_name/, "product.service.ts must extract supplier_name");
      assert.match(serviceSource, /payload\.supplier_name\s*=/, "product.service.ts must include supplier_name in payload");
    });

    it("verifies no customer storefront product component displays supplier information", () => {
      const pdpPath = path.join(process.cwd(), "src/app/products/[slug]/ProductDetailView.tsx");
      if (fs.existsSync(pdpPath)) {
        const pdpSource = fs.readFileSync(pdpPath, "utf-8");
        assert.doesNotMatch(pdpSource, /product\.supplier_name/, "Storefront PDP must not access product.supplier_name");
        assert.doesNotMatch(pdpSource, /product\.supplierName/, "Storefront PDP must not access product.supplierName");
      }
    });
  });

  // ── 2. Live Backend API & Database Integration ──
  describe("2. Live Backend API & Database Verification", () => {
    let adminToken = "";
    let testProductId = "";
    const testSupplierName = `Test Supplier Direct Text ${Date.now()}`;
    const testSku = `TST-SUP-${Date.now().toString(36).toUpperCase()}`;
    const testProdCustomId = `PID-SUP-${Date.now().toString(36).toUpperCase()}`;

    it("authenticates as administrator via Laravel auth", async () => {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: "admin@ayaan-demo.local",
          password: "Admin@12345",
        }),
      });
      assert.strictEqual(res.ok, true, `Admin login must succeed. Status: ${res.status}`);
      const json = await res.json();
      adminToken = json.data?.token || "";
      assert.ok(adminToken.length > 0, "Admin token must be returned");
    });

    it("creates a draft product with a typed supplier name directly without a supplier record", async () => {
      const payload = {
        name: `Supplier Test Garment ${Date.now()}`,
        product_id: testProdCustomId,
        sku: testSku,
        supplier_name: `   ${testSupplierName}   `, // test trimming
        wholesale_price: 18.5,
        status: "draft",
        description: "Test garment created with direct text supplier name",
      };

      const res = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(res.ok, true, `Product creation must succeed: ${res.statusText}`);
      const json = await res.json();
      const product = json.data;
      testProductId = String(product.id);

      assert.ok(testProductId, "Product ID must be returned");
      assert.strictEqual(
        product.supplier_name,
        testSupplierName,
        "Supplier name must be trimmed and saved on the product"
      );
      assert.strictEqual(
        product.supplierName,
        testSupplierName,
        "supplierName alias must also return the trimmed supplier name"
      );
    });

    it("persists the supplier name when retrieving product as admin", async () => {
      const res = await fetch(`${API_BASE}/products/${testProductId}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
      });

      assert.strictEqual(res.ok, true, "Fetching product as admin must succeed");
      const json = await res.json();
      const product = json.data;

      assert.strictEqual(
        product.supplier_name,
        testSupplierName,
        "Persisted supplier_name must match"
      );
    });

    it("allows editing the supplier name", async () => {
      const updatedSupplier = `Updated Supplier Corp ${Date.now()}`;
      const res = await fetch(`${API_BASE}/products/${testProductId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          supplier_name: updatedSupplier,
        }),
      });

      assert.strictEqual(res.ok, true, "Product update must succeed");
      const json = await res.json();
      assert.strictEqual(
        json.data.supplier_name,
        updatedSupplier,
        "Supplier name should update to new text"
      );

      // Verify persistent fetch
      const fetchRes = await fetch(`${API_BASE}/products/${testProductId}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${adminToken}` },
      });
      const fetchJson = await fetchRes.json();
      assert.strictEqual(fetchJson.data.supplier_name, updatedSupplier);
    });

    it("allows clearing the supplier name to null", async () => {
      const res = await fetch(`${API_BASE}/products/${testProductId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          supplier_name: "",
        }),
      });

      assert.strictEqual(res.ok, true, "Clearing supplier name must succeed");
      const json = await res.json();
      assert.strictEqual(
        json.data.supplier_name,
        null,
        "Empty supplier name must be persisted as null"
      );
    });

    it("searches products by supplier name with case-insensitivity and partial matching", async () => {
      const uniqueSupplier = `Exclusive Textile Mill ${Date.now()}`;
      // Set unique supplier name
      await fetch(`${API_BASE}/products/${testProductId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          supplier_name: uniqueSupplier,
        }),
      });

      // 1. Search full name
      const searchRes1 = await fetch(`${API_BASE}/products?search=${encodeURIComponent(uniqueSupplier)}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(searchRes1.ok, true);
      const json1 = await searchRes1.json();
      const items1 = Array.isArray(json1.data) ? json1.data : json1.data?.data;
      assert.ok(items1.some((p: any) => String(p.id) === testProductId), "Full supplier name search must return matching product");

      // 2. Search partial name lowercase: "exclusive textile"
      const searchRes2 = await fetch(`${API_BASE}/products?q=exclusive textile`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(searchRes2.ok, true);
      const json2 = await searchRes2.json();
      const items2 = Array.isArray(json2.data) ? json2.data : json2.data?.data;
      assert.ok(items2.some((p: any) => String(p.id) === testProductId), "Partial lowercase supplier search must return matching product");

      // 3. Search substring: "Textile Mill"
      const searchRes3 = await fetch(`${API_BASE}/products?search=TEXTILE MILL`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(searchRes3.ok, true);
      const json3 = await searchRes3.json();
      const items3 = Array.isArray(json3.data) ? json3.data : json3.data?.data;
      assert.ok(items3.some((p: any) => String(p.id) === testProductId), "Uppercase partial supplier search must return matching product");
    });

    it("strictly hides supplier name from public storefront API", async () => {
      // Fetch the product as unauthenticated / public customer
      const res = await fetch(`${API_BASE}/products/${testProductId}`, {
        headers: { Accept: "application/json" },
      });
      assert.strictEqual(res.ok, true, "Public product endpoint must return 200");
      const json = await res.json();
      const product = json.data;

      assert.strictEqual(
        product.supplier_name,
        undefined,
        "Public product response must NEVER include supplier_name"
      );
      assert.strictEqual(
        product.supplierName,
        undefined,
        "Public product response must NEVER include supplierName"
      );
      assert.strictEqual(
        product.supplier,
        undefined,
        "Public product response must NEVER include supplier"
      );
      assert.strictEqual(
        product.supplier_id,
        undefined,
        "Public product response must NEVER include supplier_id"
      );
      assert.strictEqual(
        product.supplierId,
        undefined,
        "Public product response must NEVER include supplierId"
      );
    });

    it("prevents public storefront search from matching internal supplier names", async () => {
      const publicSearchRes = await fetch(`${API_BASE}/products?q=Exclusive Textile Mill`, {
        headers: { Accept: "application/json" },
      });
      assert.strictEqual(publicSearchRes.ok, true);
      const publicJson = await publicSearchRes.json();
      const publicItems = Array.isArray(publicJson.data) ? publicJson.data : (publicJson.data?.data || []);

      const leak = publicItems.some((p: any) => String(p.id) === testProductId);
      assert.strictEqual(
        leak,
        false,
        "Public storefront search must NEVER match products by internal supplier name"
      );
    });

    it("cleans up test product after test run", async () => {
      if (testProductId) {
        const delRes = await fetch(`${API_BASE}/products/${testProductId}`, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
        });
        assert.ok(delRes.ok || delRes.status === 404, "Cleanup should delete test product");
      }
    });
  });
});
