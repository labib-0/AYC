import fs from "fs";
import path from "path";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
  } catch (error: any) {
    console.error(`❌ [FAIL] ${name}\n       Error: ${error.message}`);
    process.exit(1);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected value to be truthy, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(expected: string) {
      if (typeof actual !== "string" && !Array.isArray(actual)) {
        throw new Error(`Expected string or array to check containment, got ${typeof actual}`);
      }
      if (!actual.includes(expected)) {
        throw new Error(`Expected content to contain ${JSON.stringify(expected)}`);
      }
    },
    notToContain(expected: string) {
      if (actual.includes(expected)) {
        throw new Error(`Expected content NOT to contain ${JSON.stringify(expected)}`);
      }
    },
  };
}

console.log("==================================================================");
console.log("AYC CMS PAGE BUILDER & DYNAMIC FOOTER ARCHITECTURE TEST SUITE");
console.log("==================================================================");

// 1. Database Migration & Schema
test("1. Database Migration: cms_pages schema defines all necessary fields and indexes", () => {
  const migrationPath = path.resolve(
    __dirname,
    "../backend/database/migrations/2026_10_29_000000_create_cms_pages_table.php"
  );
  expect(fs.existsSync(migrationPath)).toBe(true);
  const src = fs.readFileSync(migrationPath, "utf-8");

  expect(src).toContain("Schema::create('cms_pages'");
  expect(src).toContain("$table->string('title', 255)");
  expect(src).toContain("$table->string('slug', 255)->unique()");
  expect(src).toContain("enum('status', ['draft', 'published', 'archived'])");
  expect(src).toContain("$table->json('sections')");
  expect(src).toContain("$table->json('draft_sections')");
  expect(src).toContain("unsignedBigInteger('parent_id')");
  expect(src).toContain("$table->boolean('show_in_footer')");
  expect(src).toContain("$table->integer('footer_sort_order')");
  expect(src).toContain("$table->string('footer_label'");
  expect(src).toContain("$table->string('meta_title'");
  expect(src).toContain("$table->text('meta_description')");
  expect(src).toContain("$table->boolean('is_indexable')");
  expect(src).toContain("$table->json('previous_slugs')");
  expect(src).toContain("$table->timestamp('published_at')");
  expect(src).toContain("$table->softDeletes()");
  expect(src).toContain("idx_cms_pages_status");
  expect(src).toContain("idx_cms_pages_footer");
});

// 2. Eloquent Model
test("2. Eloquent Model: CmsPage contains scopes, casts, relationships, and reserved slugs", () => {
  const modelPath = path.resolve(__dirname, "../backend/app/Models/CmsPage.php");
  expect(fs.existsSync(modelPath)).toBe(true);
  const src = fs.readFileSync(modelPath, "utf-8");

  expect(src).toContain("class CmsPage extends Model");
  expect(src).toContain("RESERVED_SLUGS");
  expect(src).toContain("'sections'");
  expect(src).toContain("'draft_sections'");
  expect(src).toContain("'previous_slugs'");
  expect(src).toContain("=> 'array'");
  expect(src).toContain("scopePublished");
  expect(src).toContain("scopeFooterVisible");
  expect(src).toContain("scopeIndexable");
  expect(src).toContain("public function parent()");
  expect(src).toContain("public function children()");
  expect(src).toContain("public function publishDraft");
  expect(src).toContain("public function unpublish");
  expect(src).toContain("public function archive");
});

// 3. RBAC Permissions Catalog
test("3. RBAC Catalog: Page permissions registered across backend and frontend", () => {
  const permPath = path.resolve(__dirname, "../backend/app/Models/Permission.php");
  const seederPath = path.resolve(
    __dirname,
    "../backend/database/seeders/RbacPermissionCatalogSeeder.php"
  );
  const fePermPath = path.resolve(__dirname, "../src/lib/permissions.ts");

  const permSrc = fs.readFileSync(permPath, "utf-8");
  const seederSrc = fs.readFileSync(seederPath, "utf-8");
  const fePermSrc = fs.readFileSync(fePermPath, "utf-8");

  expect(permSrc).toContain("'page.view'");
  expect(permSrc).toContain("'page.create'");
  expect(permSrc).toContain("'page.edit'");
  expect(permSrc).toContain("'page.publish'");
  expect(permSrc).toContain("'page.delete'");
  expect(permSrc).toContain("'page.footer.manage'");

  expect(seederSrc).toContain("'page.view'");
  expect(seederSrc).toContain("'page.publish'");
  expect(seederSrc).toContain("'page.footer.manage'");

  expect(fePermSrc).toContain("PAGE_VIEW: \"page.view\"");
  expect(fePermSrc).toContain("PAGE_PUBLISH: \"page.publish\"");
  expect(fePermSrc).toContain("PAGE_FOOTER_MANAGE: \"page.footer.manage\"");
});

// 4. API Endpoints and Validation
test("4. API Endpoints: Public and Admin controllers registered in routes/api.php", () => {
  const routesPath = path.resolve(__dirname, "../backend/routes/api.php");
  const src = fs.readFileSync(routesPath, "utf-8");

  expect(src).toContain("PublicCmsPageController::class, 'footer'");
  expect(src).toContain("PublicCmsPageController::class, 'show'");
  expect(src).toContain("PublicCmsPageController::class, 'published'");
  expect(src).toContain("AdminCmsPageController::class");
  expect(src).toContain("Route::prefix('pages')->group");
  expect(src).toContain("AdminCmsPageController::class, 'publish'");
  expect(src).toContain("AdminCmsPageController::class, 'unpublish'");
  expect(src).toContain("AdminCmsPageController::class, 'archive'");
  expect(src).toContain("AdminCmsPageController::class, 'restore'");
  expect(src).toContain("AdminCmsPageController::class, 'updateFooter'");
  expect(src).toContain("AdminCmsPageController::class, 'preview'");
});

test("5. Media Upload Pipeline: UploadController authorizes 'pages' folder", () => {
  const uploadPath = path.resolve(
    __dirname,
    "../backend/app/Http/Controllers/Api/V1/UploadController.php"
  );
  const src = fs.readFileSync(uploadPath, "utf-8");

  expect(src).toContain("in:products,brands,categories,banners,pages");
  expect(src).toContain("'pages'      => $this->authorization->can($user, 'page.edit') || $this->authorization->can($user, 'page.create')");
});

test("6. TypeScript Types & Constants: types/cms.ts matches specification", () => {
  const typesPath = path.resolve(__dirname, "../src/types/cms.ts");
  const src = fs.readFileSync(typesPath, "utf-8");

  expect(src).toContain("export type CmsPageStatus = \"draft\" | \"published\" | \"archived\";");
  expect(src).toContain("hero_banner");
  expect(src).toContain("rich_text");
  expect(src).toContain("image_text");
  expect(src).toContain("feature_grid");
  expect(src).toContain("faq_accordion");
  expect(src).toContain("gallery_grid");
  expect(src).toContain("call_to_action");
  expect(src).toContain("export const RESERVED_SLUGS");
  expect(src).toContain("\"admin\"");
  expect(src).toContain("\"products\"");
  expect(src).toContain("\"cart\"");
  expect(src).toContain("\"checkout\"");
  expect(src).toContain("\"rfq\"");
  expect(src).toContain("\"compliance\"");
});

test("7. Client Service: cms-page.service.ts provides full caching, mock store, and event dispatchers", () => {
  const servicePath = path.resolve(__dirname, "../src/services/cms-page.service.ts");
  const src = fs.readFileSync(servicePath, "utf-8");

  expect(src).toContain("class CmsPageService");
  expect(src).toContain("getFooterPages");
  expect(src).toContain("getPublishedPageBySlug");
  expect(src).toContain("getAdminPages");
  expect(src).toContain("getAdminPageById");
  expect(src).toContain("createPage");
  expect(src).toContain("updatePage");
  expect(src).toContain("publishPage");
  expect(src).toContain("unpublishPage");
  expect(src).toContain("archivePage");
  expect(src).toContain("deletePage");
  expect(src).toContain("updateFooterSettings");
  expect(src).toContain("ayaan:page-updated");
  expect(src).toContain("ayaan:page-footer-updated");
});

// 8. Storefront Sections & Renderer
test("8. Storefront Components: 7 typed section components and dispatcher renderer exist", () => {
  const components = [
    "../src/components/cms/sections/HeroBannerSection.tsx",
    "../src/components/cms/sections/RichTextSection.tsx",
    "../src/components/cms/sections/ImageTextSection.tsx",
    "../src/components/cms/sections/FeatureGridSection.tsx",
    "../src/components/cms/sections/FaqAccordionSection.tsx",
    "../src/components/cms/sections/GalleryGridSection.tsx",
    "../src/components/cms/sections/CtaSection.tsx",
    "../src/components/cms/CmsSectionRenderer.tsx",
    "../src/components/cms/CmsPageView.tsx",
  ];

  for (const comp of components) {
    const fullPath = path.resolve(__dirname, comp);
    expect(fs.existsSync(fullPath)).toBe(true);
  }

  const rendererSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/cms/CmsSectionRenderer.tsx"), "utf-8");
  expect(rendererSrc).toContain("case \"hero_banner\":");
  expect(rendererSrc).toContain("case \"rich_text\":");
  expect(rendererSrc).toContain("case \"image_text\":");
  expect(rendererSrc).toContain("case \"feature_grid\":");
  expect(rendererSrc).toContain("case \"faq_accordion\":");
  expect(rendererSrc).toContain("case \"gallery_grid\":");
  expect(rendererSrc).toContain("case \"call_to_action\":");
});

// 9. Dynamic Storefront Route [slug]
test("9. Dynamic Route: src/app/[slug]/page.tsx enforces reserved slugs, 301 redirects, and SEO", () => {
  const routePath = path.resolve(__dirname, "../src/app/[slug]/page.tsx");
  expect(fs.existsSync(routePath)).toBe(true);
  const src = fs.readFileSync(routePath, "utf-8");

  expect(src).toContain("RESERVED_SLUGS.includes(clean)");
  expect(src).toContain("redirect((pageOrRedirect as any).canonical_url)");
  expect(src).toContain("notFound()");
  expect(src).toContain("generateMetadata");
  expect(src).toContain("<CmsPageView page={page} />");

  const viewSrc = fs.readFileSync(
    path.resolve(__dirname, "../src/components/cms/CmsPageView.tsx"),
    "utf-8"
  );
  expect(viewSrc).toContain("buildCmsBreadcrumbs");
});

// 10. Dynamic Footer PAGES Column
test("10. Dynamic Footer: Footer.tsx contains third dynamic PAGES column with 5-to-6 responsive grid transition", () => {
  const footerPath = path.resolve(__dirname, "../src/components/layout/Footer.tsx");
  const src = fs.readFileSync(footerPath, "utf-8");

  expect(src).toContain("cmsPageService.getFooterPages()");
  expect(src).toContain("PAGES");
  expect(src).toContain("footerPages.map((page)");
  expect(src).toContain("footerPages.length > 0");
  expect(src).toContain("ayaan:page-updated");
  expect(src).toContain("ayaan:page-footer-updated");
  // 6-column grid layout transition
  expect(src).toContain("lg:grid-cols-6");
});

// 11. Admin Navigation Sidebar
test("11. Admin Sidebar: Contains Pages (CMS) navigation item under STOREFRONT with LayoutTemplate icon", () => {
  const sidebarPath = path.resolve(__dirname, "../src/components/admin/layout/AdminSidebar.tsx");
  const src = fs.readFileSync(sidebarPath, "utf-8");

  expect(src).toContain("LayoutTemplate");
  expect(src).toContain("label: \"Pages (CMS)\"");
  expect(src).toContain("href: \"/ayc/pages\"");
  expect(src).toContain("permission: ADMIN_PERMISSIONS.PAGE_VIEW");
});

// 12. Admin Pages & Section Editors
test("12. Admin CMS Management UI: Index, New, and [id] editor pages and section editors exist", () => {
  const paths = [
    "../src/app/ayc/pages/page.tsx",
    "../src/app/ayc/pages/new/page.tsx",
    "../src/app/ayc/pages/[id]/page.tsx",
    "../src/components/admin/pages/SectionListEditor.tsx",
    "../src/components/admin/pages/PagePreviewModal.tsx",
    "../src/components/admin/pages/editors/HeroBannerEditor.tsx",
    "../src/components/admin/pages/editors/RichTextEditor.tsx",
    "../src/components/admin/pages/editors/ImageTextEditor.tsx",
    "../src/components/admin/pages/editors/FeatureGridEditor.tsx",
    "../src/components/admin/pages/editors/FaqAccordionEditor.tsx",
    "../src/components/admin/pages/editors/GalleryGridEditor.tsx",
    "../src/components/admin/pages/editors/CtaEditor.tsx",
    "../src/components/admin/pages/editors/CmsImageUploader.tsx",
  ];

  for (const p of paths) {
    const fullPath = path.resolve(__dirname, p);
    expect(fs.existsSync(fullPath)).toBe(true);
  }

  const editorSrc = fs.readFileSync(path.resolve(__dirname, "../src/app/ayc/pages/[id]/page.tsx"), "utf-8");
  expect(editorSrc).toContain("handleSaveDraft");
  expect(editorSrc).toContain("handlePublish");
  expect(editorSrc).toContain("PagePreviewModal");
  expect(editorSrc).toContain("SectionListEditor");

  const previewSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/admin/pages/PagePreviewModal.tsx"), "utf-8");
  expect(previewSrc).toContain("w-[768px]"); // tablet
  expect(previewSrc).toContain("w-[375px]"); // mobile
});

// 13. Sitemap Integration
test("13. Sitemap: src/app/sitemap.ts incorporates published CMS pages dynamically", () => {
  const sitemapPath = path.resolve(__dirname, "../src/app/sitemap.ts");
  const src = fs.readFileSync(sitemapPath, "utf-8");

  expect(src).toContain("cmsPageService.getPublishedPages()");
  expect(src).toContain("p.slug");
});

console.log("==================================================================");
console.log("ALL 13 AYC CMS PAGE BUILDER ARCHITECTURE TESTS PASSED!");
console.log("==================================================================");
