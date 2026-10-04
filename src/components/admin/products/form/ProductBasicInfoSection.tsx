"use client";

import { useState, useContext } from "react";
import { Sparkles, Plus, AlertCircle } from "lucide-react";
import BrandModal from "@/components/admin/BrandModal";
import CategoryModal from "@/components/admin/CategoryModal";
import { BrandModel } from "@/services/brand.service";
import { CategoryModel } from "@/services/category.service";
import { useOptionalAdminAuth } from "@/lib/AdminAuthContext";
import ProductDescriptionEditor from "./ProductDescriptionEditor";
import SearchableSelect from "@/components/common/SearchableSelect";
import SupplierSelect from "./SupplierSelect";
import { SupplierModel } from "@/types/b2b";

interface CategoryOption {
  id: string;
  name: string;
}

interface BrandOption {
  id: string;
  name: string;
  logo_url?: string;
}

interface ProductBasicInfoSectionProps {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  brandId?: string | number;
  categoryId: string;
  categoryName?: string;
  audience: "MEN" | "WOMEN" | "BOYS" | "GIRLS" | "UNISEX" | "";
  designType: "ORIGINAL" | "MASTER COPY" | "";
  material: string;
  sizeDescription?: string;
  colourDescription?: string;
  description: string;
  supplierId?: string | number | null;
  selectedSupplier?: SupplierModel | null;
  brands: BrandOption[];
  categories: CategoryOption[];
  isEdit?: boolean;
  errors: Record<string, string>;
  canCreateCategory?: boolean;
  onProductIdChange: (val: string) => void;
  onNameChange: (val: string) => void;
  onNameBlur?: () => void;
  onSlugChange: (val: string) => void;
  onSkuChange: (val: string) => void;
  onBrandChange: (brandName: string, brandId?: string, brandLogo?: string) => void;
  onCategoryChange: (catId: string, catName?: string) => void;
  onSupplierChange?: (supplierId: number | null, supplier: SupplierModel | null) => void;
  onAudienceChange: (val: "MEN" | "WOMEN" | "BOYS" | "GIRLS" | "UNISEX" | "") => void;
  onDesignTypeChange: (val: "ORIGINAL" | "MASTER COPY" | "") => void;
  onMaterialChange: (val: string) => void;
  onSizeDescriptionChange?: (val: string) => void;
  onColourDescriptionChange?: (val: string) => void;
  onDescriptionChange: (val: string) => void;
  onBrandCreated?: (newBrand: BrandModel) => void;
  onCategoryCreated?: (newCategory: CategoryModel) => void;
}

const AUDIENCE_OPTIONS: Array<"MEN" | "WOMEN" | "BOYS" | "GIRLS" | "UNISEX"> = [
  "MEN",
  "WOMEN",
  "BOYS",
  "GIRLS",
  "UNISEX",
];

const DESIGN_TYPE_OPTIONS: Array<"ORIGINAL" | "MASTER COPY"> = [
  "ORIGINAL",
  "MASTER COPY",
];

export default function ProductBasicInfoSection({
  productId,
  name,
  slug,
  sku,
  brand,
  brandId,
  categoryId,
  categoryName,
  audience,
  designType,
  material,
  sizeDescription,
  colourDescription,
  description,
  supplierId,
  selectedSupplier,
  brands,
  categories,
  isEdit,
  errors,
  canCreateCategory,
  onProductIdChange,
  onNameChange,
  onNameBlur,
  onSlugChange,
  onSkuChange,
  onBrandChange,
  onCategoryChange,
  onSupplierChange,
  onAudienceChange,
  onDesignTypeChange,
  onMaterialChange,
  onSizeDescriptionChange,
  onColourDescriptionChange,
  onDescriptionChange,
  onBrandCreated,
  onCategoryCreated,
}: ProductBasicInfoSectionProps) {
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const auth = useOptionalAdminAuth();
  const canCreateCat = canCreateCategory !== undefined
    ? canCreateCategory
    : auth
      ? (auth.isSuperAdmin || auth.can("category.create"))
      : true;

  const handleBrandSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    const found = brands.find((b) => b.name === selectedName);
    onBrandChange(selectedName, found ? found.id : undefined, found?.logo_url);
  };

  const handleBrandSuccess = (newBrand: BrandModel) => {
    setIsBrandModalOpen(false);
    onBrandChange(newBrand.name, String(newBrand.id), newBrand.logo_url || newBrand.logo);
    onBrandCreated?.(newBrand);
  };

  const handleCategorySuccess = (newCategory: CategoryModel) => {
    setIsCategoryModalOpen(false);
    onCategoryCreated?.(newCategory);
    if (!isEdit) {
      onCategoryChange(String(newCategory.id), newCategory.name);
    }
  };

  const inputClass = (hasError?: boolean) =>
    `w-full h-10 px-3.5 rounded-xl border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${
      hasError
        ? "border-red-500 focus:ring-red-500/30"
        : "border-border focus:ring-ring/40"
    }`;

  const selectClass = (hasError?: boolean) =>
    `w-full h-10 px-3.5 rounded-xl border bg-card text-xs font-medium text-foreground focus:outline-none focus:ring-2 transition-colors cursor-pointer appearance-none ${
      hasError
        ? "border-red-500 focus:ring-red-500/30"
        : "border-border focus:ring-ring/40"
    }`;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="border-b border-border/60 pb-3">
        <h2 className="text-sm font-bold text-foreground tracking-tight uppercase">
          Basic Information
        </h2>
      </div>

      <div className="space-y-4">
        {/* 1. Product ID */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
            Product ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={productId}
            onChange={(e) => onProductIdChange(e.target.value)}
            placeholder="e.g. AY-1001, AY/1001"
            className={`font-mono ${inputClass(Boolean(errors.productId))}`}
          />
          {errors.productId && (
            <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle size={12} />
              {errors.productId}
            </p>
          )}
        </div>

        {/* 2. Product Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={() => onNameBlur?.()}
            placeholder="e.g. Heavyweight Pullover Fleece Hoodie"
            className={inputClass(Boolean(errors.name))}
          />
          {errors.name && (
            <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle size={12} />
              {errors.name}
            </p>
          )}
        </div>

        {/* 3. Slug */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
            Slug <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            placeholder="heavyweight-pullover-fleece-hoodie"
            className={`font-mono text-[11px] ${inputClass(Boolean(errors.slug))}`}
          />
          {errors.slug && (
            <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle size={12} />
              {errors.slug}
            </p>
          )}
        </div>

        {/* 4. SKU & Supplier Selector 2-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              SKU
            </label>
            <input
              type="text"
              value={sku}
              onChange={(e) => onSkuChange(e.target.value)}
              placeholder="e.g. AYC-XXXX-001"
              className={`font-mono ${inputClass(Boolean(errors.sku))}`}
            />
            {errors.sku && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} />
                {errors.sku}
              </p>
            )}
          </div>

          <div>
            <SupplierSelect
              value={supplierId}
              selectedSupplier={selectedSupplier}
              onChange={(supId, sup) => onSupplierChange?.(supId, sup)}
              error={errors.supplier_id || errors.supplierId}
            />
          </div>
        </div>

        {/* Brand & Category 2-Column */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Brand */}
          <div>
            <SearchableSelect
              id="product-brand-select"
              label="Brand"
              required
              placeholder="Select brand"
              searchPlaceholder="Search brands..."
              options={brands}
              value={brand || (brandId ? String(brandId) : "")}
              fallbackDisplay={brand || (brandId ? brands.find((b) => String(b.id) === String(brandId))?.name : undefined)}
              onChange={(val, opt) => {
                const bName = opt ? opt.name : val;
                const rawId = opt ? opt.id : brands.find((b) => b.name === val)?.id;
                const bId = rawId !== undefined ? String(rawId) : undefined;
                const bLogo = opt?.logo_url || brands.find((b) => b.name === val)?.logo_url;
                onBrandChange(bName, bId, bLogo);
              }}
              hasError={Boolean(errors.brand)}
              actionButton={
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(true)}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Add Brand
                </button>
              }
            />
            {errors.brand && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} />
                {errors.brand}
              </p>
            )}
          </div>

          {/* Product Category */}
          <div>
            <SearchableSelect
              id="product-category-select"
              label="Product Category"
              required
              placeholder="Select category"
              searchPlaceholder="Search categories..."
              options={categories}
              value={categoryId}
              fallbackDisplay={categoryName || categories.find((c) => String(c.id) === String(categoryId))?.name}
              onChange={(catId, opt) => {
                const found = opt || categories.find((c) => String(c.id) === String(catId));
                onCategoryChange(catId, found?.name);
              }}
              hasError={Boolean(errors.category)}
              actionButton={
                canCreateCat ? (
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Add Category
                  </button>
                ) : undefined
              }
            />
            {errors.category && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} />
                {errors.category}
              </p>
            )}
          </div>
        </div>

        {/* Audience */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
            Audience <span className="text-red-500">*</span>
          </label>
          <select
            value={audience}
            onChange={(e) =>
              onAudienceChange(e.target.value as "MEN" | "WOMEN" | "BOYS" | "GIRLS" | "UNISEX" | "")
            }
            className={selectClass(Boolean(errors.audience))}
          >
            <option value="">Select audience</option>
            {AUDIENCE_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          {errors.audience && (
            <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle size={12} />
              {errors.audience}
            </p>
          )}
        </div>

        {/* Specifications: Design Type, Material, Size, Colour */}
        <div className="p-4 rounded-xl border border-border/80 bg-secondary/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Specifications
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              Customer Storefront Tiles (Design Type, Material, Size, Colour)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Design Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Design Type <span className="text-red-500">*</span>
              </label>
              <select
                value={designType}
                onChange={(e) => onDesignTypeChange(e.target.value as "ORIGINAL" | "MASTER COPY" | "")}
                className={selectClass(Boolean(errors.designType))}
              >
                <option value="">Select design type</option>
                {DESIGN_TYPE_OPTIONS.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
              {errors.designType && (
                <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} />
                  {errors.designType}
                </p>
              )}
            </div>

            {/* Material */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Material
              </label>
              <input
                type="text"
                id="product-spec-material-input"
                value={material}
                onChange={(e) => onMaterialChange(e.target.value)}
                placeholder="e.g. 100% Combed Cotton, 280 GSM Fleece"
                className={inputClass()}
              />
            </div>

            {/* Size */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Size
              </label>
              <input
                type="text"
                id="product-spec-size-input"
                value={sizeDescription || ""}
                onChange={(e) => onSizeDescriptionChange?.(e.target.value)}
                placeholder="e.g. 28–38 or S–XXL"
                className={inputClass()}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Admin-entered size text. Not derived from variants.
              </p>
            </div>

            {/* Colour */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
                Colour
              </label>
              <input
                type="text"
                id="product-spec-colour-input"
                value={colourDescription || ""}
                onChange={(e) => onColourDescriptionChange?.(e.target.value)}
                placeholder="e.g. Olive, Red, Navy"
                className={inputClass()}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Admin-entered colour text. Not derived from variants.
              </p>
            </div>
          </div>
        </div>

        {/* Description Editor (Wide & User-Friendly with Bold, Italic & Preview) */}
        <div className="pt-2">
          <label htmlFor="product-description-textarea" className="sr-only">
            Product Description
          </label>
          <ProductDescriptionEditor
            id="product-description-textarea"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>
      </div>

      {/* Brand Creation Modal */}
      {isBrandModalOpen && (
        <BrandModal
          isOpen={isBrandModalOpen}
          onClose={() => setIsBrandModalOpen(false)}
          onSuccess={handleBrandSuccess}
        />
      )}

      {/* Category Creation Modal */}
      {isCategoryModalOpen && (
        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onSuccess={handleCategorySuccess}
        />
      )}
    </div>
  );
}
