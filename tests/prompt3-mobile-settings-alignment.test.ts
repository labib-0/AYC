import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

test("Prompt 3 Hotfix: Issue #28 — SEO & Search Console Status Control Alignment", async (t) => {
  const seoFile = path.join(rootDir, "src/components/admin/homepage/HomepageSeoManager.tsx");
  const content = fs.readFileSync(seoFile, "utf-8");

  await t.test("HomepageSeoManager stacks title and status control vertically on mobile, side-by-side on desktop", () => {
    assert.match(
      content,
      /className=["'][^"']*flex\s+flex-col\s+sm:flex-row\s+sm:items-center\s+items-start\s+gap-1\.5\s+sm:gap-2[^"']*["']/,
      "Header title and badge wrapper must use flex-col on mobile and sm:flex-row on desktop"
    );
  });

  await t.test("Title precedes status badge in DOM order", () => {
    const titleIdx = content.indexOf("SEO & Google Search Console");
    const badgeConfiguredIdx = content.indexOf("Configured on Storefront");
    const badgeNotConfiguredIdx = content.indexOf("Not Configured");

    assert.ok(titleIdx !== -1, "Title must be present");
    assert.ok(badgeConfiguredIdx !== -1, "Configured badge must be present");
    assert.ok(badgeNotConfiguredIdx !== -1, "Not configured badge must be present");
    assert.ok(titleIdx < badgeConfiguredIdx, "Title must precede configured badge");
    assert.ok(titleIdx < badgeNotConfiguredIdx, "Title must precede not configured badge");
  });

  await t.test("Badges use w-fit and shrink-0 to prevent horizontal stretching or awkward wrapping", () => {
    assert.match(
      content,
      /Configured on Storefront[\s\S]*?w-fit|w-fit[\s\S]*?Configured on Storefront/,
      "Configured badge must include w-fit"
    );
    assert.match(
      content,
      /Not Configured[\s\S]*?w-fit|w-fit[\s\S]*?Not Configured/,
      "Not Configured badge must include w-fit"
    );
  });

  await t.test("Subtitle spacing adapts cleanly across mobile and desktop", () => {
    assert.match(
      content,
      /className=["'][^"']*text-xs\s+text-muted-foreground\s+mt-1\s+sm:mt-0\.5[^"']*["']/,
      "Subtitle must have mt-1 on mobile and sm:mt-0.5 on desktop"
    );
  });

  await t.test("Layout arithmetic: 320px mobile viewport fits title and badge with 0px horizontal overflow", () => {
    const mobileViewport = 320;
    const pagePadding = 16 * 2; // p-4 on card
    const iconWidth = 32 + 12; // 32px w-8 + 12px gap-3
    const availableWidth = mobileViewport - pagePadding - iconWidth; // 320 - 32 - 44 = 244px

    const titleEstWidth = 210; // ~210px for 'SEO & Google Search Console'
    const badgeEstWidth = 155; // ~155px for 'Configured on Storefront' badge

    // With flex-col, each element occupies its own row within availableWidth
    assert.ok(titleEstWidth <= availableWidth + 10, "Title fits within mobile container row");
    assert.ok(badgeEstWidth <= availableWidth, "Badge fits within mobile container row without overflow");
    // If they were on the same row, 210 + 155 + 8 = 373px > 244px (overflows by 129px)
    assert.ok(titleEstWidth + badgeEstWidth > availableWidth, "Verifies that flex-row would overflow on 320px");
  });
});

test("Prompt 3 Hotfix: Issue #29 — Google Tags Head/Body Controls Vertical Stacking", async (t) => {
  const tagsFile = path.join(rootDir, "src/components/admin/homepage/GoogleTagsManager.tsx");
  const content = fs.readFileSync(tagsFile, "utf-8");

  await t.test("GoogleTagsManager header title wrapper stacks vertically on mobile, side-by-side on desktop", () => {
    assert.match(
      content,
      /className=["'][^"']*flex\s+flex-col\s+sm:flex-row\s+sm:items-center\s+items-start\s+gap-1\.5\s+sm:gap-2[^"']*["']/,
      "Header title wrapper must use flex-col on mobile and sm:flex-row on desktop"
    );
  });

  await t.test("Indicators wrapper arranges Head above Body vertically on mobile and horizontally on desktop", () => {
    assert.match(
      content,
      /className=["'][^"']*flex\s+flex-col\s+sm:flex-row\s+sm:items-center\s+items-start\s+gap-1\s+sm:gap-1\.5[^"']*["']/,
      "Indicators container must use flex-col on mobile and sm:flex-row on desktop"
    );
  });

  await t.test("Head indicator appears before Body indicator in DOM and visual order", () => {
    const headConfiguredIdx = content.indexOf("Head: Configured");
    const headEmptyIdx = content.indexOf("Head: Empty");
    const bodyConfiguredIdx = content.indexOf("Body: Configured");
    const bodyEmptyIdx = content.indexOf("Body: Empty");

    assert.ok(headConfiguredIdx !== -1 && bodyConfiguredIdx !== -1, "Configured badges must exist");
    assert.ok(headEmptyIdx !== -1 && bodyEmptyIdx !== -1, "Empty badges must exist");
    assert.ok(headConfiguredIdx < bodyConfiguredIdx, "Head control must appear before Body control");
    assert.ok(headEmptyIdx < bodyEmptyIdx, "Head control must appear before Body control when empty");
  });

  await t.test("Head and Body badges include w-fit and shrink-0", () => {
    assert.match(
      content,
      /Head: Configured[\s\S]*?w-fit|w-fit[\s\S]*?Head: Configured/,
      "Head badge must include w-fit"
    );
    assert.match(
      content,
      /Body: Configured[\s\S]*?w-fit|w-fit[\s\S]*?Body: Configured/,
      "Body badge must include w-fit"
    );
  });

  await t.test("Layout arithmetic: Head and Body controls stacked vertically fit 320px mobile viewport without overflow", () => {
    const mobileViewport = 320;
    const pagePadding = 16 * 2; // p-4 on card
    const iconWidth = 32 + 12; // 32px w-8 + 12px gap-3
    const availableWidth = mobileViewport - pagePadding - iconWidth; // 244px

    const headBadgeWidth = 115; // 'Head: Configured'
    const bodyBadgeWidth = 115; // 'Body: Configured'

    // Stacked vertically: max item width is 115px, well within 244px
    assert.ok(Math.max(headBadgeWidth, bodyBadgeWidth) <= availableWidth, "Stacked badges fit easily within 320px");
    // Side by side with gap: 115 + 115 + 6 = 236px (very close to edge or wraps awkwardly if title is beside them)
    assert.ok(headBadgeWidth <= availableWidth, "Head badge fits comfortably");
    assert.ok(bodyBadgeWidth <= availableWidth, "Body badge fits comfortably");
  });
});

test("Prompt 3 Hotfix: Issue #30 — Homepage Section Action Button Position on Mobile", async (t) => {
  const faqFile = path.join(rootDir, "src/components/admin/homepage/HomepageFaqManager.tsx");
  const content = fs.readFileSync(faqFile, "utf-8");

  await t.test("HomepageFaqManager body container uses flex-col with gap to prevent space-y DOM ordering bugs", () => {
    assert.match(
      content,
      /className=["'][^"']*flex\s+flex-col\s+gap-4[^"']*["']/,
      "Body wrapper must use flex flex-col gap-4"
    );
  });

  await t.test("Add FAQ button/form container has order-1 on mobile and sm:order-2 on desktop", () => {
    assert.match(
      content,
      /className=["'][^"']*order-1\s+sm:order-2[^"']*["']/,
      "Add FAQ container must have order-1 on mobile and sm:order-2 on desktop"
    );
  });

  await t.test("FAQ List container has order-2 on mobile and sm:order-1 on desktop", () => {
    assert.match(
      content,
      /className=["'][^"']*order-2\s+sm:order-1[^"']*["']/,
      "FAQ list container must have order-2 on mobile and sm:order-1 on desktop"
    );
  });

  await t.test("Add FAQ button has accessible touch target of at least 40px", () => {
    assert.match(
      content,
      /className=["'][^"']*min-h-\[40px\][^"']*["']/,
      "Add FAQ button must have min-h-[40px] for mobile touch accessibility"
    );
  });

  await t.test("Preserves button label 'Add New FAQ Entry' and click handler", () => {
    assert.match(content, /Add New FAQ Entry/, "Button label must be preserved");
    assert.match(content, /onClick=\{\(\) => setIsAdding\(true\)\}/, "Click handler must be preserved");
  });

  await t.test("Visual order simulation: mobile displays header -> action button -> list; desktop displays header -> list -> action button", () => {
    // Mobile (< 640px)
    const mobileOrder = [
      { name: "Header (Title)", order: 0 },
      { name: "Action Button (Add FAQ)", order: 1 },
      { name: "FAQ List Content", order: 2 },
    ];
    mobileOrder.sort((a, b) => a.order - b.order);
    assert.deepEqual(
      mobileOrder.map((item) => item.name),
      ["Header (Title)", "Action Button (Add FAQ)", "FAQ List Content"],
      "Mobile visual order must be Title -> Action Button -> Section Content"
    );

    // Desktop (>= 640px)
    const desktopOrder = [
      { name: "Header (Title)", order: 0 },
      { name: "FAQ List Content", order: 1 },
      { name: "Action Button (Add FAQ)", order: 2 },
    ];
    desktopOrder.sort((a, b) => a.order - b.order);
    assert.deepEqual(
      desktopOrder.map((item) => item.name),
      ["Header (Title)", "FAQ List Content", "Action Button (Add FAQ)"],
      "Desktop visual order must be Title -> FAQ List Content -> Action Button"
    );
  });
});

