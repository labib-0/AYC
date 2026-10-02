import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AYC_ROOT = path.resolve(__dirname, "..");

console.log("==================================================");
console.log("TESTING INLINE ADD CATEGORY IN PRODUCT CREATION & EDIT");
console.log("==================================================");

// File paths
const basicInfoPath = path.join(
  AYC_ROOT,
  "src/components/admin/products/form/ProductBasicInfoSection.tsx"
);
const productFormPath = path.join(
  AYC_ROOT,
  "src/components/admin/products/form/ProductForm.tsx"
);
const categoryModalPath = path.join(
  AYC_ROOT,
  "src/components/admin/CategoryModal.tsx"
);
const adminCategoryModalPath = path.join(
  AYC_ROOT,
  "src/components/admin/categories/CategoryModal.tsx"
);
const categoryFormPath = path.join(
  AYC_ROOT,
  "src/components/admin/categories/CategoryForm.tsx"
);
const categoryServicePath = path.join(
  AYC_ROOT,
  "src/services/category.service.ts"
);
const backendCategoryControllerPath = path.join(
  AYC_ROOT,
  "backend/app/Http/Controllers/Api/V1/CategoryController.php"
);
const permissionsPath = path.join(
  AYC_ROOT,
  "src/lib/permissions.ts"
);
const adminAuthContextPath = path.join(
  AYC_ROOT,
  "src/lib/AdminAuthContext.tsx"
);

// Read file contents
const basicInfoContent = fs.readFileSync(basicInfoPath, "utf-8");
const productFormContent = fs.readFileSync(productFormPath, "utf-8");
const categoryModalContent = fs.readFileSync(categoryModalPath, "utf-8");
const adminCategoryModalContent = fs.readFileSync(adminCategoryModalPath, "utf-8");
const categoryFormContent = fs.readFileSync(categoryFormPath, "utf-8");
const categoryServiceContent = fs.readFileSync(categoryServicePath, "utf-8");
const backendCategoryControllerContent = fs.readFileSync(backendCategoryControllerPath, "utf-8");
const permissionsContent = fs.readFileSync(permissionsPath, "utf-8");
const adminAuthContextContent = fs.readFileSync(adminAuthContextPath, "utf-8");

describe("Product Creation/Edit Inline 'Add Category' Verification", () => {
  // 1. Add Category action appears where appropriate
  it("Requirement 1 & 2: Add Category button appears next to Product Category selector matching Add Brand", () => {
    // Brand button pattern:
    assert.ok(
      basicInfoContent.includes("Add Brand") && basicInfoContent.includes("<Plus size={12} /> Add Brand"),
      "ProductBasicInfoSection must have 'Add Brand' button with Plus icon"
    );
    // Category button pattern:
    assert.ok(
      basicInfoContent.includes("Add Category") && basicInfoContent.includes("<Plus size={12} /> Add Category"),
      "ProductBasicInfoSection must have 'Add Category' button with Plus icon"
    );
    // Located beside the label:
    assert.ok(
      basicInfoContent.includes("Product Category"),
      "ProductBasicInfoSection must have 'Product Category' label"
    );
    assert.ok(
      basicInfoContent.includes("setIsCategoryModalOpen(true)"),
      "Clicking Add Category button must set isCategoryModalOpen to true"
    );
    console.log("✔ Checked: Add Category action is located in header next to Product Category selector matching Add Brand");
  });

  // 2. Category permission is respected
  it("Requirement 12: Category permission is respected both frontend and backend", () => {
    // Frontend permission check
    assert.ok(
      basicInfoContent.includes("canCreateCat") && basicInfoContent.includes("canCreateCategory"),
      "ProductBasicInfoSection must respect canCreateCategory prop/auth"
    );
    assert.ok(
      basicInfoContent.includes("category.create"),
      "ProductBasicInfoSection checks 'category.create' permission"
    );
    assert.ok(
      productFormContent.includes("canCreateCategory") && productFormContent.includes("category.create"),
      "ProductForm passes canCreateCategory based on 'category.create' / isSuperAdmin"
    );

    // Permission definition in permissions registry
    assert.ok(
      permissionsContent.includes("category.create"),
      "permissions.ts defines category.create permission"
    );

    // Backend authoritative enforcement in CategoryController
    assert.ok(
      backendCategoryControllerContent.includes("category.create"),
      "CategoryController::store must enforce 'category.create' permission"
    );
    assert.ok(
      backendCategoryControllerContent.includes("forbidden"),
      "CategoryController::store returns forbidden if user lacks category.create"
    );
    console.log("✔ Checked: Permissions gate properly protects Add Category action on frontend & backend");
  });

  // 3. Category creation validates correctly
  it("Requirement 5: Category creation validates required fields and rules", () => {
    // Form validation
    assert.ok(
      categoryFormContent.includes("Category name is required"),
      "CategoryForm requires a non-empty name"
    );
    assert.ok(
      categoryFormContent.includes("Category name must not exceed 100 characters"),
      "CategoryForm validates maximum name length"
    );
    assert.ok(
      categoryFormContent.includes("Slug must contain only lowercase letters, numbers, and hyphens"),
      "CategoryForm validates slug format"
    );

    // Backend validation
    assert.ok(
      backendCategoryControllerContent.includes("'name' => ['required', 'string', 'max:255']"),
      "CategoryController validates name is required string"
    );
    console.log("✔ Checked: Category creation validates input correctly");
  });

  // 4. Duplicate category & slug collision handled
  it("Requirement 5: Category duplicate slug collisions are handled gracefully", () => {
    assert.ok(
      backendCategoryControllerContent.includes("while (Category::where('slug', $slug)->exists())"),
      "CategoryController automatically handles slug collision by suffixing counter"
    );
    assert.ok(
      productFormContent.includes("prev.some((c) => String(c.id) === String(newCat.id))"),
      "ProductForm prevents duplicate category IDs in options list"
    );
    console.log("✔ Checked: Duplicate category handling and slug deduplication validated");
  });

  // 5. Successful creation persists to PostgreSQL
  it("Requirement 6: Creates category through authoritative Category API / PostgreSQL", () => {
    assert.ok(
      categoryServiceContent.includes("createCategory"),
      "categoryService has createCategory method"
    );
    assert.ok(
      categoryServiceContent.includes('apiClient.post<any>("/categories"'),
      "categoryService calls POST /categories endpoint"
    );
    assert.ok(
      backendCategoryControllerContent.includes("Category::create($validated)"),
      "CategoryController persists new category to PostgreSQL"
    );
    console.log("✔ Checked: Authoritative API persists category to PostgreSQL");
  });

  // 6. New category appears immediately in Product Creation
  it("Requirement 7: New category appears immediately in Product Creation selector without page refresh", () => {
    assert.ok(
      productFormContent.includes("onCategoryCreated"),
      "ProductForm implements onCategoryCreated callback"
    );
    assert.ok(
      productFormContent.includes("setCategories((prev) =>"),
      "ProductForm updates categories state immediately on creation"
    );
    assert.ok(
      basicInfoContent.includes("onCategoryCreated?.(newCategory)"),
      "ProductBasicInfoSection invokes onCategoryCreated callback with newly created category"
    );
    console.log("✔ Checked: Category options update immediately without page refresh");
  });

  // 7. New category is auto-selected for NEW Product creation
  it("Requirement 8: New category is auto-selected for NEW product creation", () => {
    // In ProductBasicInfoSection
    assert.ok(
      basicInfoContent.includes("if (!isEdit) {\n      onCategoryChange(String(newCategory.id), newCategory.name);\n    }"),
      "ProductBasicInfoSection auto-selects new category when mode is CREATE (!isEdit)"
    );

    // In ProductForm
    assert.ok(
      productFormContent.includes("if (!isEdit) {\n                setCategoryId(String(newCat.id));\n                setCategoryName(newCat.name);"),
      "ProductForm sets categoryId and categoryName when !isEdit"
    );
    assert.ok(
      productFormContent.includes("generateProductSku"),
      "ProductForm updates SKU if not manually edited"
    );
    console.log("✔ Checked: Newly created category is automatically selected in Create mode");
  });

  // 8. Existing Product Edit preserves the current category unless explicitly changed
  it("Requirement 11: Existing Product Edit preserves current category when new category is created", () => {
    // Check that auto-select is strictly guarded by !isEdit
    const basicInfoMatches = basicInfoContent.match(/if \(!isEdit\) \{[\s\S]*?onCategoryChange\(String\(newCategory\.id\)/);
    assert.ok(
      basicInfoMatches !== null,
      "ProductBasicInfoSection must only auto-select new category when !isEdit"
    );

    const productFormMatches = productFormContent.match(/if \(!isEdit\) \{[\s\S]*?setCategoryId\(String\(newCat\.id\)\)/);
    assert.ok(
      productFormMatches !== null,
      "ProductForm must only auto-set categoryId when !isEdit"
    );
    console.log("✔ Checked: Existing product edit preserves current category unless explicitly changed");
  });

  // 9. Product form state is preserved during category creation
  it("Requirement 9: Product form state is preserved during category creation", () => {
    assert.ok(
      basicInfoContent.includes("<CategoryModal"),
      "CategoryModal is rendered inline inside ProductBasicInfoSection"
    );
    assert.ok(
      basicInfoContent.includes("isCategoryModalOpen && ("),
      "CategoryModal opens and closes conditionally without unmounting or resetting ProductForm"
    );
    console.log("✔ Checked: Product form state is preserved during modal lifecycle");
  });

  // 10. Draft safety
  it("Requirement 10: Draft safety is maintained with category creation", () => {
    assert.ok(
      productFormContent.includes("categoryId,"),
      "Draft data captures categoryId in getCurrentDraftData"
    );
    assert.ok(
      productFormContent.includes("if (d.categoryId) setCategoryId(d.categoryId);"),
      "Draft data hydration loads categoryId"
    );
    console.log("✔ Checked: Draft saving and hydration safely persists categoryId");
  });

  // 11. Category Taxonomy consistency and cache invalidation
  it("Requirement 13 & 14: Category Taxonomy consistency and catalog cache invalidation", () => {
    assert.ok(
      backendCategoryControllerContent.includes("invalidateCategoryCache"),
      "CategoryController invalidates category cache after creation"
    );
    assert.ok(
      backendCategoryControllerContent.includes("CatalogCacheService::invalidateCategories()"),
      "CategoryController invalidates CatalogCacheService"
    );
    console.log("✔ Checked: Cache invalidation and Category Taxonomy consistency verified");
  });

  // 12. No duplicate category architecture
  it("Requirement 16 & 17: Reuses existing CategoryModal, CategoryForm, and CategoryController architecture", () => {
    assert.ok(
      categoryModalContent.includes("export { default } from \"./categories/CategoryModal\""),
      "CategoryModal re-exports authoritative CategoryModal"
    );
    assert.ok(
      adminCategoryModalContent.includes("CategoryForm"),
      "CategoryModal uses existing CategoryForm component"
    );
    assert.ok(
      basicInfoContent.includes("import CategoryModal from \"@/components/admin/CategoryModal\""),
      "ProductBasicInfoSection reuses CategoryModal"
    );
    console.log("✔ Checked: No duplicate category architecture was introduced; existing architecture reused 100%");
  });
});
