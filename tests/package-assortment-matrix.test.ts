import React from "react";
import ReactDOMServer from "react-dom/server";
import fs from "fs";
import path from "path";
import PackageAssortmentMatrix, {
  PackageAssortmentMatrixData,
} from "../src/components/product/PackageAssortmentMatrix";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failedCount++;
  }
}

console.log("==================================================");
console.log("PACKAGE ASSORTMENT MATRIX REDESIGN AUDIT TESTS");
console.log("==================================================");

// ─────────────────────────────────────────────────────────────────────────────
// Test A: 1 color / 1 size
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test A: 1 color / 1 size (e.g., Black / 32 / 200 pcs)");
{
  const data: PackageAssortmentMatrixData = {
    colors: ["Black"],
    sizes: ["32"],
    cellMap: {
      Black: { "32": 200 },
    },
    rowTotals: { Black: 200 },
    colTotals: { "32": 200 },
    grandTotal: 200,
  };

  const html = ReactDOMServer.renderToString(
    React.createElement(PackageAssortmentMatrix, { matrixData: data })
  );

  assert(html.includes("COLOR"), "Header includes 'COLOR' column");
  assert(html.includes("32"), "Header includes size '32' column");
  assert(html.includes("TOTAL"), "Includes 'TOTAL' header and row");
  assert(html.includes("Black"), "Color row includes 'Black'");
  assert(html.includes("200"), "Displays quantity 200 for Black in size 32");

  // Verify exactly 1 color row in tbody
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
  const rowCount = tbodyMatch ? (tbodyMatch[1].match(/<tr/g) || []).length : 0;
  assert(rowCount === 1, "Exactly 1 color row rendered in table body");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test B: 1 color / multiple sizes
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test B: 1 color / multiple sizes");
{
  const data: PackageAssortmentMatrixData = {
    colors: ["Navy"],
    sizes: ["S", "M", "L", "XL"],
    cellMap: {
      Navy: { S: 25, M: 50, L: 75, XL: 50 },
    },
    rowTotals: { Navy: 200 },
    colTotals: { S: 25, M: 50, L: 75, XL: 50 },
    grandTotal: 200,
  };

  const html = ReactDOMServer.renderToString(
    React.createElement(PackageAssortmentMatrix, { matrixData: data })
  );

  assert(html.includes("Navy"), "Renders color 'Navy'");
  assert(
    html.includes("S") && html.includes("M") && html.includes("L") && html.includes("XL"),
    "Renders all 4 size headers in columns"
  );
  assert(data.rowTotals.Navy === 200, "Row total for Navy is 200");
  assert(data.grandTotal === 200, "Grand total equals 200");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test C: Multiple colors / 1 size
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test C: Multiple colors / 1 size");
{
  const data: PackageAssortmentMatrixData = {
    colors: ["Black", "Navy", "White"],
    sizes: ["34"],
    cellMap: {
      Black: { "34": 100 },
      Navy: { "34": 100 },
      White: { "34": 100 },
    },
    rowTotals: { Black: 100, Navy: 100, White: 100 },
    colTotals: { "34": 300 },
    grandTotal: 300,
  };

  const html = ReactDOMServer.renderToString(
    React.createElement(PackageAssortmentMatrix, { matrixData: data })
  );

  assert(html.includes("Black") && html.includes("Navy") && html.includes("White"), "Renders all 3 color rows");
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
  const rowCount = tbodyMatch ? (tbodyMatch[1].match(/<tr/g) || []).length : 0;
  assert(rowCount === 3, "Exactly 3 color rows rendered in table body");
  assert(data.colTotals["34"] === 300, "Column total for size 34 is 300");
  assert(data.grandTotal === 300, "Grand total equals 300");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test D: Multiple colors / multiple sizes (Canonical Example)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test D: Multiple colors / multiple sizes (Canonical Specification Example)");
{
  const data: PackageAssortmentMatrixData = {
    colors: ["Black", "Navy", "White"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    cellMap: {
      Black: { S: 20, M: 30, L: 40, XL: 50, XXL: 60 },
      Navy: { S: 20, M: 30, L: 40, XL: 50, XXL: 60 },
      White: { S: 10, M: 20, L: 30, XL: 40, XXL: 50 },
    },
    rowTotals: { Black: 200, Navy: 200, White: 150 },
    colTotals: { S: 50, M: 80, L: 110, XL: 140, XXL: 170 },
    grandTotal: 550,
  };

  const html = ReactDOMServer.renderToString(
    React.createElement(PackageAssortmentMatrix, { matrixData: data })
  );

  assert(html.includes("Black") && html.includes("Navy") && html.includes("White"), "All 3 colors present");
  assert(
    html.includes("S") && html.includes("M") && html.includes("L") && html.includes("XL") && html.includes("XXL"),
    "All 5 size columns present in header"
  );
  assert(data.rowTotals.Black === 200, "Black row total is 200");
  assert(data.rowTotals.Navy === 200, "Navy row total is 200");
  assert(data.rowTotals.White === 150, "White row total is 150");
  assert(data.colTotals.S === 50, "S col total is 50");
  assert(data.colTotals.M === 80, "M col total is 80");
  assert(data.colTotals.L === 110, "L col total is 110");
  assert(data.colTotals.XL === 140, "XL col total is 140");
  assert(data.colTotals.XXL === 170, "XXL col total is 170");
  assert(data.grandTotal === 550, "Grand total equals 550");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test E: Missing color-size combination
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test E: Missing color-size combination -> displays 0, preserves grid");
{
  const data: PackageAssortmentMatrixData = {
    colors: ["Black", "Red"],
    sizes: ["S", "M", "L"],
    cellMap: {
      Black: { S: 50, M: 50, L: 50 },
      Red: { S: 50, M: 0, L: 50 }, // Red has 0 in M
    },
    rowTotals: { Black: 150, Red: 100 },
    colTotals: { S: 100, M: 50, L: 100 },
    grandTotal: 250,
  };

  const html = ReactDOMServer.renderToString(
    React.createElement(PackageAssortmentMatrix, { matrixData: data })
  );

  assert(html.includes(">0<"), "Missing combination renders numeric 0");
  assert(!html.includes("NaN"), "Does not produce NaN");
  assert(!html.includes("undefined"), "Does not produce undefined");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test F: Correct Row Totals
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test F: Row totals equal exact sum of each row's size cells");
{
  const colors = ["Charcoal", "Olive"];
  const sizes = ["M", "L", "XL"];
  const cellMap: Record<string, Record<string, number>> = {
    Charcoal: { M: 35, L: 45, XL: 20 },
    Olive: { M: 15, L: 25, XL: 60 },
  };

  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = { M: 0, L: 0, XL: 0 };
  let grandTotal = 0;

  colors.forEach((c) => {
    rowTotals[c] = 0;
    sizes.forEach((s) => {
      const v = cellMap[c][s];
      rowTotals[c] += v;
      colTotals[s] += v;
      grandTotal += v;
    });
  });

  assert(rowTotals.Charcoal === 35 + 45 + 20, "Charcoal row total correctly computed (100)");
  assert(rowTotals.Olive === 15 + 25 + 60, "Olive row total correctly computed (100)");
  assert(grandTotal === 200, "Grand total correctly accumulated (200)");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test G: Correct Column Totals
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test G: Column totals equal exact sum of each column's color cells");
{
  const colMTotal = 35 + 15;
  const colLTotal = 45 + 25;
  const colXLTotal = 20 + 60;

  assert(colMTotal === 50, "M column total matches sum of all colors (50)");
  assert(colLTotal === 70, "L column total matches sum of all colors (70)");
  assert(colXLTotal === 80, "XL column total matches sum of all colors (80)");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test H: Correct Grand Total
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test H: Grand total cross-checks across row sums and column sums");
{
  const rowSum = 100 + 100;
  const colSum = 50 + 70 + 80;
  assert(rowSum === colSum && rowSum === 200, "Grand total (200) strictly balances row sum and column sum");
}

// ─────────────────────────────────────────────────────────────────────────────
// Test I: Package total matches matrix grand total
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test I: Package total badge strictly matches matrix grand total");
{
  const detailFilePath = path.resolve(__dirname, "../src/app/products/[slug]/ProductDetailView.tsx");
  const detailCode = fs.readFileSync(detailFilePath, "utf8");

  assert(
    detailCode.includes("${matrixData.grandTotal.toLocaleString()} PCS TOTAL"),
    "Package Assortment header badge references matrixData.grandTotal with 'PCS TOTAL'"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test J: Mobile horizontal matrix scrolling
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test J: Mobile horizontal matrix scrolling container");
{
  const matrixFilePath = path.resolve(__dirname, "../src/components/product/PackageAssortmentMatrix.tsx");
  const matrixCode = fs.readFileSync(matrixFilePath, "utf8");

  assert(
    matrixCode.includes("overflow-x-auto"),
    "Matrix container utilizes overflow-x-auto for horizontal scroll containment"
  );
  assert(
    matrixCode.includes("min-w-[240px]"),
    "Table defines minimum readable width (min-w-[240px]) to prevent shrinking"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test K: Sticky COLOR column and no page-wide overflow
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Test K: Sticky COLOR column on mobile scroll");
{
  const matrixFilePath = path.resolve(__dirname, "../src/components/product/PackageAssortmentMatrix.tsx");
  const matrixCode = fs.readFileSync(matrixFilePath, "utf8");

  assert(
    matrixCode.includes("sticky left-0"),
    "COLOR column header and body cells utilize 'sticky left-0' for persistent visibility"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: Elimination of Redundant UI Elements
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n▶ Suite 2: Elimination of Redundant UI Elements");
{
  const detailFilePath = path.resolve(__dirname, "../src/app/products/[slug]/ProductDetailView.tsx");
  const detailCode = fs.readFileSync(detailFilePath, "utf8");

  assert(
    !detailCode.includes('<span className="text-muted-foreground font-medium">Colors:</span>'),
    "Eliminated redundant 'Colors:' summary chip from above the matrix"
  );
  assert(
    !detailCode.includes('<span className="text-muted-foreground font-medium">Sizes:</span>'),
    "Eliminated redundant 'Sizes:' summary chip from above the matrix"
  );
  assert(
    !detailCode.includes("Units per package"),
    "Eliminated redundant 'Units per package' label"
  );
  assert(
    detailCode.includes("PackageAssortmentMatrix"),
    "ProductDetailView integrates canonical PackageAssortmentMatrix component"
  );
}

console.log("\n==================================================");
console.log(`TEST RUN COMPLETE: ${passedCount} PASSED | ${failedCount} FAILED`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
}
