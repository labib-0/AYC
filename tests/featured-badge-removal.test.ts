/**
 * Test: FEATURED Badge Removal from Product Cards & Images
 * 
 * Verifies:
 * 1. ProductPromotionBadges never outputs a "FEATURED" badge.
 * 2. NEW badge is rendered when isNew is active.
 * 3. HOT badge is rendered when isHot is active.
 * 4. Product with isFeatured = true does not render any FEATURED badge across 'card', 'modal', or 'detail' variants.
 * 5. Product with isFeatured = true, isHot = false, isNew = false returns null (no badges).
 */

import React from "react";
import ReactDOMServer from "react-dom/server";
import ProductPromotionBadges from "../src/components/common/ProductPromotionBadges";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log("\n=======================================================");
console.log("RUNNING FEATURED BADGE REMOVAL AUDIT");
console.log("=======================================================\n");

// TEST 1: Product with only is_featured = true
const featuredOnlyProduct = {
  id: "p1",
  name: "Featured Blazer",
  is_featured: true,
  is_new: false,
  is_hot: false,
};

const renderedCardFeaturedOnly = ReactDOMServer.renderToStaticMarkup(
  React.createElement(ProductPromotionBadges, { product: featuredOnlyProduct, variant: "card" })
);

assert(
  renderedCardFeaturedOnly === "",
  "TEST 1: Product marked only as Featured produces NO badge markup (returns null)"
);

assert(
  !renderedCardFeaturedOnly.includes("FEATURED"),
  "TEST 1b: Card markup does not contain 'FEATURED'"
);

// TEST 2: Product with is_featured = true AND is_hot = true
const featuredAndHotProduct = {
  id: "p2",
  name: "Featured Hot T-Shirt",
  is_featured: true,
  is_hot: true,
  is_new: false,
};

const renderedCardHot = ReactDOMServer.renderToStaticMarkup(
  React.createElement(ProductPromotionBadges, { product: featuredAndHotProduct, variant: "card" })
);

assert(
  renderedCardHot.includes("HOT"),
  "TEST 2a: HOT badge is rendered when isHot is active"
);

assert(
  !renderedCardHot.includes("FEATURED"),
  "TEST 2b: FEATURED badge is NOT rendered even when isFeatured = true"
);

// TEST 3: Product with is_featured = true AND is_new = true
const featuredAndNewProduct = {
  id: "p3",
  name: "Featured New Jeans",
  is_featured: true,
  is_hot: false,
  is_new: true,
};

const renderedCardNew = ReactDOMServer.renderToStaticMarkup(
  React.createElement(ProductPromotionBadges, { product: featuredAndNewProduct, variant: "card" })
);

assert(
  renderedCardNew.includes("NEW"),
  "TEST 3a: NEW badge is rendered when isNew is active"
);

assert(
  !renderedCardNew.includes("FEATURED"),
  "TEST 3b: FEATURED badge is NOT rendered when isFeatured = true"
);

// TEST 4: Detail & Modal variants check
const renderedDetail = ReactDOMServer.renderToStaticMarkup(
  React.createElement(ProductPromotionBadges, { product: featuredAndHotProduct, variant: "detail" })
);
assert(
  renderedDetail.includes("HOT") && !renderedDetail.includes("FEATURED"),
  "TEST 4a: Detail variant renders HOT but NEVER FEATURED"
);

const renderedModal = ReactDOMServer.renderToStaticMarkup(
  React.createElement(ProductPromotionBadges, { product: featuredAndHotProduct, variant: "modal" })
);
assert(
  renderedModal.includes("HOT") && !renderedModal.includes("FEATURED"),
  "TEST 4b: Modal variant renders HOT but NEVER FEATURED"
);

console.log("\n=======================================================");
console.log("ALL FEATURED BADGE REMOVAL TESTS PASSED! 🚀");
console.log("=======================================================\n");
