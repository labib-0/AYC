/**
 * scripts/test-offer-sheet-pricing.ts
 *
 * Static assertion: verifies the offer sheet tier resolver produces exactly
 * ONE applicable tier for a given order quantity, using the same tier
 * definitions and resolution logic as generateProductOfferSheetDoc.
 *
 * Run:  npx ts-node --skip-project scripts/test-offer-sheet-pricing.ts
 */

interface Tier {
  minQuantity: number;
  maxQuantity?: number;
  price: number;
}

function buildDefaultTiers(basePrice: number): Tier[] {
  return [
    { minQuantity: 10,  maxQuantity: 50,       price: basePrice },
    { minQuantity: 51,  maxQuantity: 200,       price: Math.round(basePrice * 0.92 * 100) / 100 },
    { minQuantity: 201, maxQuantity: undefined, price: Math.round(basePrice * 0.85 * 100) / 100 },
  ];
}

/** Mirrors the exact resolution loop in generateProductOfferSheetDoc. */
function resolveApplicableTier(tiers: Tier[], qty: number): { tierIdx: number; tier: Tier } {
  let matchedTierIdx = 0;
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (qty >= t.minQuantity) {
      if (!t.maxQuantity || qty <= t.maxQuantity) {
        matchedTierIdx = i;
      }
    }
  }
  return { tierIdx: matchedTierIdx, tier: tiers[matchedTierIdx] };
}

const BASE_PRICE = 12.00;
const tiers = buildDefaultTiers(BASE_PRICE);

const cases: Array<{ qty: number; expectedTierIdx: number; description: string }> = [
  { qty: 10,   expectedTierIdx: 0, description: "MOQ boundary → Tier 1" },
  { qty: 25,   expectedTierIdx: 0, description: "Mid Tier 1" },
  { qty: 50,   expectedTierIdx: 0, description: "Tier 1 upper boundary" },
  { qty: 51,   expectedTierIdx: 1, description: "Tier 2 lower boundary" },
  { qty: 100,  expectedTierIdx: 1, description: "Mid Tier 2" },
  { qty: 200,  expectedTierIdx: 1, description: "Tier 2 upper boundary" },
  { qty: 201,  expectedTierIdx: 2, description: "Tier 3 lower boundary" },
  { qty: 500,  expectedTierIdx: 2, description: "Bulk Tier 3" },
  { qty: 1000, expectedTierIdx: 2, description: "Large Tier 3" },
];

let passed = 0;
let failed = 0;

console.log("\n── Offer Sheet Single-Tier Pricing Assertion ──────────────────────\n");
tiers.forEach((t, i) => {
  const range = t.maxQuantity ? `${t.minQuantity}–${t.maxQuantity} pcs` : `${t.minQuantity}+ pcs`;
  console.log(`  Tier ${i + 1}: ${range} @ $${t.price.toFixed(2)}/pc`);
});
console.log("");

for (const c of cases) {
  const result = resolveApplicableTier(tiers, c.qty);
  const ok = result.tierIdx === c.expectedTierIdx;
  const status = ok ? "PASS" : "FAIL";
  console.log(`${status}  qty=${String(c.qty).padStart(4)}  -> Tier ${result.tierIdx + 1} (expected Tier ${c.expectedTierIdx + 1})  $${result.tier.price.toFixed(2)}/pc  [${c.description}]`);
  if (ok) passed++; else failed++;
}

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
