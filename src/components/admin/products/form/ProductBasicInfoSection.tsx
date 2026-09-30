"use client";

import { useState } from "react";
import { Sparkles, Plus, AlertCircle } from "lucide-react";
import BrandModal from "@/components/admin/BrandModal";
import { BrandModel } from "@/services/brand.service";

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
  audience: "MEN" | "WOMEN" | "BOYS" | "GIRLS" | "UNISEX" | "";
  designType: "ORIGINAL" | "MASTER COPY" | "";
  material: string;
  sizeDescription?: string;
  colourDescription?: string;
  description: string;
  brands: BrandOption[];
  categories: CategoryOption[];
  isEdit?: boolean;
  errors: Record<string, string>;
  onProductIdChange: (val: string) => void;
  onNameChange: (val: string) => void;
  onNameBlur?: () => void;
  onSlugChange: (val: string) => void;
  onSkuChange: (val: string) => void;
  onBrandChange: (brandName: string, brandId?: string, brandLogo?: string) => void;
  onCategoryChange: (catId: string, catName?: string) => void;
  onAudienceChange: (val: "MEN" | "WOMEN" | "BOYS" | "GIRLS" | "UNISEX" | "") => void;
  onDesignTypeChange: (val: "ORIGINAL" | "MASTER COPY" | "") => void;
  onMaterialChange: (val: string) => void;
  onSizeDescriptionChange?: (val: string) => void;
  onColourDescriptionChange?: (val: string) => void;
  onDescriptionChange: (val: string) => void;
  onBrandCreated?: (newBrand: BrandModel) => void;
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
  categoryId,
  audience,
  designType,
  material,
  sizeDescription,
  colourDescription,
  description,
  brands,
  categories,
  isEdit,
  errors,
  onProductIdChange,
  onNameChange,
  onNameBlur,
  onSlugChange,
  onSkuChange,
  onBrandChange,
  onCategoryChange,
  onAudienceChange,
  onDesignTypeChange,
  onMaterialChange,
  onSizeDescriptionChange,
  onColourDescriptionChange,
  onDescriptionChange,
  onBrandCreated,
}: ProductBasicInfoSectionProps) {
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

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

        {/* 4. SKU */}
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

        {/* Brand & Category 2-Column */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Brand */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                Brand <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsBrandModalOpen(true)}
                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Add Brand
              </button>
            </div>
            <div className="relative">
              <select
                value={brand}
                onChange={handleBrandSelect}
                className={selectClass(Boolean(errors.brand))}
              >
                <option value="">Select brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.brand && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle size={12} />
                {errors.brand}
              </p>
            )}
          </div>

          {/* Product Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Product Category <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={categoryId}
                onChange={(e) => {
                  const catId = e.target.value;
                  const found = categories.find((c) => String(c.id) === String(catId));
                  onCategoryChange(catId, found?.name);
                }}
                className={selectClass(Boolean(errors.category))}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
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

        {/* Description */}
        <div>
          <label htmlFor="product-description-textarea" className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
            Product Description
          </label>
          <textarea
            id="product-description-textarea"
            rows={4}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Detailed wholesale product description, fabric specs, construction details, and stitch finish..."
            className="w-full p-3.5 rounded-xl border border-border bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-colors leading-relaxed resize-y"
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
    </div>
  );
}
