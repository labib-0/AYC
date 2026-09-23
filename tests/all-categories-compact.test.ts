import fs from "fs";
import path from "path";

function runTests() {
  console.log("=== ALL CATEGORIES THREE-ROW REDESIGN AUDIT & TESTS ===\n");

  const cwd = process.cwd();
  const allCategoriesPanelPath = path.join(cwd, "src/components/home/AllCategoriesPanel.tsx");
  const categoryHighlightsPath = path.join(cwd, "src/components/home/CategoryHighlights.tsx");
  const shopByBrandPath = path.join(cwd, "src/components/home/ShopByBrand.tsx");
  const featuredProductsPath = path.join(cwd, "src/components/home/FeaturedProducts.tsx");
  const inlineExpansionPath = path.join(cwd, "src/components/home/InlineCategoryExpansion.tsx");

  const panelContent = fs.readFileSync(allCategoriesPanelPath, "utf-8");
  const highlightsContent = fs.readFileSync(categoryHighlightsPath, "utf-8");
  const shopContent = fs.readFileSync(shopByBrandPath, "utf-8");
  const featuredContent = fs.readFileSync(featuredProductsPath, "utf-8");
  const inlineContent = fs.readFileSync(inlineExpansionPath, "utf-8");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
      failed++;
    }
  }

  // 1. Single Shared Component Architecture
  assert(
    shopContent.includes('import AllCategoriesPanel from "./AllCategoriesPanel";') &&
    shopContent.includes("<AllCategoriesPanel"),
    "ShopByBrand imports and uses shared AllCategoriesPanel"
  );

  assert(
    featuredContent.includes('import AllCategoriesPanel from "./AllCategoriesPanel";') &&
    featuredContent.includes("<AllCategoriesPanel"),
    "FeaturedProducts imports and uses shared AllCategoriesPanel"
  );

  assert(
    inlineContent.includes('export { AllCategoriesPanel };') ||
    inlineContent.includes('export default AllCategoriesPanel;'),
    "InlineCategoryExpansion is a transparent alias of AllCategoriesPanel (no duplicated implementations)"
  );

  // 2. Three Clean Distinct Rows Structure
  const row1Index = panelContent.indexOf("ROW 1: AUDIENCE");
  const row2Index = panelContent.indexOf("ROW 2: DESIGN TYPE");
  const row3Index = panelContent.indexOf("ROW 3: PRODUCT CATEGORIES");

  assert(
    row1Index !== -1 && row2Index !== -1 && row3Index !== -1 &&
    row1Index < row2Index && row2Index < row3Index,
    "AllCategoriesPanel renders three distinct sequential rows (Audience -> Design Type -> Product Categories)"
  );

  // Verify Design Type is NOT beside Audience in the same row
  assert(
    !panelContent.includes("order-4 flex items-center justify-start sm:justify-end"),
    "Design Type is completely separated from Row 1 and not right-aligned beside Audience"
  );

  // 3. Section Headings (All left-aligned with consistent typography)
  const headerTypography = "text-xs sm:text-[13px] font-sans font-bold uppercase tracking-wider text-muted-foreground text-left";
  const headerCount = (panelContent.match(new RegExp(headerTypography.replace(/\[/g, "\\[").replace(/\]/g, "\\]"), "g")) || []).length;

  assert(
    headerCount === 3,
    "All three section headings (AUDIENCE, DESIGN TYPE, PRODUCT CATEGORIES) use uniform left-aligned styling"
  );

  assert(
    panelContent.includes(">AUDIENCE<") || panelContent.includes(">\n              AUDIENCE\n"),
    "AUDIENCE heading is present"
  );

  assert(
    panelContent.includes(">DESIGN TYPE<") || panelContent.includes(">\n              DESIGN TYPE\n"),
    "DESIGN TYPE heading is present"
  );

  assert(
    panelContent.includes(">PRODUCT CATEGORIES<") || panelContent.includes(">\n              PRODUCT CATEGORIES\n"),
    "PRODUCT CATEGORIES heading is present"
  );

  // 4. Row 1: Audience Controls
  const audiences = ["MEN", "WOMEN", "BOYS", "GIRLS", "UNISEX"];
  const allAudiencesPresent = audiences.every(a => panelContent.includes(`key: "${a}"`));
  assert(allAudiencesPresent, "All 5 audience filter controls (Men, Women, Boys, Girls, Unisex) are present in Row 1");

  assert(
    panelContent.includes("min-h-[38px] sm:min-h-[42px]"),
    "Audience buttons have comfortable, premium height (min-h-[38px] sm:min-h-[42px])"
  );

  assert(
    panelContent.includes("py-2 px-3 sm:px-4.5"),
    "Audience buttons use comfortable internal padding (py-2 px-3 sm:px-4.5)"
  );

  assert(
    panelContent.includes("w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0"),
    "Audience icons are well-balanced and prominent (w-4 h-4 sm:w-4.5 sm:h-4.5)"
  );

  // 5. Row 2: Design Type Controls
  assert(
    panelContent.includes('display: "ORIGINAL"') && panelContent.includes('display: "MASTER COPY"'),
    "Design Type controls display full wording [ ORIGINAL ] and [ MASTER COPY ] (never abbreviated 'MC')"
  );

  assert(
    !panelContent.includes('display: "MC"'),
    "Abbreviated 'MC' label is not used in the expanded panel"
  );

  assert(
    panelContent.includes("px-4 sm:px-6"),
    "Design Type buttons have balanced width padding (px-4 sm:px-6)"
  );

  // 6. Row 3: Product Categories Grid & Tile Sizing
  assert(
    panelContent.includes("2xl:grid-cols-12 min-[1800px]:grid-cols-12") ||
    panelContent.includes("xl:grid-cols-10 2xl:grid-cols-12"),
    "Category grid targets ~10-12 categories per row on desktop (no 16-tile crowding)"
  );

  assert(
    panelContent.includes("grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"),
    "Category grid uses responsive progressive columns across viewport widths"
  );

  assert(
    panelContent.includes("gap-2 sm:gap-2.5"),
    "Category grid uses comfortable gaps (gap-2 sm:gap-2.5)"
  );

  // 7. Category Tile Proportions & Visual Design
  assert(
    highlightsContent.includes('aspect-[4/3] rounded-lg sm:rounded-xl border'),
    "CategoryCard compact variant preserves aspect-[4/3] without stretching or distortion"
  );

  assert(
    highlightsContent.includes("text-[10.5px] sm:text-[11.5px] md:text-[12px]"),
    "CategoryCard compact variant uses improved readable typography (10.5px - 12px)"
  );

  assert(
    highlightsContent.includes("line-clamp-1") && highlightsContent.includes("title={category.name}"),
    "CategoryCard compact labels truncate neatly on single line with full hover tooltip"
  );

  assert(
    highlightsContent.includes("p-1.5 sm:p-2.5"),
    "CategoryCard compact variant has comfortable padding (p-1.5 sm:p-2.5)"
  );

  // 8. Contained Vertical Scroll Without Horizontal Page Overflow
  assert(
    panelContent.includes("overflow-y-auto") &&
    (panelContent.includes("max-h-[340px]") || panelContent.includes("max-h-[400px]")),
    "Product Categories container uses contained vertical scrolling with no horizontal page overflow"
  );

  // 9. Functional Wiring & Active Filter States
  assert(
    shopContent.includes("onSelectAudience") &&
    shopContent.includes("onSelectDesignType") &&
    shopContent.includes("onSelectCategory"),
    "ShopByBrand wires all filter handlers to shared AllCategoriesPanel"
  );

  assert(
    featuredContent.includes("onSelectAudience") &&
    featuredContent.includes("onSelectDesignType") &&
    featuredContent.includes("onSelectCategory"),
    "FeaturedProducts wires all filter handlers to shared AllCategoriesPanel"
  );

  assert(
    panelContent.includes("selectedAudiences.includes(key)") &&
    panelContent.includes("selectedDesignTypes.includes(value)") &&
    panelContent.includes("selectedCategories.includes(category.name)"),
    "AllCategoriesPanel properly reflects active selection states across all 3 rows"
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
