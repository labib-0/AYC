/**
 * Product Metadata & GSM Sanitization Audit Suite
 * Verifies that unsupported GSM claims and fabricated quality phrases are eliminated
 * from product metadata, Open Graph, and Twitter descriptions across products with
 * varying specification completeness.
 */

import {
  generateDeterministicProductSeo,
  extractCleanFabricComposition,
} from "../src/lib/seo/generator";
import {
  deriveProductDescription,
  sanitizeProductDescription,
  generateProductMetadata,
} from "../src/lib/seo/product";
import { B2BProductInput } from "../src/types/b2b";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${msg}`);
  }
}

console.log("==========================================================");
console.log("AYC PRODUCT METADATA & GSM SANITIZATION VERIFICATION SUITE");
console.log("==========================================================\n");

// 1. extractCleanFabricComposition tests
console.log("▶ Group 1: Fabric Composition Extraction & GSM Stripping");

const mat1 = extractCleanFabricComposition("200+ GSM");
assert(mat1 === "", `Expected empty string for material with only GSM, got: '${mat1}'`);
console.log("  ✔ Material containing only '200+ GSM' resolves to empty string (no GSM claim)");

const mat2 = extractCleanFabricComposition("Fabric: Premium Cotton Single Jersey, 160-180 GSM");
assert(!mat2.toLowerCase().includes("gsm"), `Material must not contain GSM, got: '${mat2}'`);
assert(mat2.includes("Cotton Single Jersey"), `Expected clean composition to contain 'Cotton Single Jersey', got: '${mat2}'`);
console.log("  ✔ 'Fabric: Premium Cotton Single Jersey, 160-180 GSM' ->", mat2);

const mat3 = extractCleanFabricComposition("100% Cotton");
assert(mat3 === "100% Cotton", `Expected '100% Cotton', got: '${mat3}'`);
console.log("  ✔ Genuine material '100% Cotton' preserved verbatim");

const mat4 = extractCleanFabricComposition("Fabric / Composition: 60% cotton, 40% polyester");
assert(mat4 === "60% cotton, 40% polyester", `Expected '60% cotton, 40% polyester', got: '${mat4}'`);
console.log("  ✔ Technical prefix stripped, genuine composition preserved:", mat4);

const mat5 = extractCleanFabricComposition("export-grade");
assert(mat5 === "", `Expected generic fluff 'export-grade' to be dropped, got: '${mat5}'`);
console.log("  ✔ Generic fluff 'export-grade' discarded");

// 2. generateDeterministicProductSeo tests
console.log("\n▶ Group 2: Deterministic SEO Generation Without GSM or Fluff");

const gen1 = generateDeterministicProductSeo({
  name: "Men's Original T-Shirt",
  brand: "US POLO",
  audience: "MEN",
  material: "200+ GSM",
});
assert(!gen1.seoDescription.includes("GSM"), `Generated SEO description must NOT contain GSM, got: '${gen1.seoDescription}'`);
assert(!gen1.seoDescription.includes("Premium"), `Generated SEO description must NOT contain generic 'Premium', got: '${gen1.seoDescription}'`);
assert(gen1.seoDescription.includes("Manufactured for bulk B2B orders direct from Bangladesh"), `Expected truthful B2B phrase, got: '${gen1.seoDescription}'`);
console.log("  ✔ Product with '200+ GSM' input generates clean description without GSM claim:\n    ->", gen1.seoDescription);

const gen2 = generateDeterministicProductSeo({
  name: "Girls Denim Skirt",
  brand: "Zara",
  audience: "GIRLS",
  material: undefined, // absent
});
assert(!gen2.seoDescription.includes("export-grade"), `Must not invent 'export-grade' replacement, got: '${gen2.seoDescription}'`);
assert(!gen2.seoDescription.includes("Premium"), `Must not invent 'Premium', got: '${gen2.seoDescription}'`);
console.log("  ✔ Product with absent material omits specification without inventing 'export-grade':\n    ->", gen2.seoDescription);

// 3. sanitizeProductDescription tests for legacy stored descriptions
console.log("\n▶ Group 3: Sanitization of Legacy Stored Product Descriptions");

const legacyDesc1 = "Wholesale Men's Original T-Shirt by US POLO for men. Premium 200+ GSM garments manufactured for bulk B2B orders direct from Bangladesh.";
const sanitized1 = sanitizeProductDescription(legacyDesc1);
assert(!sanitized1.includes("200+ GSM"), `Must remove '200+ GSM', got: '${sanitized1}'`);
assert(!sanitized1.includes("Premium 200+ GSM"), `Must remove 'Premium 200+ GSM', got: '${sanitized1}'`);
assert(sanitized1 === "Wholesale Men's Original T-Shirt by US POLO for men. Manufactured for bulk B2B orders direct from Bangladesh.", `Expected clean sentence, got: '${sanitized1}'`);
console.log("  ✔ Legacy 'Premium 200+ GSM garments' sanitized to truthful sentence:\n    ->", sanitized1);

const legacyDesc2 = "Wholesale Boys Drop Shoulder T-Shirt by ZARA for boys. Premium Fabric: Premium Cotton Single Jersey, 160-180 GSM garments manufactured for bulk B2B orders direct from Bangladesh.";
const sanitized2 = sanitizeProductDescription(legacyDesc2);
assert(!sanitized2.includes("160-180 GSM"), `Must remove '160-180 GSM', got: '${sanitized2}'`);
console.log("  ✔ Legacy '160-180 GSM' sanitized to truthful sentence:\n    ->", sanitized2);

const legacyDesc3 = "Wholesale Ladies Denim Plazo by Piombo for women. Premium export-grade garments manufactured for bulk B2B orders direct from Bangladesh.";
const sanitized3 = sanitizeProductDescription(legacyDesc3);
assert(!sanitized3.includes("export-grade"), `Must remove 'export-grade', got: '${sanitized3}'`);
console.log("  ✔ Legacy 'Premium export-grade' sanitized to truthful sentence:\n    ->", sanitized3);

// 4. deriveProductDescription & generateProductMetadata integration
console.log("\n▶ Group 4: Live Product Metadata Generation Across Completeness Levels");

// Level A: Product with legacy generated 200+ GSM description (Product 162 archetype)
const product162Archetype: B2BProductInput = {
  id: "162",
  name: "Men's Original T-Shirt",
  slug: "mens-original-t-shirt",
  brand: "US POLO",
  audience: "MEN",
  categoryName: "T-Shirts",
  material: "200+ GSM",
  seoDescription: "Wholesale Men's Original T-Shirt by US POLO for men. Premium 200+ GSM garments manufactured for bulk B2B orders direct from Bangladesh.",
  shortDescription: "Wholesale Men's Original T-Shirt by US POLO for men. Premium 200+ GSM garments manufactured for bulk B2B orders direct from Bangladesh.",
  images: ["https://ayaanclothing.com/storage/products/mens-tshirt.jpg"],
};

const meta162 = generateProductMetadata(product162Archetype, "mens-original-t-shirt");
assert(!meta162.description?.includes("200+ GSM"), `Page description must NOT contain 200+ GSM, got: '${meta162.description}'`);
assert(!meta162.openGraph?.description?.includes("200+ GSM"), `OG description must NOT contain 200+ GSM, got: '${meta162.openGraph?.description}'`);
assert(!(meta162.twitter as any)?.description?.includes("200+ GSM"), `Twitter description must NOT contain 200+ GSM`);
console.log("  ✔ Product 162 metadata strictly removes 200+ GSM from meta description, OG, and Twitter");

// Level B: Product with partial specifications (Sherpa Coat archetype)
const sherpaCoatArchetype: B2BProductInput = {
  id: "163",
  name: "Women's Plus Size Long Hooded Sherpa Coat",
  slug: "womens-plus-size-long-hooded-sherpa-coat",
  brand: "Kim Rogers",
  audience: "WOMEN",
  categoryName: "Jackets & Coats",
  material: "Material: Polyester (Sherpa)",
  shortDescription: "Wholesale Women's Plus Size Long Hooded Sherpa Coat by Kim Rogers for women. Premium Material: Polyester (Sherpa) garments manufactured for bulk B2B orders direct from Bangladesh.",
  images: ["https://ayaanclothing.com/storage/products/sherpa-coat.jpg"],
};

const metaSherpa = generateProductMetadata(sherpaCoatArchetype, "womens-plus-size-long-hooded-sherpa-coat");
assert(!metaSherpa.description?.includes("Premium Material:"), `Must clean 'Premium Material:', got: '${metaSherpa.description}'`);
assert(metaSherpa.description?.includes("Polyester (Sherpa)"), `Must retain genuine Polyester (Sherpa) fabric`);
console.log("  ✔ Sherpa coat metadata retains genuine Polyester (Sherpa) fabric without fluff:\n    ->", metaSherpa.description);

// Level C: Minimal product with zero material, zero custom SEO (fallback test)
const minimalProduct: B2BProductInput = {
  id: "200",
  name: "Basic Crewneck Tee",
  slug: "basic-crewneck-tee",
  brand: "General",
  audience: "UNISEX",
  categoryName: "T-Shirts",
  images: ["https://ayaanclothing.com/storage/products/tee.jpg"],
};

const metaMinimal = generateProductMetadata(minimalProduct, "basic-crewneck-tee");
assert(!metaMinimal.description?.includes("GSM"), "Minimal product fallback must not mention GSM");
assert(!metaMinimal.description?.includes("export-grade"), "Minimal product fallback must not mention export-grade");
assert(!metaMinimal.description?.includes("High quality"), "Minimal product fallback must not mention High quality");
console.log("  ✔ Minimal product generates clean, truthful fallback description:\n    ->", metaMinimal.description);

// 5. Product isolation test
console.log("\n▶ Group 5: Product Isolation (Zero Metadata Bleed)");
assert(meta162.description !== metaSherpa.description, "Product 162 and Sherpa coat must not share descriptions");
assert(meta162.openGraph?.title !== metaSherpa.openGraph?.title, "Product 162 and Sherpa coat must have distinct OG titles");
assert(meta162.alternates?.canonical !== metaSherpa.alternates?.canonical, "Products must have distinct canonical URLs");
console.log("  ✔ Product metadata is strictly isolated; zero bleed between records");

console.log("\n==========================================================");
console.log("ALL PRODUCT METADATA & GSM SANITIZATION TESTS PASSED!");
console.log("==========================================================");
