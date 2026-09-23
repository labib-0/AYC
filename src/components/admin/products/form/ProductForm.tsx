"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Globe, AlertCircle, CheckCircle2 } from "lucide-react";
import { B2BProductInput, B2BProductVariant } from "@/types/b2b";
import { ShippingPackageProfile } from "@/types";
import { getBrands } from "@/lib/services/brands";
import { mockStore } from "@/lib/mock-data/mock-store";
import { generateProductSku } from "@/lib/services/products";

import ProductBasicInfoSection from "./ProductBasicInfoSection";
import ProductImagesSection from "./ProductImagesSection";
import ProductPricingSection from "./ProductPricingSection";
import ProductVariantsSection from "./ProductVariantsSection";
import ProductShippingSection from "./ProductShippingSection";
import ProductSeoSection from "./ProductSeoSection";
import ProductPublishSection from "./ProductPublishSection";

interface ProductFormProps {
  initialData?: Partial<B2BProductInput>;
  mode: "create" | "edit";
  onSubmit: (data: B2BProductInput) => Promise<B2BProductInput | null | void>;
}

export default function ProductForm({
  initialData,
  mode,
  onSubmit,
}: ProductFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isEdit = mode === "edit";

  // Navigation back link context
  const isUnderAdminPath = pathname.startsWith("/admin");
  const backHref = isUnderAdminPath ? "/admin/products" : "/products";

  // Reference Data State
  const [brands, setBrands] = useState<Array<{ id: string; name: string; logo_url?: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  // Form State
  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [brand, setBrand] = useState(initialData?.brand || "");
  const [brandId, setBrandId] = useState<string | number | undefined>(initialData?.brand_id);
  const [brandLogo, setBrandLogo] = useState<string | undefined>(initialData?.brandLogo);
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
  const [categoryName, setCategoryName] = useState(initialData?.categoryName || "");
  const [audience, setAudience] = useState<"MEN" | "WOMEN" | "BOYS" | "GIRLS" | "UNISEX">(
    initialData?.audience || "MEN"
  );
  const [designType, setDesignType] = useState<"ORIGINAL" | "MASTER COPY">(() => {
    const raw = (initialData?.designType || initialData?.productType || "").toUpperCase();
    return raw === "MASTER COPY" || raw === "REPLICA" || raw === "MC" ? "MASTER COPY" : "ORIGINAL";
  });
  const [material, setMaterial] = useState(initialData?.material || "");
  const [description, setDescription] = useState(initialData?.description || "");

  // Media
  const [images, setImages] = useState<string[]>(initialData?.images || []);

  // Pricing
  const [wholesalePrice, setWholesalePrice] = useState(initialData?.wholesalePrice || 25.0);
  const [moq, setMoq] = useState(initialData?.moq || 10);
  const [bulkThreshold, setBulkThreshold] = useState(initialData?.bulkThreshold || 100);
  const [bulkPrice, setBulkPrice] = useState(initialData?.bulkPrice || 20.0);
  const [fullStockPrice, setFullStockPrice] = useState<number | undefined>(initialData?.fullStockPrice);
  const [msrpPrice, setMsrpPrice] = useState<number | undefined>(initialData?.msrpPrice);
  const [costPrice, setCostPrice] = useState<number | undefined>(initialData?.costPrice);

  // Promotion
  const [isNew, setIsNew] = useState(Boolean(initialData?.isNew));
  const [isHot, setIsHot] = useState(Boolean(initialData?.isHot));
  const [isFeatured, setIsFeatured] = useState(Boolean(initialData?.isFeatured));

  // Variants & Stock
  const [colors, setColors] = useState<string[]>(
    initialData?.colors && initialData.colors.length > 0 ? initialData.colors : ["Black", "White"]
  );
  const [sizes, setSizes] = useState<string[]>(
    initialData?.sizes && initialData.sizes.length > 0 ? initialData.sizes : ["S", "M", "L", "XL"]
  );
  const [stock, setStock] = useState(initialData?.stock ?? 500);

  // Shipping Profiles
  const [shippingProfiles, setShippingProfiles] = useState<ShippingPackageProfile[]>(() => {
    const raw = initialData?.shippingPackageProfiles || initialData?.shipping_package_profiles;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((p) => ({
        ...p,
        package_quantity: Number(p.package_quantity || 10),
        carton_count: Number(p.carton_count || 1),
        carton_length: Number(p.carton_length || 60),
        carton_width: Number(p.carton_width || 40),
        carton_height: Number(p.carton_height || 30),
        dimension_unit: (p.dimension_unit || "cm") as "cm" | "in" | "m",
        gross_weight: Number(p.gross_weight || 15),
        weight_unit: (p.weight_unit || "kg") as "kg" | "lbs",
        is_active: true,
      }));
    }
    return [
      {
        package_quantity: initialData?.moq || 10,
        carton_count: 1,
        carton_length: 60,
        carton_width: 40,
        carton_height: 30,
        dimension_unit: "cm",
        gross_weight: 15,
        weight_unit: "kg",
        is_active: true,
      },
    ];
  });

  // SEO
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || initialData?.name || "");
  const [seoDescription, setSeoDescription] = useState(
    initialData?.seoDescription || initialData?.shortDescription || ""
  );
  const [keywords, setKeywords] = useState<string[]>(initialData?.keywords || []);

  // Publish Status
  const [status, setStatus] = useState<"published" | "draft">(
    initialData?.status === "draft" ? "draft" : "published"
  );

  // Submission & Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load Reference Data
  useEffect(() => {
    async function loadRefs() {
      try {
        const bList = await getBrands({ all: true, isAdmin: true });
        setBrands(bList.map((b) => ({ id: b.id, name: b.name, logo_url: b.logo_url || b.logo })));
        if (!brand && bList.length > 0 && !isEdit) {
          setBrand(bList[0].name);
          setBrandId(bList[0].id);
          setBrandLogo(bList[0].logo_url || bList[0].logo);
        }
      } catch {
        // Fallback
      }

      try {
        const cList = mockStore.getCategories();
        setCategories(cList.map((c) => ({ id: String(c.id), name: c.name })));
        if (!categoryId && cList.length > 0 && !isEdit) {
          setCategoryId(String(cList[0].id));
          setCategoryName(cList[0].name);
        }
      } catch {
        // Fallback
      }
    }
    loadRefs();
  }, [brand, categoryId, isEdit]);

  // Auto-generate slug from name in Create mode (unless manually edited)
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEdit && !slugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(generated);
    }
    if (errors.name) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
  };

  const handleSlugChange = (val: string) => {
    setSlugManuallyEdited(true);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
    );
    if (errors.slug) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.slug;
        return next;
      });
    }
  };

  // Readiness checklist
  const checklist = useMemo(
    () => ({
      hasName: name.trim().length > 0,
      hasBrand: brand.trim().length > 0,
      hasPrice: wholesalePrice > 0,
      hasImage: images.length > 0,
      hasMoq: moq > 0,
    }),
    [name, brand, wholesalePrice, images, moq]
  );

  // Validate form before submission
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = "Product name is required.";
    else if (name.trim().length < 3) errs.name = "Product name must be at least 3 characters.";

    if (!slug.trim()) errs.slug = "Slug / URL key is required.";

    if (!brand.trim()) errs.brand = "Brand selection is required.";

    if (!categoryId) errs.category = "Category selection is required.";

    if (wholesalePrice <= 0) errs.wholesalePrice = "Wholesale price must be greater than $0.00.";

    if (moq <= 0) errs.moq = "Minimum order quantity (MOQ) must be at least 1 unit.";

    if (bulkThreshold <= moq) {
      errs.bulkThreshold = `Bulk threshold (${bulkThreshold}) must be greater than MOQ (${moq}).`;
    }

    if (bulkPrice <= 0) errs.bulkPrice = "Bulk tier price must be greater than $0.00.";

    if (colors.length === 0) errs.colors = "Select at least one color.";

    if (sizes.length === 0) errs.sizes = "Select at least one size.";

    if (stock < 0) errs.stock = "Stock quantity cannot be negative.";

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setGeneralError("Please review the highlighted fields before saving.");
      return false;
    }
    setGeneralError(null);
    return true;
  };

  const handleSaveWithStatus = async (targetStatus: "published" | "draft") => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      const activeBrand = brands.find((b) => b.name === brand || String(b.id) === String(brandId));
      const activeCat = categories.find((c) => String(c.id) === String(categoryId));
      const generatedSku =
        initialData?.sku ||
        generateProductSku(brand || "AY", activeCat?.name || "APP", name || "PROD");

      // Generate variant combinations
      const variants: B2BProductVariant[] = [];
      const totalVariants = colors.length * sizes.length;
      const stockPerVar = totalVariants > 0 ? Math.floor(stock / totalVariants) : stock;

      colors.forEach((c) => {
        sizes.forEach((s) => {
          variants.push({
            sku: `${generatedSku}-${c.substring(0, 3).toUpperCase()}-${s.toUpperCase()}`,
            title: `${c} / ${s}`,
            color: c,
            size: s,
            wholesalePrice: wholesalePrice,
            stock: stockPerVar,
            isActive: true,
          });
        });
      });

      // Pricing Tiers
      const pricingTiers = [
        {
          min_quantity: moq,
          max_quantity: bulkThreshold - 1,
          unit_price: wholesalePrice,
        },
        {
          min_quantity: bulkThreshold,
          max_quantity: null,
          unit_price: bulkPrice,
        },
      ];

      const payload: B2BProductInput = {
        id: initialData?.id || `prod_${Date.now()}`,
        name: name.trim(),
        slug: slug.trim(),
        sku: generatedSku,
        brand: brand.trim(),
        brandLogo: activeBrand?.logo_url || brandLogo,
        brand_id: activeBrand?.id ? String(activeBrand.id) : undefined,
        categoryId: categoryId,
        categoryName: activeCat?.name || categoryName || "Apparel",
        audience: audience,
        designType: designType,
        productType: designType,
        description: description.trim(),
        shortDescription: seoDescription.trim() || description.slice(0, 160).trim(),
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        keywords: keywords,
        material: material.trim(),
        images: images.length > 0 ? images : ["/placeholder.jpg"],
        wholesalePrice: wholesalePrice,
        standardPrice: wholesalePrice,
        bulkThreshold: bulkThreshold,
        bulkPrice: bulkPrice,
        fullStockPrice: fullStockPrice,
        msrpPrice: msrpPrice,
        costPrice: costPrice,
        moq: moq,
        stock: stock,
        status: targetStatus,
        isNew: isNew,
        isHot: isHot,
        isFeatured: isFeatured,
        colors: colors,
        sizes: sizes,
        variants: variants,
        pricingTiers: pricingTiers,
        shippingPackageProfiles: shippingProfiles,
        shipping_package_profiles: shippingProfiles,
      };

      await onSubmit(payload);
      setSaveSuccess(true);

      // In create mode, redirect to the product list or edit route
      if (!isEdit) {
        setTimeout(() => {
          router.push(backHref);
        }, 800);
      }
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : "An error occurred while saving the product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Top Sticky Header & Action Toolbar */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-md py-3.5 border-b border-border/80 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="p-2 rounded-xl border border-border text-foreground hover:bg-secondary transition-colors"
            aria-label="Back to Products"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground tracking-tight uppercase">
                {isEdit ? "Edit Product" : "New Product"}
              </h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  status === "published"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit
                ? `Editing catalog specifications for ${initialData?.name || "product"}`
                : "Create and publish a new item into the wholesale product catalog."}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleSaveWithStatus("draft")}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-border text-foreground hover:bg-secondary transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save size={13} />
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSaveWithStatus("published")}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
          >
            {isSubmitting ? (
              <span className="w-3.5 h-3.5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            ) : (
              <Globe size={13} />
            )}
            <span>{isEdit ? "Save & Publish" : "Publish Product"}</span>
          </button>
        </div>
      </div>

      {/* General Notification / Error Banners */}
      {generalError && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Product saved successfully! Redirecting...</span>
        </div>
      )}

      {/* Main Form 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Main Specs) - 7 cols on desktop */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Basic Information */}
          <ProductBasicInfoSection
            name={name}
            slug={slug}
            brand={brand}
            brandId={brandId}
            categoryId={categoryId}
            audience={audience}
            designType={designType}
            material={material}
            description={description}
            brands={brands}
            categories={categories}
            isEdit={isEdit}
            errors={errors}
            onNameChange={handleNameChange}
            onSlugChange={handleSlugChange}
            onBrandChange={(bName, bId, bLogo) => {
              setBrand(bName);
              setBrandId(bId);
              setBrandLogo(bLogo);
            }}
            onCategoryChange={(cId, cName) => {
              setCategoryId(cId);
              if (cName) setCategoryName(cName);
            }}
            onAudienceChange={setAudience}
            onDesignTypeChange={setDesignType}
            onMaterialChange={setMaterial}
            onDescriptionChange={setDescription}
            onBrandCreated={(newB) => {
              setBrands((prev) => [...prev, { id: String(newB.id), name: newB.name, logo_url: newB.logo_url || newB.logo }]);
            }}
          />

          {/* Section 2: Variants & Stock */}
          <ProductVariantsSection
            colors={colors}
            sizes={sizes}
            stock={stock}
            sku={initialData?.sku || "AY-PROD"}
            errors={errors}
            onColorsChange={setColors}
            onSizesChange={setSizes}
            onStockChange={setStock}
          />

          {/* Section 3: Shipping Logistics */}
          <ProductShippingSection
            profiles={shippingProfiles}
            moq={moq}
            onChange={setShippingProfiles}
          />
        </div>

        {/* Right Column (Publishing, Pricing, Media, SEO) - 5 cols on desktop */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section 4: Visibility & Status */}
          <ProductPublishSection
            status={status}
            onStatusChange={setStatus}
            checklist={checklist}
          />

          {/* Section 5: Pricing & Volume Tiers */}
          <ProductPricingSection
            wholesalePrice={wholesalePrice}
            moq={moq}
            bulkThreshold={bulkThreshold}
            bulkPrice={bulkPrice}
            fullStockPrice={fullStockPrice}
            msrpPrice={msrpPrice}
            costPrice={costPrice}
            isNew={isNew}
            isHot={isHot}
            isFeatured={isFeatured}
            errors={errors}
            onWholesalePriceChange={setWholesalePrice}
            onMoqChange={setMoq}
            onBulkThresholdChange={setBulkThreshold}
            onBulkPriceChange={setBulkPrice}
            onFullStockPriceChange={setFullStockPrice}
            onMsrpPriceChange={setMsrpPrice}
            onCostPriceChange={setCostPrice}
            onIsNewChange={setIsNew}
            onIsHotChange={setIsHot}
            onIsFeaturedChange={setIsFeatured}
          />

          {/* Section 6: Product Images */}
          <ProductImagesSection
            images={images}
            onChange={setImages}
            error={errors.images}
          />

          {/* Section 7: SEO */}
          <ProductSeoSection
            seoTitle={seoTitle}
            seoDescription={seoDescription}
            keywords={keywords}
            productName={name}
            slug={slug}
            onSeoTitleChange={setSeoTitle}
            onSeoDescriptionChange={setSeoDescription}
            onKeywordsChange={setKeywords}
          />
        </div>
      </div>
    </div>
  );
}
