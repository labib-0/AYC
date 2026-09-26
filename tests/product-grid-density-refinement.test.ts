import fs from "fs";
import path from "path";

// ANSI color codes
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const BLUE = "\x1b[34m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    console.log(`${GREEN}✅ [PASS]${RESET} ${testName}`);
    passedCount++;
  } else {
    console.error(`${RED}❌ [FAIL]${RESET} ${testName}`);
    if (failureDetails) {
      console.error(`   ${failureDetails}`);
    }
    failedCount++;
  }
}

console.log(`${BOLD}${BLUE}==================================================`);
console.log(`PRODUCT GRID DENSITY & CARD COMPACTNESS REFINEMENT TESTS`);
console.log(`==================================================${RESET}\n`);

// 1. Audit ProductCard.tsx
const productCardPath = path.join(process.cwd(), "src/components/product/ProductCard.tsx");
const productCardContent = fs.readFileSync(productCardPath, "utf-8");

console.log(`${BOLD}▶ Group 1: ProductCard Component Architecture & Typography${RESET}`);

assert(
  productCardContent.includes("aspect-[3/4]"),
  "Product image ratio strictly preserved at canonical 3:4 (aspect-[3/4])"
);

assert(
  !productCardContent.includes("aspect-[4/5]") && !productCardContent.includes("aspect-square"),
  "Product card does NOT change image ratio to 4:5 or square to compensate for height"
);

assert(
  productCardContent.includes("text-[14px] font-body font-medium") && productCardContent.includes("leading-snug"),
  "Product name uses exact 14px Inter font (text-[14px] font-body font-medium) with leading-snug"
);

assert(
  productCardContent.includes("line-clamp-2") && (productCardContent.includes("min-h-[2.4rem]") || productCardContent.includes("min-h-[2.25rem]")),
  "Product name uses consistent 2-line clamp to avoid vertical stretching"
);

assert(
  productCardContent.includes("text-[17px] sm:text-[18px] font-bold text-foreground tabular-nums"),
  "Product price uses restored approved typography: bold 17-18px tabular-nums"
);

assert(
  productCardContent.includes("text-[13px] font-medium text-muted-foreground uppercase tracking-wider") && productCardContent.includes("/ pc"),
  "/ pc uses restored approved 13px font-medium uppercase tracking-wider"
);

assert(
  productCardContent.includes("text-[13px] font-body text-muted-foreground font-medium") && productCardContent.includes("MOQ"),
  "MOQ uses restored approved 13px font-body text-muted-foreground font-medium"
);

assert(
  productCardContent.includes("px-2.5 sm:px-3 pt-2 pb-2 sm:pt-2.5 sm:pb-2.5"),
  "Card internal padding is compacted (pt-2 pb-2 sm:pt-2.5 sm:pb-2.5) while preserving safe horizontal gutters"
);

assert(
  productCardContent.includes("MASTER COPY"),
  "Master Copy user-facing terminology preserved without reverting to 'MC'"
);

// 2. Audit FeaturedProducts.tsx
const featuredPath = path.join(process.cwd(), "src/components/home/FeaturedProducts.tsx");
const featuredContent = fs.readFileSync(featuredPath, "utf-8");

console.log(`\n${BOLD}▶ Group 2: FeaturedProducts Container Width & Grid Column Rules${RESET}`);

assert(
  featuredContent.includes("max-w-[1728px]") || featuredContent.includes("max-w-[1760px]"),
  "Featured Products content container is widened (max-w-[1728px] 2xl:max-w-[1760px]) to reduce excessive side whitespace"
);

assert(
  featuredContent.includes("px-4 sm:px-6 lg:px-8 xl:px-8"),
  "Featured Products uses controlled outer gutters (px-8) instead of excessive margins"
);

assert(
  featuredContent.includes("xl:grid-cols-6 2xl:grid-cols-6"),
  "Normal desktop grid displays exactly 6 products per row when filter rail is closed"
);

assert(
  featuredContent.includes("xl:grid-cols-5 2xl:grid-cols-5"),
  "Grid displays exactly 5 products per row beside the 280px filter rail when filter is open"
);

assert(
  !featuredContent.includes("grid-cols-7") && !featuredContent.includes("xl:grid-cols-7"),
  "Grid never exceeds 6 columns on desktop"
);

assert(
  featuredContent.includes("INITIAL_PRODUCT_LIMIT = 21"),
  "Initial display limit of 21 products is strictly preserved"
);

// 3. Audit Shared Explorers (HotSales, ShopByBrand, ProductGrid, Search)
console.log(`\n${BOLD}▶ Group 3: Shared Explorers & Listing Pages Consistency${RESET}`);

const hotSalesPath = path.join(process.cwd(), "src/components/home/HotSales.tsx");
const hotSalesContent = fs.readFileSync(hotSalesPath, "utf-8");

assert(
  hotSalesContent.includes("xl:grid-cols-6 2xl:grid-cols-6") && hotSalesContent.includes("xl:grid-cols-5 2xl:grid-cols-5"),
  "HotSales product grid follows consistent 6 closed / 5 open desktop columns"
);

assert(
  hotSalesContent.includes("gap-3 sm:gap-3.5 xl:gap-4"),
  "HotSales product grid replaced excessive gap-y-10 with compact gap-3 sm:gap-3.5 xl:gap-4"
);

const shopByBrandPath = path.join(process.cwd(), "src/components/home/ShopByBrand.tsx");
const shopByBrandContent = fs.readFileSync(shopByBrandPath, "utf-8");

assert(
  shopByBrandContent.includes("xl:grid-cols-6 2xl:grid-cols-6") && shopByBrandContent.includes("xl:grid-cols-5 2xl:grid-cols-5"),
  "ShopByBrand expansion grid follows consistent 6 closed / 5 open desktop columns"
);

const searchPath = path.join(process.cwd(), "src/app/search/page.tsx");
const searchContent = fs.readFileSync(searchPath, "utf-8");

assert(
  searchContent.includes("xl:grid-cols-6 2xl:grid-cols-6") && searchContent.includes("xl:grid-cols-5 2xl:grid-cols-5"),
  "Search page product grid aligns with 6 closed / 5 open desktop columns"
);

// 4. Audit ProductCardSkeleton.tsx
const skeletonPath = path.join(process.cwd(), "src/components/product/ProductCardSkeleton.tsx");
const skeletonContent = fs.readFileSync(skeletonPath, "utf-8");

console.log(`\n${BOLD}▶ Group 4: Skeleton Shimmer Precision Alignment${RESET}`);

assert(
  skeletonContent.includes("aspect-[3/4]"),
  "ProductCardSkeleton preserves canonical 3:4 aspect ratio"
);

assert(
  skeletonContent.includes("px-2.5 sm:px-3 pt-2 pb-2 sm:pt-2.5 sm:pb-2.5"),
  "ProductCardSkeleton uses identical compact padding to avoid layout shifts"
);

console.log(`\n${BOLD}==================================================`);
console.log(`TEST RUN COMPLETE: ${passedCount} PASSED | ${failedCount} FAILED`);
console.log(`==================================================${RESET}`);

if (failedCount > 0) {
  process.exit(1);
}
