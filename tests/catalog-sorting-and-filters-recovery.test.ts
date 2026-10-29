import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getLowestValidCustomerUnitPrice } from "../src/lib/product-pricing";
import { Product } from "../src/types";

describe("AYC Prompt 2 — Catalog Sorting Engine, Filter Sidebar & Scroll Verification", () => {
  const rootDir = path.resolve(__dirname, "..");

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Issue #3 & Issue #4: Backend SQL Sorting Logic Verification
  // ───────────────────────────────────────────────────────────────────────────
  describe("Backend SQL Sorting Engine (ProductController.php)", () => {
    const controllerPath = path.join(
      rootDir,
      "backend/app/Http/Controllers/Api/V1/ProductController.php"
    );
    const controllerContent = fs.readFileSync(controllerPath, "utf-8");

    it("defines the multi-tier canonical effective price expression with cross-driver compatibility", () => {
      assert.ok(
        controllerContent.includes("$effectivePriceSql ="),
        "ProductController must define $effectivePriceSql"
      );
      assert.ok(
        controllerContent.includes("$leastFunc = $driver === 'sqlite' ? 'MIN' : 'LEAST';"),
        "Must support SQLite MIN and PostgreSQL/MySQL LEAST"
      );
      assert.ok(
        controllerContent.includes("bulk_pricing_enabled IS TRUE"),
        "Must handle PostgreSQL boolean bulk_pricing_enabled"
      );
      assert.ok(
        controllerContent.includes("product_pricing_tiers"),
        "Must incorporate product_pricing_tiers subquery in effective price"
      );
      assert.ok(
        controllerContent.includes("bulk_price"),
        "Must incorporate bulk_price in effective price"
      );
      assert.ok(
        controllerContent.includes("full_stock_price"),
        "Must incorporate full_stock_price in effective price"
      );
    });

    it("sorts price_asc by effective customer unit price ascending with unpriced items at the end", () => {
      assert.ok(
        controllerContent.includes(
          "CASE WHEN ({$effectivePriceSql}) IS NULL OR ({$effectivePriceSql}) <= 0 THEN 1 ELSE 0 END ASC"
        ),
        "Unpriced items must sort after priced items in price_asc"
      );
      assert.ok(
        controllerContent.includes('->orderByRaw("({$effectivePriceSql}) ASC")'),
        "Must sort by effective price ascending"
      );
      assert.ok(
        controllerContent.includes("->orderBy('is_sold_out', 'asc')"),
        "Must prioritize in-stock over sold-out as secondary sort"
      );
      assert.ok(
        controllerContent.includes("->orderBy('id', 'desc')"),
        "Must break ties deterministically by product id"
      );
    });

    it("sorts price_desc by effective customer unit price descending with unpriced items at the end", () => {
      assert.ok(
        controllerContent.includes('->orderByRaw("({$effectivePriceSql}) DESC")'),
        "Must sort by effective price descending"
      );
    });

    it("sorts name_asc and name_desc case-insensitively using LOWER(TRIM(name))", () => {
      assert.ok(
        controllerContent.includes("->orderByRaw('LOWER(TRIM(name)) ASC')"),
        "name_asc must order by LOWER(TRIM(name)) ASC"
      );
      assert.ok(
        controllerContent.includes("->orderByRaw('LOWER(TRIM(name)) DESC')"),
        "name_desc must order by LOWER(TRIM(name)) DESC"
      );
    });

    it("uses effectivePriceSql for price range filtering (price_min and price_max)", () => {
      assert.ok(
        controllerContent.includes('whereRaw("({$effectivePriceSql}) >= ?"'),
        "price_min must filter against effective customer price"
      );
      assert.ok(
        controllerContent.includes('whereRaw("({$effectivePriceSql}) <= ?"'),
        "price_max must filter against effective customer price"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Multi-tier Customer Pricing Rules (getLowestValidCustomerUnitPrice)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Authoritative Lowest Customer Unit Price Resolution", () => {
    it("returns standard wholesale price when no discounts or tiers are active", () => {
      const mockProduct: Partial<Product> = {
        wholesale_price: 5.5,
        bulk_pricing_enabled: false,
        stock: 50,
        moq: 10,
      };
      assert.equal(getLowestValidCustomerUnitPrice(mockProduct), 5.5);
    });

    it("returns bulk price when bulk pricing is enabled and threshold is greater than moq", () => {
      const mockProduct: Partial<Product> = {
        wholesale_price: 5.0,
        bulk_pricing_enabled: true,
        bulk_threshold: 100,
        bulk_price: 3.5,
        moq: 10,
        stock: 500,
      };
      assert.equal(getLowestValidCustomerUnitPrice(mockProduct), 3.5);
    });

    it("returns full stock price when full stock is eligible and lowest", () => {
      const mockProduct: Partial<Product> = {
        wholesale_price: 10.0,
        bulk_pricing_enabled: false,
        full_stock_price: 6.0,
        moq: 10,
        stock: 100,
      };
      assert.equal(getLowestValidCustomerUnitPrice(mockProduct), 6.0);
    });

    it("evaluates lowest among wholesale, bulk, and full-stock tiers", () => {
      const mockProduct: Partial<Product> = {
        wholesale_price: 8.0,
        bulk_pricing_enabled: true,
        bulk_threshold: 50,
        bulk_price: 6.0,
        full_stock_price: 4.5,
        moq: 10,
        stock: 200,
      };
      assert.equal(getLowestValidCustomerUnitPrice(mockProduct), 4.5);
    });

    it("returns null for unpriced products without coercing to $0.00", () => {
      const mockProduct: Partial<Product> = {
        wholesale_price: 0,
        bulk_pricing_enabled: false,
        stock: 0,
      };
      assert.equal(getLowestValidCustomerUnitPrice(mockProduct), null);
    });

    it("verifies multi-tier catalog sorting simulation produces strictly monotonic order without inversions", () => {
      const mockProducts: Array<Omit<Partial<Product>, "id"> & { id: number; name: string }> = [
        { id: 1, name: "Alpha", wholesale_price: 10, bulk_pricing_enabled: true, bulk_threshold: 50, bulk_price: 4, stock: 100, moq: 10 }, // effective 4.0
        { id: 2, name: "Beta", wholesale_price: 3.5, bulk_pricing_enabled: false, stock: 100, moq: 10 }, // effective 3.5
        { id: 3, name: "Gamma", wholesale_price: 8, full_stock_price: 2.5, stock: 100, moq: 10 }, // effective 2.5
        { id: 4, name: "Delta", wholesale_price: 1.2, stock: 50, moq: 10 }, // effective 1.2
        { id: 5, name: "Epsilon", wholesale_price: 0, stock: 0 }, // unpriced -> null
        { id: 6, name: "Zeta", wholesale_price: 15, bulk_pricing_enabled: true, bulk_threshold: 20, bulk_price: 12, full_stock_price: 9, stock: 200, moq: 10 }, // effective 9.0
      ];

      // Comparator replicating ProductController logic
      const compareAsc = (a: typeof mockProducts[0], b: typeof mockProducts[0]) => {
        const priceA = getLowestValidCustomerUnitPrice(a);
        const priceB = getLowestValidCustomerUnitPrice(b);
        const unpricedA = priceA === null || priceA <= 0 ? 1 : 0;
        const unpricedB = priceB === null || priceB <= 0 ? 1 : 0;
        if (unpricedA !== unpricedB) return unpricedA - unpricedB;
        if (priceA !== null && priceB !== null && priceA !== priceB) return priceA - priceB;
        return b.id - a.id;
      };

      const sortedAsc = [...mockProducts].sort(compareAsc);
      const sortedPrices = sortedAsc.map((p) => getLowestValidCustomerUnitPrice(p));
      assert.deepEqual(sortedPrices, [1.2, 2.5, 3.5, 4.0, 9.0, null]);

      // Descending comparator
      const compareDesc = (a: typeof mockProducts[0], b: typeof mockProducts[0]) => {
        const priceA = getLowestValidCustomerUnitPrice(a);
        const priceB = getLowestValidCustomerUnitPrice(b);
        const unpricedA = priceA === null || priceA <= 0 ? 1 : 0;
        const unpricedB = priceB === null || priceB <= 0 ? 1 : 0;
        if (unpricedA !== unpricedB) return unpricedA - unpricedB;
        if (priceA !== null && priceB !== null && priceA !== priceB) return priceB - priceA;
        return b.id - a.id;
      };

      const sortedDesc = [...mockProducts].sort(compareDesc);
      const sortedPricesDesc = sortedDesc.map((p) => getLowestValidCustomerUnitPrice(p));
      assert.deepEqual(sortedPricesDesc, [9.0, 4.0, 3.5, 2.5, 1.2, null]);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Issue #6: Filter Sidebar Geometry, Scrollbar & Layout
  // ───────────────────────────────────────────────────────────────────────────
  describe("Filter Sidebar Geometry and Usable Scrollbar (Issue #6)", () => {
    const filterRailPath = path.join(
      rootDir,
      "src/components/common/GlobalFilterRail.tsx"
    );
    const filterRailContent = fs.readFileSync(filterRailPath, "utf-8");

    const searchPagePath = path.join(rootDir, "src/app/search/page.tsx");
    const searchPageContent = fs.readFileSync(searchPagePath, "utf-8");

    const globalsCssPath = path.join(rootDir, "src/app/globals.css");
    const globalsCssContent = fs.readFileSync(globalsCssPath, "utf-8");

    it("ensures filter-column has self-start so it does not stretch with the product grid", () => {
      assert.ok(
        filterRailContent.includes("filter-column hidden lg:block w-full shrink-0 self-start"),
        "Desktop filter-column must have self-start"
      );
    });

    it("anchors the desktop aside with sticky top-[84px] and max-h-[calc(100vh-100px)]", () => {
      assert.ok(
        filterRailContent.includes("sticky top-[84px]"),
        "Filter aside must be sticky with 84px top offset"
      );
      assert.ok(
        filterRailContent.includes("max-h-[calc(100vh-100px)]"),
        "Filter aside must constrain height to viewport bounds"
      );
      assert.ok(
        filterRailContent.includes("flex flex-col"),
        "Filter aside must be flex container"
      );
    });

    it("gives the scroll container min-h-0 and dedicated filter-scrollbar styling", () => {
      assert.ok(
        filterRailContent.includes("overflow-y-auto flex-1 min-h-0 pr-1.5 filter-scrollbar overscroll-contain"),
        "Scroll body must have flex-1 min-h-0 overflow-y-auto filter-scrollbar overscroll-contain"
      );
    });

    it("defines @utility filter-scrollbar in globals.css with visible track and thumb contrast", () => {
      assert.ok(
        globalsCssContent.includes("@utility filter-scrollbar"),
        "globals.css must define filter-scrollbar utility"
      );
      assert.ok(
        globalsCssContent.includes("width: 6px;"),
        "filter-scrollbar must have 6px width for desktop visibility"
      );
      assert.ok(
        globalsCssContent.includes("&::-webkit-scrollbar-track"),
        "filter-scrollbar must have styled track"
      );
      assert.ok(
        globalsCssContent.includes("&::-webkit-scrollbar-thumb"),
        "filter-scrollbar must have styled thumb"
      );
    });

    it("ensures main content grid uses items-start to prevent sidebar height stretch", () => {
      assert.ok(
        searchPageContent.includes(
          'grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] items-start gap-6 xl:gap-8 w-full'
        ),
        "Search page main container grid must specify items-start"
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Issue #5: Category Filtering Scroll Position Regression Test
  // ───────────────────────────────────────────────────────────────────────────
  describe("Category Filtering Scroll Position (Issue #5 Regression)", () => {
    const searchPagePath = path.join(rootDir, "src/app/search/page.tsx");
    const searchPageContent = fs.readFileSync(searchPagePath, "utf-8");

    it("anchors scroll to #product-listing-top with header clearance offset", () => {
      assert.ok(
        searchPageContent.includes('document.getElementById("product-listing-top")'),
        "Must find #product-listing-top element"
      );
      assert.ok(
        searchPageContent.includes("const stickyHeaderOffset = 84;"),
        "Must account for 84px sticky header clearance"
      );
      assert.ok(
        searchPageContent.includes("window.scrollTo({"),
        "Must scroll window to targetScrollY"
      );
    });

    it("preserves URL changes with { scroll: false } so browser does not snap to bottom or footer", () => {
      assert.ok(
        searchPageContent.includes("router.replace(targetUrl, { scroll: false });"),
        "URL update must specify { scroll: false }"
      );
    });
  });
});
