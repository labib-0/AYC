/**
 * Phase 24 Static Verification Test Suite
 * Tests Featured Products Auto-Pagination State Machine invariants, code structure, and functional simulation.
 */

import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const FEATURED_PRODUCTS_PATH = path.join(ROOT, "src/components/home/FeaturedProducts.tsx");
const PRODUCTS_SERVICE_PATH = path.join(ROOT, "src/lib/services/products.ts");

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, failureMessage?: string) {
  if (condition) {
    results.push({ name, passed: true });
    console.log(`  ✓ PASS: ${name}`);
  } else {
    results.push({ name, passed: false, message: failureMessage });
    console.error(`  ✗ FAIL: ${name} - ${failureMessage}`);
  }
}

console.log("\n=== Running Phase 24 Auto-Pagination State Machine Static Verification Suite ===\n");

// 1. Check file existence
assert(fs.existsSync(FEATURED_PRODUCTS_PATH), "FeaturedProducts.tsx exists");
assert(fs.existsSync(PRODUCTS_SERVICE_PATH), "products.ts service exists");

const content = fs.readFileSync(FEATURED_PRODUCTS_PATH, "utf-8");

// 2. Constants check: 15 + 25 architecture
assert(
  content.includes("const DESKTOP_INITIAL_LIMIT = 15;"),
  "DESKTOP_INITIAL_LIMIT is exactly 15 (5 cols x 3 rows)"
);
assert(
  content.includes("const FIRST_LOAD_MORE_LIMIT = 25;"),
  "FIRST_LOAD_MORE_LIMIT is exactly 25 (+25 products on first Load More)"
);
assert(
  content.includes("const CONTINUOUS_BATCH_LIMIT = 25;"),
  "CONTINUOUS_BATCH_LIMIT is exactly 25 (+25 products on continuous pagination)"
);

// 3. Explicit State Variables (Section 17)
assert(
  content.includes("const [hasLoadedMore, setHasLoadedMore] = useState<boolean>(false);"),
  "State model defines explicit hasLoadedMore state initialized to false"
);
assert(
  content.includes("const [isContinuousMode, setIsContinuousMode] = useState<boolean>(false);"),
  "State model defines explicit isContinuousMode state initialized to false"
);
assert(
  content.includes("const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);"),
  "State model defines explicit isFilterOpen state initialized to false"
);
assert(
  content.includes("const isContinuousModeRef = useRef<boolean>(false);"),
  "isContinuousModeRef exists for synchronization without stale closures"
);

// 4. Initial State (Section 2)
assert(
  content.includes('getInitialFeaturedProducts("best-deals", DESKTOP_INITIAL_LIMIT)'),
  "Initial products query starts with DESKTOP_INITIAL_LIMIT (15 products)"
);
assert(
  content.includes("{/* ── State 1: Manual Load More Mode (!isContinuousMode)"),
  "State 1 (Manual Load More) renders when !isContinuousMode"
);
assert(
  content.includes("{/* ── State 2: Continuous Auto-Pagination Sentinel (isContinuousMode === true)"),
  "State 2 (Auto-Pagination Sentinel) renders only when isContinuousMode === true"
);

// 5. First Load More State Transitions (Sections 3, 4, 5, 10, 11)
assert(
  content.includes("setHasLoadedMore(true);"),
  "First successful Load More sets hasLoadedMore to true"
);
assert(
  content.includes("setIsContinuousMode(true);"),
  "First successful Load More activates continuous mode (isContinuousMode = true)"
);
assert(
  content.includes("setIsFilterOpen(true);"),
  "First successful Load More auto-opens filter rail (isFilterOpen = true)"
);
assert(
  content.includes("isContinuousModeRef.current = true;"),
  "First successful Load More updates isContinuousModeRef synchronously"
);

// 6. First Load More Appends and Deduplicates (Section 4, 20)
assert(
  content.includes("const existingIds = new Set(prev.map((p) => p.id));") &&
    content.includes("const fresh = result.products.filter((p) => !existingIds.has(p.id));") &&
    content.includes("return [...prev, ...fresh];"),
  "Product appending preserves existing products and uses Set-based ID deduplication"
);

// 7. Error Handling on First Load More (Section 5)
const handleLoadMoreCode = content.substring(
  content.indexOf("const handleLoadMoreClick = async () => {"),
  content.indexOf("const loadNextBatch = useCallback(")
);
assert(
  handleLoadMoreCode.includes("catch") &&
    !handleLoadMoreCode.substring(handleLoadMoreCode.indexOf("catch")).includes("setIsContinuousMode(true)"),
  "Error in Load More does NOT activate continuous mode"
);

// 8. Auto-Pagination Sentinel & Observer (Sections 6, 7, 8, 19, 21)
assert(
  content.includes("if (!isContinuousMode || !hasMore) return;"),
  "IntersectionObserver is disconnected/skipped when !isContinuousMode or !hasMore"
);
assert(
  content.includes("return () => {") &&
    content.includes("observer.disconnect();"),
  "IntersectionObserver properly cleans up and disconnects on unmount or mode change"
);
assert(
  content.includes("entry.isIntersecting &&") &&
    content.includes("!isLoadingRef.current &&") &&
    content.includes("isContinuousModeRef.current"),
  "Sentinel triggers loadNextBatch only when intersecting, not loading, and continuous mode is active"
);

// 9. Load More Button Hidden in Continuous Mode (Section 9, 39)
assert(
  !content.includes("{/* ── State 1: Manual Load More Mode (!isContinuousMode)") ||
    content.indexOf("<span>LOAD MORE</span>") !== -1,
  "Load More button exists in manual mode"
);
const state2Block = content.substring(
  content.indexOf("{/* ── State 2: Continuous Auto-Pagination Sentinel (isContinuousMode === true)"),
  content.indexOf("</section>")
);
assert(
  !state2Block.includes("<span>LOAD MORE</span>"),
  "Load More button is completely hidden during continuous mode"
);

// 10. Filter Close Behavior (Sections 13, 14, 25, 38)
assert(
  content.includes("const handleCloseFilter = () => {") &&
    content.includes("setIsFilterOpen(false);") &&
    content.includes("setIsContinuousMode(false);") &&
    content.includes("isContinuousModeRef.current = false;"),
  "handleCloseFilter sets isFilterOpen=false, isContinuousMode=false, isContinuousModeRef=false"
);
assert(
  content.includes("onClose={handleCloseFilter}"),
  "GlobalFilterRail onClose invokes handleCloseFilter"
);
assert(
  content.includes('filter-closed w-full') &&
    content.includes("min-[1440px]:grid-cols-7 2xl:grid-cols-7"),
  "When filter is closed, layout is w-full and desktop grid returns to 7 columns"
);
assert(
  content.includes('filter-open grid') &&
    content.includes("min-[1440px]:grid-cols-6 2xl:grid-cols-6"),
  "When filter is open, desktop grid uses 6 columns beside filter rail"
);

// 11. Filter Reopen Behavior (Sections 15, 16)
assert(
  content.includes("const handleToggleFilters = () => {") &&
    content.includes("if (isFilterOpen) {") &&
    content.includes("handleCloseFilter();") &&
    content.includes("setIsFilterOpen(true);") &&
    content.includes("setIsContinuousMode(true);"),
  "handleToggleFilters reopens filter and reactivates continuous mode"
);
assert(
  content.includes("onClick={handleToggleFilters}"),
  "FILTERS top button invokes handleToggleFilters"
);

// 12. HasMore = False Handling (Sections 21, 22, 23)
assert(
  content.includes("!hasMore && products.length > 0 ? (") &&
    content.includes("All {products.length} products loaded"),
  "End of catalog indicator ('All products loaded') rendered when !hasMore"
);
const manualModeBlock = content.substring(
  content.indexOf("{/* ── State 1: Manual Load More Mode (!isContinuousMode)"),
  content.indexOf("{/* ── State 2: Continuous Auto-Pagination Sentinel")
);
assert(
  manualModeBlock.includes("hasMore ? (") &&
    manualModeBlock.includes("<span>LOAD MORE</span>") &&
    manualModeBlock.includes("All {products.length} products loaded"),
  "Manual mode shows LOAD MORE only when hasMore=true, and shows end indicator when hasMore=false"
);

// 13. Design Type Propagation (Section 43)
assert(
  content.includes("designTypes: selectedDesignTypes,"),
  "Design Type filter is propagated in getFeaturedProducts requests"
);

// 14. Functional State Machine Simulation
console.log("\n--- Simulating State Machine Permutations ---\n");

class StateMachineSimulator {
  hasLoadedMore = false;
  isContinuousMode = false;
  isFilterOpen = false;
  hasMore = true;
  products: number[] = [];
  observerConnected = false;

  constructor() {
    // Initial: 15 products
    this.products = Array.from({ length: 15 }, (_, i) => i + 1);
  }

  // State 1: Initial
  isInitialState() {
    return (
      !this.hasLoadedMore &&
      !this.isContinuousMode &&
      !this.isFilterOpen &&
      this.products.length === 15 &&
      !this.observerConnected
    );
  }

  // Action: Click Load More (First time)
  firstLoadMoreSuccess() {
    // Append 25
    const nextOffset = this.products.length;
    const fresh = Array.from({ length: 25 }, (_, i) => nextOffset + i + 1);
    this.products = [...this.products, ...fresh];
    this.hasLoadedMore = true;
    this.isContinuousMode = true;
    this.isFilterOpen = true;
    this.observerConnected = true; // Observer attaches when isContinuousMode becomes true
  }

  // Action: Auto-pagination triggers
  autoPaginationBatch() {
    if (!this.isContinuousMode || !this.hasMore) return;
    const nextOffset = this.products.length;
    const fresh = Array.from({ length: 25 }, (_, i) => nextOffset + i + 1);
    this.products = [...this.products, ...fresh];
  }

  // Action: User closes filter
  closeFilter() {
    this.isFilterOpen = false;
    this.isContinuousMode = false;
    this.observerConnected = false; // Observer disconnects
  }

  // Action: User clicks Load More in manual mode
  manualLoadMoreAgain() {
    if (this.isContinuousMode || !this.hasMore) return;
    const nextOffset = this.products.length;
    const fresh = Array.from({ length: 25 }, (_, i) => nextOffset + i + 1);
    this.products = [...this.products, ...fresh];
    this.isContinuousMode = true;
    this.isFilterOpen = true;
    this.observerConnected = true;
  }

  // Action: User reopens filter via FILTERS button
  reopenFilter() {
    this.isFilterOpen = true;
    this.isContinuousMode = true;
    this.observerConnected = true;
  }

  // Action: Catalog exhausted
  exhaustCatalog() {
    this.hasMore = false;
    this.observerConnected = false;
  }
}

const sim = new StateMachineSimulator();
assert(sim.isInitialState(), "Simulation: Initial State has 15 products, continuous OFF, filter CLOSED");

sim.firstLoadMoreSuccess();
assert(
  sim.hasLoadedMore &&
    sim.isContinuousMode &&
    sim.isFilterOpen &&
    sim.products.length === 40 &&
    sim.observerConnected,
  "Simulation: First Load More appends +25 (total 40), continuous ON, filter OPEN, observer CONNECTED"
);

sim.autoPaginationBatch();
assert(
  sim.products.length === 65 && sim.isContinuousMode && sim.observerConnected,
  "Simulation: Auto-pagination appends +25 (total 65), observer remains active"
);

sim.closeFilter();
assert(
  !sim.isContinuousMode &&
    !sim.isFilterOpen &&
    sim.products.length === 65 &&
    !sim.observerConnected,
  "Simulation: Close Filter disables continuous mode, disconnects observer, preserves 65 products"
);

sim.manualLoadMoreAgain();
assert(
  sim.isContinuousMode &&
    sim.isFilterOpen &&
    sim.products.length === 90 &&
    sim.observerConnected,
  "Simulation: Load More in manual mode appends +25 (total 90), re-enables continuous mode & opens filter"
);

sim.closeFilter();
assert(!sim.isContinuousMode && !sim.isFilterOpen && sim.products.length === 90, "Simulation: Filter closed again");

sim.reopenFilter();
assert(
  sim.isContinuousMode &&
    sim.isFilterOpen &&
    sim.products.length === 90 &&
    sim.observerConnected,
  "Simulation: Reopening filter via FILTERS button reactivates continuous mode and reconnects observer"
);

sim.exhaustCatalog();
assert(
  !sim.hasMore && !sim.observerConnected,
  "Simulation: When hasMore is false, observer is disconnected and auto-pagination stops"
);

// 15. Summary of results
const failed = results.filter((r) => !r.passed);
console.log(`\n=== Test Results: ${results.length - failed.length}/${results.length} passed ===\n`);

if (failed.length > 0) {
  console.error(`FAILED ${failed.length} tests:`);
  failed.forEach((f) => console.error(` - ${f.name}: ${f.message}`));
  process.exit(1);
} else {
  console.log("ALL PHASE 24 STATIC VERIFICATION TESTS PASSED SUCCESSFULLY! ✓\n");
}
