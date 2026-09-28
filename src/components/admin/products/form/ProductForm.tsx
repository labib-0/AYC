"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Globe, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { B2BProductInput, B2BProductVariant } from "@/types/b2b";
import { ShippingPackageProfile, PackageAllocation } from "@/types";
import { getBrands } from "@/lib/services/brands";
import { categoryService } from "@/services/category.service";
import { generateProductSku } from "@/lib/services/products";
import { productDraftService } from "@/lib/services/product-draft.service";
import AdminAuthModal from "@/components/admin/auth/AdminAuthModal";
import { ApiError } from "@/services/api-client";
import { useAdminAuth } from "@/lib/AdminAuthContext";

import ProductBasicInfoSection from "./ProductBasicInfoSection";
import ProductInventorySection from "./ProductInventorySection";
import ProductImagesSection from "./ProductImagesSection";
import ProductPricingSection from "./ProductPricingSection";
import ProductVariantsSection from "./ProductVariantsSection";
import ProductPackageAssortmentSection from "./ProductPackageAssortmentSection";
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

  const { can, isSuperAdmin } = useAdminAuth();
  const canPublish = isSuperAdmin || can("product.publish");
  const canSaveDraft = isSuperAdmin || can("product.save_draft");

  // Navigation back link context
  const isUnderAdminPath = pathname.startsWith("/admin");
  const backHref = isUnderAdminPath ? "/admin/products" : "/products";

  // Reference Data State
  const [brands, setBrands] = useState<Array<{ id: string; name: string; logo_url?: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  // Form State
  const [productId, setProductId] = useState(initialData?.productId || (initialData as any)?.product_id || "");
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
  const [videoUrl, setVideoUrl] = useState<string>(initialData?.videoUrl || (initialData as any)?.video_url || "");

  // Pricing
  const [wholesalePrice, setWholesalePrice] = useState(initialData?.wholesalePrice || 25.0);
  const [bulkThreshold, setBulkThreshold] = useState(initialData?.bulkThreshold || 100);
  const [bulkPrice, setBulkPrice] = useState(initialData?.bulkPrice || 20.0);
  const [fullStockPrice, setFullStockPrice] = useState<number | undefined>(
    initialData?.fullStockPrice ?? (initialData as any)?.full_stock_price ?? (isEdit ? undefined : 18.0)
  );
  const [msrpPrice, setMsrpPrice] = useState<number | undefined>(initialData?.msrpPrice);
  const [costPrice, setCostPrice] = useState<number | undefined>(
    (initialData as any)?.costPrice !== undefined ? Number((initialData as any).costPrice) :
    (initialData as any)?.cost_price !== undefined ? Number((initialData as any).cost_price) : undefined
  );
  const purchasePriceUpdated = isEdit
    ? ((initialData as any)?.purchasePriceUpdated ?? (costPrice !== undefined && costPrice > 0))
    : (costPrice !== undefined && costPrice > 0);

  // Promotion with Independent Scheduling
  const [isNew, setIsNew] = useState(Boolean(initialData?.isNew));
  const [newUntil, setNewUntil] = useState<string | null>(
    (initialData as any)?.newUntil || (initialData as any)?.new_until || null
  );
  const [isHot, setIsHot] = useState(Boolean(initialData?.isHot));
  const [hotUntil, setHotUntil] = useState<string | null>(
    (initialData as any)?.hotUntil || (initialData as any)?.hot_until || null
  );
  const [isFeatured, setIsFeatured] = useState(Boolean(initialData?.isFeatured));
  const [featuredUntil, setFeaturedUntil] = useState<string | null>(
    (initialData as any)?.featuredUntil || (initialData as any)?.featured_until || null
  );
  const [isPreorder, setIsPreorder] = useState(Boolean(initialData?.isPreorder || (initialData as any)?.is_preorder));
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string | null>(
    (initialData as any)?.estimatedDeliveryDate || (initialData as any)?.estimated_delivery_date || null
  );

  // Variants & Stock
  const [colors, setColors] = useState<string[]>(
    initialData?.colors && initialData.colors.length > 0 ? initialData.colors : ["Black", "White"]
  );
  const [sizes, setSizes] = useState<string[]>(
    initialData?.sizes && initialData.sizes.length > 0 ? initialData.sizes : ["S", "M", "L", "XL"]
  );
  const [stock, setStock] = useState(initialData?.stock ?? 500);
  const [warehouseId, setWarehouseId] = useState<string | number | undefined>(
    initialData?.warehouseId || (initialData as any)?.warehouse_id
  );
  const [customMoq, setCustomMoq] = useState<number>(() => {
    return initialData?.moq && initialData.moq > 0 ? initialData.moq : 50;
  });

  // Authoritative Universal Package Assortment
  const [packageAllocations, setPackageAllocations] = useState<PackageAllocation[]>(() => {
    const raw = initialData?.packageAllocations || (initialData as any)?.package_allocations;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((a: any) => ({
        id: a.id,
        package_name: a.package_name || "Universal Package",
        color: a.color || null,
        size: a.size || null,
        quantity: Number(a.quantity ?? 0),
        product_variant_id: a.product_variant_id ?? null,
      }));
    }
    return [];
  });

  // Minimum Order Quantity (MOQ) — Derived from Universal Package if configured, else user MOQ
  const packageTotalUnits = useMemo(() => {
    return packageAllocations.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);
  }, [packageAllocations]);

  const moq = packageTotalUnits > 0 ? packageTotalUnits : customMoq;

  // Single Shipping & Packaging Logistics Profile
  const [shippingProfiles, setShippingProfiles] = useState<ShippingPackageProfile[]>(() => {
    const raw = initialData?.shippingPackageProfiles || initialData?.shipping_package_profiles;
    if (Array.isArray(raw) && raw.length > 0) {
      const p = raw[0];
      return [
        {
          ...p,
          package_quantity: Number(p.package_quantity || initialData?.moq || 10),
          carton_count: Number(p.carton_count || 1),
          carton_length: Number(p.carton_length || 60),
          carton_width: Number(p.carton_width || 40),
          carton_height: Number(p.carton_height || 30),
          dimension_unit: (p.dimension_unit || "cm") as "cm" | "in" | "m",
          gross_weight: Number(p.gross_weight || 15),
          weight_unit: (p.weight_unit || "kg") as "kg" | "lbs",
          is_active: true,
        },
      ];
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

  // Handler for package allocation updates (keeps MOQ & Shipping in sync)
  const handlePackageAllocationsChange = (next: PackageAllocation[]) => {
    setPackageAllocations(next);
    const sum = next.reduce((acc, a) => acc + (Number(a.quantity) || 0), 0);
    if (sum > 0 && bulkThreshold <= sum) {
      setBulkThreshold(sum + 50);
    }
    setShippingProfiles((prev) => [
      {
        ...(prev[0] || {
          carton_count: 1,
          carton_length: 60,
          carton_width: 40,
          carton_height: 30,
          dimension_unit: "cm",
          gross_weight: 15,
          weight_unit: "kg",
          is_active: true,
        }),
        package_quantity: sum > 0 ? sum : 1,
      },
    ]);
  };

  // SEO
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || initialData?.name || "");
  const [seoDescription, setSeoDescription] = useState(
    initialData?.seoDescription || initialData?.shortDescription || ""
  );
  const [keywords, setKeywords] = useState<string[]>(initialData?.keywords || []);

  // Publish Status: For a new product, status defaults to "draft" until published. For edit mode, respects initialData
  const [status, setStatus] = useState<"published" | "draft">(
    initialData?.status === "published" ? "published" : "draft"
  );

  // Draft Key & Local Recovery State
  const draftKey = isEdit && initialData?.id ? String(initialData.id) : "new";
  const [draftRestored, setDraftRestored] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"published" | "draft" | null>(null);

  // Package Assortment Section — collapsed by default (optional feature)
  const [packageSectionOpen, setPackageSectionOpen] = useState(
    () => packageAllocations.length > 0
  );

  // Submission & Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Snapshot constructor for current form state
  const getCurrentDraftData = useCallback((): Partial<B2BProductInput> => {
    return {
      name,
      slug,
      brand,
      brand_id: brandId ? String(brandId) : undefined,
      brandLogo,
      categoryId,
      categoryName,
      audience,
      designType,
      material,
      description,
      seoTitle,
      seoDescription,
      keywords,
      images,
      videoUrl,
      wholesalePrice,
      bulkThreshold,
      bulkPrice,
      fullStockPrice,
      msrpPrice,
      costPrice,
      stock,
      warehouseId,
      moq,
      colors,
      sizes,
      packageAllocations,
      shippingPackageProfiles: shippingProfiles,
      isNew,
      newUntil,
      isHot,
      hotUntil,
      isFeatured,
      featuredUntil,
      isPreorder,
      estimatedDeliveryDate,
      status,
    };
  }, [
    name, slug, brand, brandId, brandLogo, categoryId, categoryName,
    audience, designType, material, description, seoTitle, seoDescription,
    keywords, images, videoUrl, wholesalePrice, bulkThreshold, bulkPrice,
    fullStockPrice, msrpPrice, costPrice, stock, colors, sizes, packageAllocations,
    shippingProfiles, isNew, newUntil, isHot, hotUntil, isFeatured,
    featuredUntil, isPreorder, estimatedDeliveryDate, status
  ]);

  // Restore unsaved draft on mount if available
  useEffect(() => {
    const saved = productDraftService.getDraft(draftKey);
    if (saved && saved.data) {
      const d = saved.data;
      if (d.name) setName(d.name);
      if (d.slug) {
        setSlug(d.slug);
        setSlugManuallyEdited(true);
      }
      if (d.brand) setBrand(d.brand);
      if (d.brand_id) setBrandId(d.brand_id);
      if (d.brandLogo) setBrandLogo(d.brandLogo);
      if (d.categoryId) setCategoryId(d.categoryId);
      if (d.categoryName) setCategoryName(d.categoryName);
      if (d.audience) setAudience(d.audience);
      if (d.designType) setDesignType(d.designType);
      if (d.material) setMaterial(d.material);
      if (d.description) setDescription(d.description);
      if (d.seoTitle) setSeoTitle(d.seoTitle);
      if (d.seoDescription) setSeoDescription(d.seoDescription);
      if (d.keywords) setKeywords(d.keywords);
      if (d.images && d.images.length > 0) setImages(d.images);
      if (d.videoUrl !== undefined) setVideoUrl(d.videoUrl);
      if (d.wholesalePrice !== undefined) setWholesalePrice(d.wholesalePrice);
      if (d.bulkThreshold !== undefined) setBulkThreshold(d.bulkThreshold);
      if (d.bulkPrice !== undefined) setBulkPrice(d.bulkPrice);
      if (d.fullStockPrice !== undefined) setFullStockPrice(d.fullStockPrice);
      if (d.msrpPrice !== undefined) setMsrpPrice(d.msrpPrice);
      if ((d as any).costPrice !== undefined) setCostPrice((d as any).costPrice);
      if (d.stock !== undefined) setStock(d.stock);
      if (d.warehouseId !== undefined) setWarehouseId(d.warehouseId);
      if (d.moq !== undefined && d.moq > 0) setCustomMoq(d.moq);
      if (d.colors && d.colors.length > 0) setColors(d.colors);
      if (d.sizes && d.sizes.length > 0) setSizes(d.sizes);
      if (d.packageAllocations && d.packageAllocations.length > 0) setPackageAllocations(d.packageAllocations);
      if (d.shippingPackageProfiles && d.shippingPackageProfiles.length > 0) setShippingProfiles(d.shippingPackageProfiles);
      if (d.isNew !== undefined) setIsNew(d.isNew);
      if (d.newUntil !== undefined) setNewUntil(d.newUntil);
      if (d.isHot !== undefined) setIsHot(d.isHot);
      if (d.hotUntil !== undefined) setHotUntil(d.hotUntil);
      if (d.isFeatured !== undefined) setIsFeatured(d.isFeatured);
      if (d.featuredUntil !== undefined) setFeaturedUntil(d.featuredUntil);
      if (d.isPreorder !== undefined) setIsPreorder(d.isPreorder);
      if (d.estimatedDeliveryDate !== undefined) setEstimatedDeliveryDate(d.estimatedDeliveryDate);
      if ((d.status === "draft" || d.status === "published") && initialData?.status !== "published") {
        setStatus(d.status);
      }
      setDraftRestored(true);
    }
  }, [draftKey, initialData?.status]);

  // Debounced auto-save of current draft
  useEffect(() => {
    const hasData =
      name.trim().length > 0 ||
      description.trim().length > 0 ||
      images.length > 0 ||
      packageAllocations.length > 0 ||
      wholesalePrice > 0 ||
      colors.length > 0;

    if (hasData) {
      const timer = setTimeout(() => {
        productDraftService.saveDraft(draftKey, getCurrentDraftData(), isEdit ? "edit" : "create");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [draftKey, getCurrentDraftData, name, wholesalePrice, packageAllocations, isEdit, description, images.length, colors.length]);

  // Immediate synchronous auto-save before page unload or visibility change
  useEffect(() => {
    const handleImmediateSave = () => {
      productDraftService.saveDraft(draftKey, getCurrentDraftData(), isEdit ? "edit" : "create");
    };

    window.addEventListener("beforeunload", handleImmediateSave);
    window.addEventListener("visibilitychange", handleImmediateSave);
    return () => {
      window.removeEventListener("beforeunload", handleImmediateSave);
      window.removeEventListener("visibilitychange", handleImmediateSave);
    };
  }, [draftKey, getCurrentDraftData, isEdit]);

  // Load Reference Data
  useEffect(() => {
    async function loadRefs() {
      const savedDraft = productDraftService.getDraft(draftKey);

      try {
        const bList = await getBrands({ all: true, isAdmin: true });
        setBrands(bList.map((b) => ({ id: b.id, name: b.name, logo_url: b.logo_url || b.logo })));
        const effectiveBrand = savedDraft?.data?.brand || brand;
        if (!effectiveBrand && bList.length > 0 && !isEdit) {
          setBrand(bList[0].name);
          setBrandId(bList[0].id);
          setBrandLogo(bList[0].logo_url || bList[0].logo);
        }
      } catch {
        // Fallback
      }

      try {
        const cList = await categoryService.getCategories({ all: true });
        setCategories(cList.map((c) => ({ id: String(c.id), name: c.name })));
        const effectiveCatId = savedDraft?.data?.categoryId || categoryId;
        if (!effectiveCatId && cList.length > 0 && !isEdit) {
          setCategoryId(String(cList[0].id));
          setCategoryName(cList[0].name);
        }
      } catch {
        // Fallback
      }
    }
    loadRefs();
  }, [brand, categoryId, draftKey, isEdit]);

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

  // Draft validation — requires Product ID and product name to save progress
  const validateDraft = (): boolean => {
    const errs: Record<string, string> = {};

    if (!productId.trim()) {
      errs.productId = "Product ID is required to save a draft.";
    } else if (!/^[A-Za-z0-9_\-]+$/.test(productId.trim())) {
      errs.productId = "Product ID may only contain letters, numbers, hyphens, and underscores.";
    }

    if (!name.trim()) errs.name = "Product name is required to save a draft.";
    else if (name.trim().length < 3) errs.name = "Product name must be at least 3 characters.";

    // Validate package allocations if the admin has added any
    if (packageAllocations.length > 0) {
      for (const a of packageAllocations) {
        if (!Number.isInteger(a.quantity) || a.quantity < 0) {
          errs.package_allocations = "Package allocation quantities must be non-negative whole integers.";
          break;
        }
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setGeneralError("Please review the highlighted fields before saving.");
      return false;
    }
    setGeneralError(null);
    return true;
  };

  // Publish validation — strict, enforces all required fields for a live product
  const validatePublish = (): boolean => {
    const errs: Record<string, string> = {};

    if (!productId.trim()) {
      errs.productId = "Product ID is required.";
    } else if (!/^[A-Za-z0-9_\-]+$/.test(productId.trim())) {
      errs.productId = "Product ID may only contain letters, numbers, hyphens, and underscores.";
    }

    if (!name.trim()) errs.name = "Product name is required.";
    else if (name.trim().length < 3) errs.name = "Product name must be at least 3 characters.";

    if (!slug.trim()) errs.slug = "Slug / URL key is required.";

    if (!brand.trim()) errs.brand = "Brand selection is required.";

    if (!categoryId) errs.category = "Category selection is required.";

    if (wholesalePrice <= 0) errs.wholesalePrice = "Wholesale price must be greater than $0.00.";

    if (packageAllocations.length > 0) {
      for (const a of packageAllocations) {
        if (!Number.isInteger(a.quantity) || a.quantity < 0) {
          errs.package_allocations = "Package allocation quantities must be non-negative whole integers.";
          break;
        }
      }
    }

    if (moq <= 0) errs.moq = "Minimum order quantity (MOQ) must be greater than 0.";

    if (bulkThreshold <= moq) {
      errs.bulkThreshold = `Bulk threshold (${bulkThreshold}) must be strictly greater than MOQ (${moq}).`;
    }

    if (bulkPrice <= 0) errs.bulkPrice = "Bulk tier price must be greater than $0.00.";

    if (fullStockPrice === undefined || fullStockPrice === null || fullStockPrice <= 0) {
      errs.fullStockPrice = "Full Stock Price is required and must be greater than $0.00.";
    }

    if (colors.length === 0) errs.colors = "Select at least one color.";

    if (sizes.length === 0) errs.sizes = "Select at least one size.";

    if (stock < 0) errs.stock = "Initial stock quantity cannot be negative.";

    if (!isEdit && !warehouseId) {
      errs.warehouse_id = "Please select a warehouse location for initial stock allocation.";
    }

    if (isPreorder && !estimatedDeliveryDate) {
      errs.estimatedDeliveryDate = "Estimated delivery date is required when publishing a Preorder product.";
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setGeneralError("Please review the highlighted fields before publishing.");
      return false;
    }
    setGeneralError(null);
    return true;
  };

  const handleSaveWithStatus = async (targetStatus: "published" | "draft") => {
    const isValid = targetStatus === "draft" ? validateDraft() : validatePublish();
    if (!isValid) return;

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
        productId: productId.trim(),
        product_id: productId.trim(),
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
        videoUrl: videoUrl.trim() || undefined,
        video_url: videoUrl.trim() || undefined,
        wholesalePrice: wholesalePrice,
        standardPrice: wholesalePrice,
        bulkThreshold: bulkThreshold,
        bulkPrice: bulkPrice,
        fullStockPrice: fullStockPrice,
        full_stock_price: fullStockPrice,
        msrpPrice: msrpPrice,
        costPrice: costPrice,
        moq: moq,
        stock: stock,
        initialStock: stock,
        initial_stock: stock,
        warehouseId: warehouseId,
        warehouse_id: warehouseId,
        status: targetStatus,
        isNew: isNew,
        newUntil: isNew ? newUntil : null,
        new_until: isNew ? newUntil : null,
        isHot: isHot,
        hotUntil: isHot ? hotUntil : null,
        hot_until: isHot ? hotUntil : null,
        isFeatured: isFeatured,
        featuredUntil: isFeatured ? featuredUntil : null,
        featured_until: isFeatured ? featuredUntil : null,
        isPreorder: isPreorder,
        is_preorder: isPreorder,
        estimatedDeliveryDate: isPreorder ? estimatedDeliveryDate : null,
        estimated_delivery_date: isPreorder ? estimatedDeliveryDate : null,
        colors: colors,
        sizes: sizes,
        variants: variants,
        pricingTiers: pricingTiers,
        packageAllocations: packageAllocations,
        package_allocations: packageAllocations,
        shippingPackageProfiles: shippingProfiles,
        shipping_package_profiles: shippingProfiles,
      };

      await onSubmit(payload);
      
      // On success: clear draft, update status, notify
      productDraftService.clearDraft(draftKey);
      setStatus(targetStatus);
      setSaveSuccess(true);
      setDraftRestored(false);

      if (!isEdit) {
        setTimeout(() => {
          router.push(backHref);
        }, 800);
      }
    } catch (err: unknown) {
      // 1. Authentication Failure (401)
      const is401 =
        (err instanceof ApiError && err.status === 401) ||
        (err instanceof Error && err.message.toLowerCase().includes("unauthenticated"));

      if (is401) {
        productDraftService.saveDraft(draftKey, getCurrentDraftData(), isEdit ? "edit" : "create");
        setPendingAction(targetStatus);
        setIsAuthModalOpen(true);
        setGeneralError("Authentication required: Your session has expired. All product draft data has been preserved. Please sign in to continue.");
        return;
      }

      // 2. Authorization Failure (403)
      const is403 =
        (err instanceof ApiError && err.status === 403) ||
        (err instanceof Error && (err.message.toLowerCase().includes("unauthorized") || err.message.toLowerCase().includes("forbidden")));

      if (is403) {
        setGeneralError("Permission Denied (403): You are signed in, but your account lacks administrator permission to publish products.");
        return;
      }

      // 3. Validation Failure (422)
      if (err instanceof ApiError && err.status === 422) {
        if (err.errors) {
          const mapped: Record<string, string> = {};
          Object.entries(err.errors).forEach(([k, msgs]) => {
            mapped[k] = Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
          });
          setErrors((prev) => ({ ...prev, ...mapped }));
        }
        setGeneralError(err.message || "Please check the highlighted product fields.");
        return;
      }

      // 4. General / Server Error
      setGeneralError(err instanceof Error ? err.message : "An error occurred while saving the product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthModalSuccess = async () => {
    setIsAuthModalOpen(false);
    setGeneralError(null);
    if (pendingAction) {
      await handleSaveWithStatus(pendingAction);
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
          {canSaveDraft && (
            <button
              type="button"
              onClick={() => handleSaveWithStatus("draft")}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border border-border text-foreground hover:bg-secondary transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Save size={13} />
              Save Draft
            </button>
          )}

          {canPublish && (
            <button
              type="button"
              onClick={() => handleSaveWithStatus("published")}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <span className="w-3.5 h-3.5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <Globe size={13} />
              )}
              <span>{isEdit ? "Save & Publish" : "Publish Product"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Draft Restored Banner */}
      {draftRestored && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Unsaved product draft restored from previous session. All entered configurations are ready to continue.</span>
          </div>
          <button
            type="button"
            onClick={() => {
              productDraftService.clearDraft(draftKey);
              setDraftRestored(false);
            }}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-amber-400/40 hover:bg-amber-500/20 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

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
            productId={productId}
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
            onProductIdChange={setProductId}
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

          {/* Section 1.5: Dedicated Inventory & MOQ Management */}
          <ProductInventorySection
            isEdit={isEdit}
            moq={moq}
            stock={stock}
            warehouseId={warehouseId}
            onMoqChange={setCustomMoq}
            onStockChange={setStock}
            onWarehouseChange={setWarehouseId}
            errors={errors}
            onHandStock={initialData?.onHandStock ?? (initialData as any)?.on_hand_stock}
            reservedStock={initialData?.reservedStock ?? (initialData as any)?.reserved_stock}
            availableStock={initialData?.availableStock ?? (initialData as any)?.available_stock ?? initialData?.stock}
            warehouseBreakdown={initialData?.warehouseBreakdown ?? (initialData as any)?.warehouse_breakdown}
            productId={initialData?.id}
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

          {/* Section 2.5: Optional Package Breakdown (collapsible) */}
          <div className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setPackageSectionOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
            >
              <div>
                <span className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Package Breakdown
                </span>
                <span className="ml-2 text-[11px] text-muted-foreground font-normal">
                  Optional — define color/size assortment per package
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                {packageAllocations.length > 0 && (
                  <span className="text-[11px] font-semibold text-primary tabular-nums">
                    {packageAllocations.length} variant{packageAllocations.length !== 1 ? "s" : ""} configured
                  </span>
                )}
                {packageSectionOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </div>
            </button>

            {packageSectionOpen && (
              <div className="border-t border-border/60">
                <ProductPackageAssortmentSection
                  colors={colors}
                  sizes={sizes}
                  allocations={packageAllocations}
                  moq={moq}
                  onAllocationsChange={handlePackageAllocationsChange}
                  errors={errors}
                />
              </div>
            )}
          </div>

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
            purchasePriceUpdated={purchasePriceUpdated}
            isNew={isNew}
            newUntil={newUntil}
            isHot={isHot}
            hotUntil={hotUntil}
            isFeatured={isFeatured}
            featuredUntil={featuredUntil}
            isPreorder={isPreorder}
            estimatedDeliveryDate={estimatedDeliveryDate}
            errors={errors}
            onWholesalePriceChange={setWholesalePrice}
            onMoqChange={() => {}}
            onBulkThresholdChange={setBulkThreshold}
            onBulkPriceChange={setBulkPrice}
            onIsPreorderChange={(val, date) => {
              setIsPreorder(val);
              setEstimatedDeliveryDate(val ? (date ?? null) : null);
              if (errors.estimatedDeliveryDate) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.estimatedDeliveryDate;
                  return next;
                });
              }
            }}
            onFullStockPriceChange={(val) => {
              setFullStockPrice(val);
              if (errors.fullStockPrice) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.fullStockPrice;
                  return next;
                });
              }
            }}
            onMsrpPriceChange={setMsrpPrice}
            onCostPriceChange={setCostPrice}
            onIsNewChange={(val, until) => {
              setIsNew(val);
              setNewUntil(val ? (until ?? null) : null);
            }}
            onIsHotChange={(val, until) => {
              setIsHot(val);
              setHotUntil(val ? (until ?? null) : null);
            }}
            onIsFeaturedChange={(val, until) => {
              setIsFeatured(val);
              setFeaturedUntil(val ? (until ?? null) : null);
            }}
          />

          {/* Section 6: Product Images & Media */}
          <ProductImagesSection
            images={images}
            videoUrl={videoUrl}
            onChange={setImages}
            onVideoUrlChange={setVideoUrl}
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

      {/* In-Place Admin Authentication Modal */}
      <AdminAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthModalSuccess}
        title="Sign In Required to Publish"
        message="Your administrator session has expired or requires sign in. All product data has been safely preserved and will publish immediately once authenticated."
      />
    </div>
  );
}
