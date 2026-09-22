import { adminPromotionService } from "../src/services/admin/promotion.service";
import { mockStore } from "../src/lib/mock-data/mock-store";
import { getTopBannerConfig, DEFAULT_TOP_BANNER } from "../src/config/banner";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runPhase8StaticValidation() {
  console.log("============================================================");
  console.log("PHASE 8 — HOMEPAGE & BANNER STATIC CODE & DATA VALIDATION");
  console.log("============================================================");

  // 1. Initial State & Promotion Banner Resolution
  console.log("\n--- 1. Banner Promotion Retrieval Tests ---");
  const allPromos = await adminPromotionService.getPromotions();
  assert(allPromos.length > 0, `Total promotions retrieved: ${allPromos.length}`);

  const bannerPromos = allPromos.filter(
    (p) => p.type === "top_banner" || p.type === "hero_banner"
  );
  assert(bannerPromos.length >= 1, `Found ${bannerPromos.length} homepage banner promotion records`);

  const initialBanner = bannerPromos.find((b) => b.is_active) || bannerPromos[0];
  assert(initialBanner !== undefined, "Active banner promotion found");
  assert(initialBanner.id === 1, `Default active banner is ID 1 (found ID ${initialBanner.id})`);
  assert(typeof initialBanner.title === "string", "Banner has string title");
  assert(typeof initialBanner.image_url === "string", "Banner has string image_url");
  assert(initialBanner.is_active === true, "Initial banner is active");

  // 2. Storefront Resolution Test via banner.ts
  console.log("\n--- 2. Storefront Banner Resolution Tests ---");
  const storefrontBanner = getTopBannerConfig();
  assert(storefrontBanner.active === true, "Storefront banner is active by default");
  assert(storefrontBanner.title === initialBanner.title, `Storefront title matches promotion title: "${storefrontBanner.title}"`);
  assert(storefrontBanner.imageUrl === initialBanner.image_url, `Storefront image URL matches promotion: "${storefrontBanner.imageUrl}"`);
  assert(storefrontBanner.target === initialBanner.button_target, `Storefront target matches promotion target: "${storefrontBanner.target}"`);

  // 3. Update Banner Promotion via AdminPromotionService
  console.log("\n--- 3. Banner Update Mutation Tests ---");
  const updatedPayload = {
    title: "PREMIUM WHOLESALE APPAREL SOURCING",
    subtitle: "Custom manufacturing and export-ready B2B collections with certified factories.",
    button_text: "VIEW EXPORT CATALOG →",
    button_target: "/products",
    image_url: "/images/updated-test-banner.webp",
  };

  const updatedRecord = await adminPromotionService.updatePromotion(initialBanner.id, updatedPayload);
  assert(updatedRecord.title === updatedPayload.title, "Updated title persisted in service");
  assert(updatedRecord.subtitle === updatedPayload.subtitle, "Updated subtitle persisted in service");
  assert(updatedRecord.button_text === updatedPayload.button_text, "Updated button_text persisted in service");
  assert(updatedRecord.button_target === updatedPayload.button_target, "Updated button_target persisted in service");
  assert(updatedRecord.image_url === updatedPayload.image_url, "Updated image_url persisted in service");

  // 4. Verify Storefront Config Reflects Updates Immediately
  console.log("\n--- 4. Storefront Real-time Synchronization Tests ---");
  const syncedStorefront = getTopBannerConfig();
  assert(syncedStorefront.title === updatedPayload.title, "Storefront config resolved updated title");
  assert(syncedStorefront.subtitle === updatedPayload.subtitle, "Storefront config resolved updated subtitle");
  assert(syncedStorefront.buttonText === updatedPayload.button_text, "Storefront config resolved updated buttonText");
  assert(syncedStorefront.target === updatedPayload.button_target, "Storefront config resolved updated target (/products)");
  assert(syncedStorefront.imageUrl === updatedPayload.image_url, "Storefront config resolved updated imageUrl");

  // 5. Deactivation Test (is_active: false)
  console.log("\n--- 5. Banner Deactivation & Visibility Tests ---");
  await adminPromotionService.updatePromotion(initialBanner.id, { is_active: false });
  const deactivatedStorefront = getTopBannerConfig();
  assert(deactivatedStorefront.active === false, "Storefront getTopBannerConfig returns active: false when promotion is deactivated");

  // Re-activation
  await adminPromotionService.updatePromotion(initialBanner.id, { is_active: true });
  const reactivatedStorefront = getTopBannerConfig();
  assert(reactivatedStorefront.active === true, "Storefront getTopBannerConfig returns active: true after re-activation");

  // 6. Multiple Banner Record Creation & Priority
  console.log("\n--- 6. Multiple Banner Record Creation Tests ---");
  const newBannerPromo = await adminPromotionService.createPromotion({
    title: "AUTUMN/WINTER 2026 BULK PRODUCTION",
    subtitle: "Reserve production capacity for winter fleece, hoodies and outerwear.",
    type: "hero_banner",
    image_url: "/images/winter-campaign.jpg",
    button_text: "BOOK PRODUCTION →",
    button_target: "/rfq",
    sort_order: 10,
    is_active: false,
  });
  assert(typeof newBannerPromo.id === "number", `Created new banner promotion with ID: ${newBannerPromo.id}`);

  const refreshedPromos = await adminPromotionService.getPromotions();
  const allHeroBanners = refreshedPromos.filter(
    (p) => p.type === "top_banner" || p.type === "hero_banner"
  );
  assert(allHeroBanners.length >= 2, `Multiple banner records now exist (${allHeroBanners.length} records)`);

  // Clean up created test banner
  await adminPromotionService.deletePromotion(newBannerPromo.id);
  const postDeletePromos = await adminPromotionService.getPromotions();
  assert(
    !postDeletePromos.some((p) => p.id === newBannerPromo.id),
    "Test banner promotion cleaned up successfully"
  );

  // Restore initial banner values
  await adminPromotionService.updatePromotion(initialBanner.id, {
    title: "YOUR WHOLESALE APPAREL SOURCING PARTNER",
    subtitle: "Quality apparel for retailers, boutiques and bulk buyers, with dependable sourcing and export-ready support.",
    button_text: "EXPLORE CATALOG →",
    button_target: "#featured",
    image_url: "/images/homepage-banner.jpg",
    is_active: true,
  });

  const finalCheck = getTopBannerConfig();
  assert(finalCheck.title === "YOUR WHOLESALE APPAREL SOURCING PARTNER", "Initial banner state restored cleanly");
  assert(finalCheck.target === "#featured", "Target #featured restored");

  console.log("\n============================================================");
  console.log("ALL PHASE 8 CODE & DATA ASSERTIONS PASSED SUCCESSFULLY (18/18)");
  console.log("============================================================\n");
}

runPhase8StaticValidation().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
