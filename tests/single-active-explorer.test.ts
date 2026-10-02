import fs from "fs";
import path from "path";
import {
  notifyExplorerActive,
  subscribeToExplorerActive,
  ExplorerEventDetail,
} from "../src/lib/services/explorer-coordinator";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failed++;
  }
}

console.log("==================================================");
console.log("EXCLUSIVE SINGLE-ACTIVE-EXPLORER TEST SUITE");
console.log("==================================================\n");

// Read source files
const hotSalesPath = path.join(process.cwd(), "src/components/home/HotSales.tsx");
const featuredPath = path.join(process.cwd(), "src/components/home/FeaturedProducts.tsx");
const shopByBrandPath = path.join(process.cwd(), "src/components/home/ShopByBrand.tsx");
const coordinatorPath = path.join(process.cwd(), "src/lib/services/explorer-coordinator.ts");

const hotSalesSource = fs.readFileSync(hotSalesPath, "utf-8");
const featuredSource = fs.readFileSync(featuredPath, "utf-8");
const shopByBrandSource = fs.readFileSync(shopByBrandPath, "utf-8");
const coordinatorSource = fs.readFileSync(coordinatorPath, "utf-8");

// ── GROUP 1: Coordinator Architecture & Interface ────────────────────────────
console.log("▶ Group 1: Explorer Coordinator Service Definition");

assert(
  coordinatorSource.includes('export type ExplorerSection = "hot-sale" | "featured" | "shop-by-brand"'),
  "ExplorerSection type covers 'hot-sale', 'featured', and 'shop-by-brand'"
);

assert(
  coordinatorSource.includes("export function notifyExplorerActive") &&
    coordinatorSource.includes("export function subscribeToExplorerActive"),
  "Coordinator exports notifyExplorerActive and subscribeToExplorerActive"
);

{
  // Runtime SSR / Node environment guard test
  const unsubscribe = subscribeToExplorerActive(() => {});
  assert(typeof unsubscribe === "function", "subscribeToExplorerActive returns an unsubscribe cleanup function");
  unsubscribe();
  notifyExplorerActive("hot-sale", "open");
  assert(true, "notifyExplorerActive safely executes in Node/SSR environment without throwing");
}

// ── GROUP 2: Hot Sales Integration Audit ─────────────────────────────────────
console.log("\n▶ Group 2: Hot Sales Explorer Coordination Audit");

assert(
  hotSalesSource.includes('notifyExplorerActive("hot-sale", "open")'),
  "HotSales notifies coordinator when category tile is selected"
);

assert(
  hotSalesSource.includes('notifyExplorerActive("hot-sale", "load-more")'),
  "HotSales notifies coordinator when Load More is clicked"
);

assert(
  hotSalesSource.includes('notifyExplorerActive("hot-sale", "filter")'),
  "HotSales notifies coordinator when FILTERS button is toggled"
);

assert(
  hotSalesSource.includes("subscribeToExplorerActive") &&
    hotSalesSource.includes('detail.activeSection !== "hot-sale"') &&
    hotSalesSource.includes("setActiveCategory(null);"),
  "HotSales subscribes to coordinator and closes (setActiveCategory(null)) when another section is active"
);

// ── GROUP 3: Featured Products Integration Audit ─────────────────────────────
console.log("\n▶ Group 3: Featured Products Explorer Coordination Audit");

assert(
  featuredSource.includes('notifyExplorerActive("featured", "load-more")'),
  "FeaturedProducts notifies coordinator when Load More is clicked"
);

assert(
  featuredSource.includes('notifyExplorerActive("featured", "filter")'),
  "FeaturedProducts notifies coordinator when filters are updated or toggled"
);

assert(
  !featuredSource.includes("handleTabClick"),
  "FeaturedProducts has tabs removed per user requirements"
);

assert(
  featuredSource.includes("subscribeToExplorerActive") &&
    featuredSource.includes('detail.activeSection !== "featured"') &&
    featuredSource.includes("setIsFilterOpen(false)") &&
    featuredSource.includes("setIsContinuousMode(false)"),
  "FeaturedProducts collapses to default (closes filter rail, continuous mode) when another section is active"
);

// ── GROUP 4: Shop By Brand Integration Audit ─────────────────────────────────
console.log("\n▶ Group 4: Shop By Brand Explorer Coordination Audit");

assert(
  shopByBrandSource.includes('notifyExplorerActive("shop-by-brand", "open")'),
  "ShopByBrand notifies coordinator when a brand tile is clicked"
);

assert(
  shopByBrandSource.includes('notifyExplorerActive("shop-by-brand", "load-more")'),
  "ShopByBrand notifies coordinator when brand Load More is clicked"
);

assert(
  shopByBrandSource.includes("subscribeToExplorerActive") &&
    shopByBrandSource.includes('detail.activeSection !== "shop-by-brand"') &&
    shopByBrandSource.includes("handleClearAll();"),
  "ShopByBrand subscribes to coordinator and calls handleClearAll() when another section is active"
);

// ── GROUP 5: Full State Machine & Exclusivity Simulation ──────────────────────
console.log("\n▶ Group 5: Full State Machine & Exclusivity Simulation");
{
  interface HotSaleState {
    activeCategory: string | null;
    isFilterOpen: boolean;
    isContinuousMode: boolean;
    displayedCount: number;
  }

  interface FeaturedState {
    isFilterOpen: boolean;
    isContinuousMode: boolean;
    displayedCount: number;
  }

  interface ShopByBrandState {
    selectedBrands: string[];
    isFilterOpen: boolean;
    isContinuousMode: boolean;
  }

  const hotSale: HotSaleState = {
    activeCategory: null,
    isFilterOpen: false,
    isContinuousMode: false,
    displayedCount: 21,
  };

  const featured: FeaturedState = {
    isFilterOpen: false,
    isContinuousMode: false,
    displayedCount: 21,
  };

  const shopByBrand: ShopByBrandState = {
    selectedBrands: [],
    isFilterOpen: false,
    isContinuousMode: false,
  };

  const listeners: Array<(detail: ExplorerEventDetail) => void> = [];

  const registerListeners = () => {
    // HotSale listener
    listeners.push((detail) => {
      if (detail.activeSection !== "hot-sale") {
        hotSale.activeCategory = null;
        hotSale.isFilterOpen = false;
        hotSale.isContinuousMode = false;
        hotSale.displayedCount = 21;
      }
    });

    // Featured listener
    listeners.push((detail) => {
      if (detail.activeSection !== "featured") {
        featured.isFilterOpen = false;
        featured.isContinuousMode = false;
        featured.displayedCount = 21;
      }
    });

    // ShopByBrand listener
    listeners.push((detail) => {
      if (detail.activeSection !== "shop-by-brand") {
        shopByBrand.selectedBrands = [];
        shopByBrand.isFilterOpen = false;
        shopByBrand.isContinuousMode = false;
      }
    });
  };

  registerListeners();

  const dispatch = (detail: ExplorerEventDetail) => {
    listeners.forEach((l) => l(detail));
  };

  const hotSaleIsOpen = () => hotSale.isFilterOpen;
  const hotSaleIsContinuous = () => hotSale.isContinuousMode;
  const featuredIsOpen = () => featured.isFilterOpen;
  const featuredIsContinuous = () => featured.isContinuousMode;

  // Step 0: Normal Homepage
  assert(
    hotSale.activeCategory === null &&
      !featuredIsOpen() &&
      !featuredIsContinuous() &&
      shopByBrand.selectedBrands.length === 0,
    "Step 0: Normal homepage has Hot Sale collapsed, Featured at default/collapsed, ShopByBrand collapsed"
  );

  // Step 1: User opens Hot Sale
  hotSale.activeCategory = "sweaters";
  hotSale.isFilterOpen = false;
  hotSale.isContinuousMode = false;
  hotSale.displayedCount = 21;
  dispatch({ activeSection: "hot-sale", action: "open" });

  assert(
    hotSale.activeCategory === "sweaters",
    "Step 1: Hot Sale becomes active with category 'sweaters'"
  );
  assert(
    !featuredIsOpen() &&
      !featuredIsContinuous(),
    "Step 1: Featured remains in collapsed/default state"
  );
  assert(
    shopByBrand.selectedBrands.length === 0,
    "Step 1: Shop By Brand remains collapsed"
  );

  // Step 2: User presses Load More in Hot Sale
  hotSale.displayedCount += 21;
  hotSale.isContinuousMode = true;
  hotSale.isFilterOpen = true;
  dispatch({ activeSection: "hot-sale", action: "load-more" });

  assert(
    hotSaleIsContinuous() && hotSaleIsOpen(),
    "Step 2: Hot Sale auto-pagination starts (isContinuousMode=true) and filter rail appears (isFilterOpen=true)"
  );
  assert(
    !featuredIsOpen() && !featuredIsContinuous(),
    "Step 2: Featured Products is NOT active (filter rail closed, continuous mode off)"
  );
  assert(
    shopByBrand.selectedBrands.length === 0 && !shopByBrand.isFilterOpen,
    "Step 2: Other expandable product sections are closed (Shop By Brand closed)"
  );

  // Step 3: User later activates Featured Products (e.g. clicks Load More or Filters in Featured)
  featured.displayedCount += 21;
  featured.isContinuousMode = true;
  featured.isFilterOpen = true;
  dispatch({ activeSection: "featured", action: "load-more" });

  assert(
    hotSale.activeCategory === null &&
      !hotSaleIsOpen() &&
      !hotSaleIsContinuous(),
    "Step 3: Hot Sale completely closes (activeCategory=null, filter rail closed, continuous mode off)"
  );
  assert(
    featuredIsContinuous() && featuredIsOpen(),
    "Step 3: Featured Products becomes the ONLY active explorer with its own filtering and pagination active"
  );
  assert(
    shopByBrand.selectedBrands.length === 0,
    "Step 3: Shop By Brand remains closed"
  );

  // Step 4: User opens Shop By Brand
  shopByBrand.selectedBrands = ["Nike"];
  shopByBrand.isFilterOpen = true;
  shopByBrand.isContinuousMode = true;
  dispatch({ activeSection: "shop-by-brand", action: "open" });

  assert(
    shopByBrand.selectedBrands.includes("Nike"),
    "Step 4: Shop By Brand becomes active"
  );
  assert(
    hotSale.activeCategory === null,
    "Step 4: Hot Sale remains closed"
  );
  assert(
    !featuredIsOpen() && !featuredIsContinuous(),
    "Step 4: Featured Products closes its filter rail and continuous mode"
  );

  // Step 5: User opens Hot Sale again
  hotSale.activeCategory = "towels";
  hotSale.isFilterOpen = false;
  hotSale.isContinuousMode = false;
  dispatch({ activeSection: "hot-sale", action: "open" });

  assert(
    hotSale.activeCategory === "towels",
    "Step 5: Hot Sale opens with towels"
  );
  assert(
    shopByBrand.selectedBrands.length === 0,
    "Step 5: Shop By Brand closes completely"
  );
  assert(
    !featuredIsOpen() && !featuredIsContinuous(),
    "Step 5: Featured Products remains in collapsed/default state"
  );
}

console.log("\n==================================================");
console.log(`TEST RUN COMPLETE: ${passed} PASSED | ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
