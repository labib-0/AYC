"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Globe, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Check, Eye, EyeOff } from "lucide-react";
import { B2BProductInput, B2BProductVariant, SupplierModel } from "@/types/b2b";
import { ShippingPackageProfile, PackageAllocation } from "@/types";
import { getBrands } from "@/lib/services/brands";
import { categoryService } from "@/services/category.service";
import { generateProductSku, createProduct, updateProduct } from "@/lib/services/products";
import { productDraftService } from "@/lib/services/product-draft.service";
import AdminAuthModal from "@/components/admin/auth/AdminAuthModal";
import { ApiError } from "@/services/api-client";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import { normalizeImageUrl, isValidImageUrl } from "@/lib/media";
import { generateDeterministicProductSeo } from "@/lib/seo";

import ProductBasicInfoSection from "./ProductBasicInfoSection";
import ProductInventorySection from "./ProductInventorySection";
import ProductImagesSection from "./ProductImagesSection";
import ProductPricingSection from "./ProductPricingSection";
import ProductPackageBreakdownSection, { DEFAULT_PACKAGE_ASSORTMENT_MESSAGE } from "./ProductPackageBreakdownSection";
import ProductShippingSection from "./ProductShippingSection";
import ProductSeoSection from "./ProductSeoSection";

interface ProductFormProps {
  initialData?: Partial<B2BProductInput>;
  mode: "create" | "edit";
  resumeDraft?: boolean;
  onSubmit: (data: B2BProductInput) => Promise<B2BProductInput | null | void>;
}

export default function ProductForm({
  initialData,
  mode,
  resumeDraft = false,
  onSubmit,
}: ProductFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isEdit = mode === "edit";

  const { can, isSuperAdmin } = useAdminAuth();
  const canPublish = isSuperAdmin || can("product.publish");
  const canSaveDraft = isSuperAdmin || can("product.save_draft");
  const canCreateCategory = isSuperAdmin || can("category.create");

  // Navigation back link context
  const isUnderAdminPath = pathname.startsWith("/ayc") || pathname.startsWith("/admin");
  const backHref = isUnderAdminPath ? "/ayc/products" : "/products";

  // Reference Data State
  const [brands, setBrands] = useState<Array<{ id: string; name: string; logo_url?: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  // Form State
  const [productId, setProductId] = useState(initialData?.productId || (initialData as any)?.product_id || "");
  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(initialData?.slug));
  const [sku, setSku] = useState(initialData?.sku || "");
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(Boolean(initialData?.sku));
  const [isHiddenFromStorefront, setIsHiddenFromStorefront] = useState<boolean>(
    Boolean(initialData?.isHiddenFromStorefront || (initialData as any)?.is_hidden_from_storefront)
  );
  const [brand, setBrand] = useState(initialData?.brand || "");
  const [brandId, setBrandId] = useState<string | number | undefined>(initialData?.brand_id);
  const [brandLogo, setBrandLogo] = useState<string | undefined>(initialData?.brandLogo);
  const [supplierId, setSupplierId] = useState<string | number | undefined>(
    initialData?.supplierId || (initialData as any)?.supplier_id
  );
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierModel | null>(
    (initialData?.supplier as SupplierModel) || null
  );
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
  const [categoryName, setCategoryName] = useState(initialData?.categoryName || "");
  const [audience, setAudience] = useState<"MEN" | "WOMEN" | "BOYS" | "GIRLS" | "UNISEX" | "">(
    (initialData?.audience as any) || ""
  );
  const [designType, setDesignType] = useState<"ORIGINAL" | "MASTER COPY" | "">(() => {
    if (!initialData?.designType && !initialData?.productType) return "";
    const raw = (initialData?.designType || initialData?.productType || "").toUpperCase();
    return raw === "MASTER COPY" || raw === "REPLICA" || raw === "MC" ? "MASTER COPY" : "ORIGINAL";
  });
  const [material, setMaterial] = useState(initialData?.material || "");
  const [sizeDescription, setSizeDescription] = useState<string>(
    () => initialData?.sizeDescription || (initialData as any)?.size_description || ""
  );
  const [colourDescription, setColourDescription] = useState<string>(
    () => initialData?.colourDescription || (initialData as any)?.colour_description || ""
  );
  const [packageAssortmentVisible, setPackageAssortmentVisible] = useState<boolean>(() => {
    if (initialData?.packageAssortmentVisible !== undefined) return Boolean(initialData.packageAssortmentVisible);
    if ((initialData as any)?.package_assortment_visible !== undefined) return Boolean((initialData as any).package_assortment_visible);
    return true;
  });
  const [packageAssortmentMessage, setPackageAssortmentMessage] = useState<string>(() => {
    const raw = initialData?.packageAssortmentMessage ?? (initialData as any)?.package_assortment_message;
    return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : DEFAULT_PACKAGE_ASSORTMENT_MESSAGE;
  });
  const [description, setDescription] = useState(initialData?.description || "");

  // Media
  const [images, setImages] = useState<string[]>(() => {
    return (initialData?.images || [])
      .map((u) => normalizeImageUrl(u))
      .filter((u) => isValidImageUrl(u));
  });
  const [videoUrl, setVideoUrl] = useState<string>(initialData?.videoUrl || (initialData as any)?.video_url || "");

  // Pricing
  const [wholesalePrice, setWholesalePrice] = useState<number | undefined>(
    initialData?.wholesalePrice !== undefined ? Number(initialData.wholesalePrice) : undefined
  );
  const [bulkPricingEnabled, setBulkPricingEnabled] = useState<boolean>(() => {
    if (initialData?.bulkPricingEnabled !== undefined) return Boolean(initialData.bulkPricingEnabled);
    if ((initialData as any)?.bulk_pricing_enabled !== undefined) return Boolean((initialData as any).bulk_pricing_enabled);
    if (initialData?.bulkThreshold !== undefined && initialData?.bulkThreshold !== null && Number(initialData.bulkThreshold) > 0 &&
        initialData?.bulkPrice !== undefined && initialData?.bulkPrice !== null && Number(initialData.bulkPrice) > 0) {
      return true;
    }
    // Existing products without configured bulk pricing keep disabled (false)
    if (isEdit) return false;
    // New products have Bulk Pricing ENABLED by default (true)
    return true;
  });
  const [bulkThreshold, setBulkThreshold] = useState<number | undefined>(
    initialData?.bulkThreshold !== undefined ? Number(initialData.bulkThreshold) : undefined
  );
  const [bulkPrice, setBulkPrice] = useState<number | undefined>(
    initialData?.bulkPrice !== undefined ? Number(initialData.bulkPrice) : undefined
  );
  const [fullStockPrice, setFullStockPrice] = useState<number | undefined>(
    initialData?.fullStockPrice ?? (initialData as any)?.full_stock_price ?? undefined
  );
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
  const [isSoldOut, setIsSoldOut] = useState(Boolean(initialData?.isSoldOut || (initialData as any)?.is_sold_out));
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string | null>(
    (initialData as any)?.estimatedDeliveryDate || (initialData as any)?.estimated_delivery_date || null
  );

  // Variants & Stock
  const [colors, setColors] = useState<string[]>(
    initialData?.colors && Array.isArray(initialData.colors) ? initialData.colors : []
  );
  const [sizes, setSizes] = useState<string[]>(
    initialData?.sizes && Array.isArray(initialData.sizes) ? initialData.sizes : []
  );
  const [stock, setStock] = useState<number | undefined>(
    initialData?.stock !== undefined ? Number(initialData.stock) : undefined
  );
  const [onHandStockState, setOnHandStockState] = useState<number | undefined>(
    initialData?.onHandStock ?? (initialData as any)?.on_hand_stock
  );
  const [availableStockState, setAvailableStockState] = useState<number | undefined>(
    initialData?.availableStock ?? (initialData as any)?.available_stock ?? initialData?.stock
  );
  const [warehouseBreakdownState, setWarehouseBreakdownState] = useState<any[] | undefined>(
    initialData?.warehouseBreakdown ?? (initialData as any)?.warehouse_breakdown
  );
  const [warehouseId, setWarehouseId] = useState<string | number | undefined>(
    initialData?.warehouseId || (initialData as any)?.warehouse_id || ""
  );
  const [customMoq, setCustomMoq] = useState<number | undefined>(() => {
    return initialData?.moq && initialData.moq > 0 ? initialData.moq : undefined;
  });

  useEffect(() => {
    if (initialData) {
      if (initialData.stock !== undefined) setStock(Number(initialData.stock));
      setOnHandStockState(initialData.onHandStock ?? (initialData as any)?.on_hand_stock);
      setAvailableStockState(initialData.availableStock ?? (initialData as any)?.available_stock ?? initialData.stock);
      setWarehouseBreakdownState(initialData.warehouseBreakdown ?? (initialData as any)?.warehouse_breakdown);
    }
  }, [initialData]);

  // Authoritative Form Variants
  const currentVariants: B2BProductVariant[] = useMemo(() => {
    if (initialData?.variants && initialData.variants.length > 0) {
      return initialData.variants;
    }
    const vars: B2BProductVariant[] = [];
    const totalVars = colors.length * sizes.length;
    const effectiveStock = stock !== undefined ? stock : 0;
    const stockPerVar = totalVars > 0 ? Math.floor(effectiveStock / totalVars) : effectiveStock;
    colors.forEach((c) => {
      sizes.forEach((s) => {
        vars.push({
          title: `${c} / ${s}`,
          color: c,
          size: s,
          wholesalePrice: wholesalePrice || 0,
          stock: stockPerVar,
          isActive: true,
        });
      });
    });
    return vars;
  }, [initialData?.variants, colors, sizes, stock, wholesalePrice]);

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

  // Minimum Order Quantity (MOQ) — Derived from Package Assortment if configured, else custom MOQ
  const packageTotalUnits = useMemo(() => {
    return packageAllocations.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);
  }, [packageAllocations]);

  const moq = packageTotalUnits > 0 ? packageTotalUnits : (customMoq ?? 0);

  // Single Shipping & Packaging Logistics Profile
  const [shippingProfiles, setShippingProfiles] = useState<ShippingPackageProfile[]>(() => {
    const raw = initialData?.shippingPackageProfiles || initialData?.shipping_package_profiles;
    if (Array.isArray(raw) && raw.length > 0) {
      const p = raw[0];
      return [
        {
          ...p,
          package_quantity: Number(p.package_quantity || initialData?.moq || 0),
          carton_count: p.carton_count !== undefined ? Number(p.carton_count) : undefined,
          carton_length: p.carton_length !== undefined ? Number(p.carton_length) : undefined,
          carton_width: p.carton_width !== undefined ? Number(p.carton_width) : undefined,
          carton_height: p.carton_height !== undefined ? Number(p.carton_height) : undefined,
          dimension_unit: (p.dimension_unit || "cm") as "cm" | "in" | "m",
          gross_weight: p.gross_weight !== undefined ? Number(p.gross_weight) : undefined,
          weight_unit: (p.weight_unit || "kg") as "kg" | "lbs",
          is_active: true,
        },
      ];
    }
    return [
      {
        package_quantity: initialData?.moq || 0,
        carton_count: undefined,
        carton_length: isEdit ? undefined : 60,
        carton_width: isEdit ? undefined : 40,
        carton_height: isEdit ? undefined : 30,
        dimension_unit: "cm",
        gross_weight: undefined,
        weight_unit: "kg",
        is_active: true,
      },
    ];
  });

  // Handler for package allocation updates (keeps MOQ & Shipping in sync)
  const handlePackageAllocationsChange = (next: PackageAllocation[]) => {
    setPackageAllocations(next);
    const sum = next.reduce((acc, a) => acc + (Number(a.quantity) || 0), 0);
    if (sum > 0 && bulkPricingEnabled && bulkThreshold && bulkThreshold <= sum) {
      setBulkThreshold(sum + 50);
    }
    setShippingProfiles((prev) => [
      {
        ...(prev[0] || {
          carton_count: undefined,
          carton_length: isEdit ? undefined : 60,
          carton_width: isEdit ? undefined : 40,
          carton_height: isEdit ? undefined : 30,
          dimension_unit: "cm",
          gross_weight: undefined,
          weight_unit: "kg",
          is_active: true,
        }),
        package_quantity: sum > 0 ? sum : 0,
      },
    ]);
  };

  // SEO
  const [seoTitle, setSeoTitle] = useState(
    initialData?.seoTitle || (initialData as any)?.seo_title || ""
  );
  const [seoDescription, setSeoDescription] = useState(
    initialData?.seoDescription || (initialData as any)?.seo_description || ""
  );
  const [keywords, setKeywords] = useState<string[]>(() => {
    const raw = initialData?.keywords || (initialData as any)?.seo_keywords || (initialData as any)?.seoKeywords;
    if (Array.isArray(raw)) {
      return raw.map(String);
    }
    if (typeof raw === "string" && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        return raw.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return [];
  });
  const seoTitleManuallyEditedRef = useRef(Boolean(initialData?.seoTitle || (initialData as any)?.seo_title));
  const seoDescriptionManuallyEditedRef = useRef(Boolean(initialData?.seoDescription || (initialData as any)?.seo_description));
  const hasUserEditedKeywordsRef = useRef(Boolean(
    (initialData?.keywords && initialData.keywords.length > 0) ||
    ((initialData as any)?.seo_keywords && (initialData as any).seo_keywords.length > 0)
  ));
  const hasUserEditedDescriptionRef = useRef(false);

  // Synchronize all fields from initialData when in edit mode and admin hasn't overridden them
  useEffect(() => {
    if (isEdit && initialData) {
      const savedPid = initialData.productId || (initialData as any)?.product_id;
      if (savedPid) {
        setProductId((current: string) => current || savedPid);
      }
      if (initialData.name) {
        setName((current: string) => current || initialData.name || "");
      }
      if (initialData.slug) {
        setSlug((current: string) => current || initialData.slug || "");
      }
      if (initialData.sku) {
        setSku((current: string) => current || initialData.sku || "");
      }
      if (initialData.brand) {
        setBrand((current: string) => current || initialData.brand || "");
      }
      if (initialData.brand_id) {
        setBrandId((current) => current || initialData.brand_id);
      }
      if (initialData.brandLogo) {
        setBrandLogo((current) => current || initialData.brandLogo);
      }
      if (initialData.categoryId || (initialData as any)?.category_id) {
        setCategoryId((current: string) => current || String(initialData.categoryId || (initialData as any)?.category_id));
      }
      if (initialData.categoryName || (initialData as any)?.category_name) {
        setCategoryName((current: string) => current || String(initialData.categoryName || (initialData as any)?.category_name));
      }
      if (initialData.audience) {
        setAudience((current) => current || (initialData.audience as any));
      }
      if (initialData.designType || (initialData as any)?.design_type) {
        setDesignType((current) => current || (initialData.designType as any) || ((initialData as any)?.design_type as any));
      }
      if (initialData.material) {
        setMaterial((current: string) => current || initialData.material || "");
      }
      if (initialData.sizeDescription || (initialData as any)?.size_description) {
        setSizeDescription((current: string) => current || initialData.sizeDescription || (initialData as any)?.size_description || "");
      }
      if (initialData.colourDescription || (initialData as any)?.colour_description) {
        setColourDescription((current: string) => current || initialData.colourDescription || (initialData as any)?.colour_description || "");
      }
      if (!seoTitleManuallyEditedRef.current && (initialData.seoTitle || (initialData as any)?.seo_title)) {
        setSeoTitle(initialData.seoTitle || (initialData as any)?.seo_title || "");
      }
      if (!seoDescriptionManuallyEditedRef.current && (initialData.seoDescription || (initialData as any)?.seo_description)) {
        setSeoDescription(initialData.seoDescription || (initialData as any)?.seo_description || "");
      }
      if (!hasUserEditedKeywordsRef.current) {
        const raw = initialData.keywords || (initialData as any)?.seo_keywords || (initialData as any)?.seoKeywords;
        if (Array.isArray(raw) && raw.length > 0) {
          setKeywords(raw.map(String));
        }
      }
      if (!hasUserEditedDescriptionRef.current && initialData.description) {
        setDescription(initialData.description);
      }
      if (initialData.wholesalePrice !== undefined) {
        setWholesalePrice((current) => current !== undefined ? current : Number(initialData.wholesalePrice));
      }
      if (initialData.bulkPricingEnabled !== undefined || (initialData as any)?.bulk_pricing_enabled !== undefined) {
        setBulkPricingEnabled((current) => current !== undefined ? current : Boolean(initialData.bulkPricingEnabled ?? (initialData as any)?.bulk_pricing_enabled));
      }
      if (initialData.bulkThreshold !== undefined) {
        setBulkThreshold((current) => current !== undefined ? current : Number(initialData.bulkThreshold));
      }
      if (initialData.bulkPrice !== undefined) {
        setBulkPrice((current) => current !== undefined ? current : Number(initialData.bulkPrice));
      }
      if (initialData.fullStockPrice !== undefined || (initialData as any)?.full_stock_price !== undefined) {
        setFullStockPrice((current) => current !== undefined ? current : Number(initialData.fullStockPrice ?? (initialData as any)?.full_stock_price));
      }
      if (initialData.costPrice !== undefined || (initialData as any)?.cost_price !== undefined) {
        setCostPrice((current) => current !== undefined ? current : Number(initialData.costPrice ?? (initialData as any)?.cost_price));
      }
      const rawAllocs = initialData.packageAllocations || (initialData as any)?.package_allocations;
      if (Array.isArray(rawAllocs) && rawAllocs.length > 0) {
        setPackageAllocations((current) => current.length > 0 ? current : rawAllocs);
      }
      const rawProfiles = initialData.shippingPackageProfiles || (initialData as any)?.shipping_package_profiles;
      if (Array.isArray(rawProfiles) && rawProfiles.length > 0) {
        setShippingProfiles((current) => current.length > 0 ? current : rawProfiles);
      }
      if (initialData.supplierId !== undefined || (initialData as any)?.supplier_id !== undefined) {
        setSupplierId(initialData.supplierId ?? (initialData as any)?.supplier_id);
      }
      if (initialData.supplier !== undefined) {
        setSelectedSupplier((initialData.supplier as SupplierModel) || null);
      }
      if (initialData.images && Array.isArray(initialData.images)) {
        const clean = initialData.images.map((u) => normalizeImageUrl(u)).filter((u) => isValidImageUrl(u));
        if (clean.length > 0) {
          setImages(clean);
        }
      }
    }
  }, [initialData, isEdit]);

  // Deterministic SEO Auto-generation in Create mode (acts as initial default, never overwrites manual edits)
  const autoPopulateSeoDefaults = useCallback((
    overrideName?: string,
    overrideBrand?: string,
    overrideCatName?: string,
    overrideAudience?: string,
    overrideMaterial?: string
  ) => {
    if (isEdit) return;
    const currentName = overrideName !== undefined ? overrideName : name;
    if (!currentName || currentName.trim().length < 3) return;

    const currentBrand = overrideBrand !== undefined ? overrideBrand : brand;
    const currentCatName = overrideCatName !== undefined ? overrideCatName : (categoryName || categories.find((c) => String(c.id) === String(categoryId))?.name || "");
    const currentAudience = overrideAudience !== undefined ? overrideAudience : audience;
    const currentMaterial = overrideMaterial !== undefined ? overrideMaterial : material;

    const generated = generateDeterministicProductSeo({
      name: currentName,
      brand: currentBrand,
      categoryName: currentCatName,
      audience: currentAudience,
      designType,
      material: currentMaterial,
      colourDescription,
      sizeDescription,
    });

    if (!seoTitleManuallyEditedRef.current) {
      setSeoTitle(generated.seoTitle);
    }
    if (!seoDescriptionManuallyEditedRef.current) {
      setSeoDescription(generated.seoDescription);
    }
    if (!hasUserEditedKeywordsRef.current) {
      setKeywords(generated.keywords);
    }
  }, [isEdit, name, brand, categoryName, categories, categoryId, audience, designType, material, colourDescription, sizeDescription]);

  // Publish Status: For a new product, status defaults to "draft" until published. For edit mode, respects initialData
  const [status, setStatus] = useState<"published" | "draft">(
    initialData?.status === "published" ? "published" : "draft"
  );

  // Draft Key & Local Recovery State
  const draftKey = isEdit && initialData?.id ? String(initialData.id) : "new";
  const [draftRestored, setDraftRestored] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"published" | "draft" | null>(null);

  // Persisted Backend Draft ID (tracks draft ID to prevent duplicate product records)
  const [persistedDraftId, setPersistedDraftId] = useState<string | null>(
    isEdit && initialData?.id ? String(initialData.id) : null
  );
  const persistedDraftIdRef = useRef<string | null>(null);
  useEffect(() => {
    persistedDraftIdRef.current = persistedDraftId;
  }, [persistedDraftId]);

  // Autosave Status: "idle" | "saving" | "saved" | "unsaved" | "error"
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "unsaved" | "error">("idle");
  const autosaveStatusRef = useRef<"idle" | "saving" | "saved" | "unsaved" | "error">("idle");
  useEffect(() => {
    autosaveStatusRef.current = autosaveStatus;
  }, [autosaveStatus]);

  const [hasUserEdited, setHasUserEdited] = useState<boolean>(false);
  const hasUserEditedRef = useRef<boolean>(false);
  useEffect(() => {
    hasUserEditedRef.current = hasUserEdited;
  }, [hasUserEdited]);
  const isSavingRef = useRef<boolean>(false);
  const pendingSaveRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(false);
  const persistDraftRef = useRef<((opts?: { isAutosave?: boolean }) => Promise<boolean>) | null>(null);


  // Submission & Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showSuccessMessage = useCallback((msg: string) => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    setGeneralError(null);
    setSuccessMessage(msg);
    successTimerRef.current = setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  // Snapshot constructor for current form state
  const getCurrentDraftData = useCallback((): Partial<B2BProductInput> => {
    const rawPid = productId.trim() || (isEdit ? (initialData?.productId || (initialData as any)?.product_id || "") : "");
    const normalizedProductId = rawPid.replace(/\s+/g, "");
    return {
      productId: normalizedProductId,
      product_id: normalizedProductId,
      name,
      slug,
      sku: sku.trim(),
      isHiddenFromStorefront,
      is_hidden_from_storefront: isHiddenFromStorefront,
      brand,
      brand_id: brandId ? String(brandId) : undefined,
      brandLogo,
      categoryId,
      categoryName,
      audience: (audience || undefined) as any,
      designType: (designType || undefined) as any,
      material,
      sizeDescription: sizeDescription.trim() || undefined,
      size_description: sizeDescription.trim() || undefined,
      colourDescription: colourDescription.trim() || undefined,
      colour_description: colourDescription.trim() || undefined,
      packageAssortmentVisible: packageAssortmentVisible,
      package_assortment_visible: packageAssortmentVisible,
      packageAssortmentMessage: packageAssortmentMessage,
      package_assortment_message: packageAssortmentMessage,
      description,
      seoTitle,
      seo_title: seoTitle,
      seoDescription,
      seo_description: seoDescription,
      keywords,
      seo_keywords: keywords,
      images,
      videoUrl,
      supplierId: supplierId || undefined,
      supplier_id: supplierId ? Number(supplierId) : undefined,
      supplier: selectedSupplier,
      wholesalePrice,
      bulkPricingEnabled,
      bulk_pricing_enabled: bulkPricingEnabled,
      bulkThreshold: bulkPricingEnabled ? bulkThreshold : undefined,
      bulkPrice: bulkPricingEnabled ? bulkPrice : undefined,
      fullStockPrice,
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
      status: "draft",
    };
  }, [
    productId, name, slug, sku, isHiddenFromStorefront, brand, brandId, brandLogo, supplierId, selectedSupplier, categoryId, categoryName,
    audience, designType, material, sizeDescription, colourDescription,
    packageAssortmentVisible, packageAssortmentMessage, description, seoTitle, seoDescription,
    keywords, images, videoUrl, wholesalePrice, bulkPricingEnabled, bulkThreshold, bulkPrice,
    fullStockPrice, costPrice, stock, warehouseId, moq, colors, sizes,
    packageAllocations, shippingProfiles, isNew, newUntil, isHot, hotUntil,
    isFeatured, featuredUntil, isPreorder, estimatedDeliveryDate
  ]);

  // Persist draft to backend and local storage safely
  const persistDraftToBackendAndStorage = useCallback(async (opts?: { isAutosave?: boolean }): Promise<boolean> => {
    const data = getCurrentDraftData();
    // 1. Always safely preserve in local storage
    productDraftService.saveDraft(draftKey, data, isEdit ? "edit" : "create");

    // In Edit mode, do NOT perform destructive background autosaves to the backend.
    // Database products must remain authoritative until admin explicitly clicks Save / Publish.
    if (isEdit) {
      setAutosaveStatus("saved");
      return true;
    }

    // 2. Meaningful changes check
    const hasMeaningful = Boolean(
      (data.name && data.name.trim().length > 0) ||
      (data.productId && data.productId.trim().length > 0) ||
      (data.description && data.description.trim().length > 0) ||
      (data.images && data.images.length > 0) ||
      (data.packageAllocations && data.packageAllocations.length > 0) ||
      (data.wholesalePrice && data.wholesalePrice > 0)
    );

    if (!hasMeaningful) {
      setAutosaveStatus("idle");
      return false;
    }

    // 3. Backend persistence requires Product ID
    const rawPid = data.productId || (isEdit ? (initialData?.productId || (initialData as any)?.product_id || "") : "");
    const normalizedPid = (rawPid || "").replace(/\s+/g, "");
    if (!normalizedPid) {
      setAutosaveStatus("saved");
      return true;
    }

    // 4. Overlapping save guard
    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return true;
    }

    isSavingRef.current = true;
    setAutosaveStatus("saving");

    try {
      const activeBrand = brands.find((b) => b.name === brand || String(b.id) === String(brandId));
      const activeCat = categories.find((c) => String(c.id) === String(categoryId));
      const generatedSku =
        initialData?.sku ||
        generateProductSku(brand || "AY", activeCat?.name || "APP", name || "PROD");

      const draftPayload: B2BProductInput = {
        ...(data as B2BProductInput),
        id: persistedDraftIdRef.current || (initialData?.id ? String(initialData.id) : `draft_${Date.now()}`),
        productId: normalizedPid,
        product_id: normalizedPid,
        name: data.name?.trim() || "Untitled Draft",
        slug: data.slug?.trim() || `draft-${normalizedPid.toLowerCase()}-${Date.now().toString(36)}`,
        sku: sku.trim() || generatedSku,
        isHiddenFromStorefront: isHiddenFromStorefront,
        is_hidden_from_storefront: isHiddenFromStorefront,
        brand: data.brand || "General",
        categoryId: data.categoryId || (categories.length > 0 ? categories[0].id : "c_tops"),
        categoryName: activeCat?.name || categoryName || "Apparel",
        status: "draft", // Strictly forced to draft!
        wholesalePrice: wholesalePrice !== undefined ? wholesalePrice : undefined,
        standardPrice: wholesalePrice !== undefined ? wholesalePrice : undefined,
        fullStockPrice: fullStockPrice !== undefined ? fullStockPrice : undefined,
        moq: moq || 1,
        colors: colors,
        sizes: sizes,
        stock: (stock !== undefined && stock >= 0) ? stock : 0,
        warehouseId: warehouseId || undefined,
        images: images.length > 0 ? images : ["/placeholder.jpg"],
        packageAllocations: colors.length > 0 && sizes.length > 0 ? packageAllocations : [],
        shippingPackageProfiles: shippingProfiles,
        isPreorder: isPreorder,
        is_preorder: isPreorder,
        isSoldOut: isSoldOut,
        is_sold_out: isSoldOut,
        estimatedDeliveryDate: isPreorder ? estimatedDeliveryDate : null,
      };

      if (persistedDraftIdRef.current) {
        await updateProduct(persistedDraftIdRef.current, draftPayload);
      } else {
        const created = await createProduct(draftPayload);
        if (created?.id) {
          persistedDraftIdRef.current = String(created.id);
          setPersistedDraftId(String(created.id));
        }
      }

      setAutosaveStatus("saved");
      isSavingRef.current = false;

      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        void persistDraftRef.current?.(opts);
      }
      return true;
    } catch (err) {
      console.warn("Autosave draft notice:", err);
      setAutosaveStatus("error");
      isSavingRef.current = false;
      return false;
    }
  }, [
    getCurrentDraftData, draftKey, isEdit, brands, brand, brandId, categories, categoryId,
    categoryName, initialData, name, wholesalePrice, fullStockPrice,
    moq, colors, sizes, stock, warehouseId, images, packageAllocations, shippingProfiles,
    isPreorder, estimatedDeliveryDate
  ]);

  useEffect(() => {
    persistDraftRef.current = persistDraftToBackendAndStorage;
  }, [persistDraftToBackendAndStorage]);

  // Restore unsaved draft on mount (ONLY when resumeDraft is explicitly requested)
  useEffect(() => {
    if (!resumeDraft) return;

    const saved = productDraftService.getDraft(draftKey);
    if (saved && saved.data) {
      const d = saved.data;
      if (d.productId && d.productId.trim()) {
        setProductId(d.productId);
      } else if (isEdit && (initialData?.productId || (initialData as any)?.product_id)) {
        setProductId(initialData?.productId || (initialData as any)?.product_id || "");
      }
      if (d.name) setName(d.name);
      if (d.slug) {
        setSlug(d.slug);
        setSlugManuallyEdited(true);
      }
      if (d.sku) {
        setSku(d.sku);
        setSkuManuallyEdited(true);
      }
      if (d.isHiddenFromStorefront !== undefined || (d as any).is_hidden_from_storefront !== undefined) {
        setIsHiddenFromStorefront(Boolean(d.isHiddenFromStorefront || (d as any).is_hidden_from_storefront));
      }
      if (d.brand) setBrand(d.brand);
      if (d.brand_id) setBrandId(d.brand_id);
      if (d.brandLogo) setBrandLogo(d.brandLogo);
      if (d.categoryId) setCategoryId(d.categoryId);
      if (d.categoryName) setCategoryName(d.categoryName);
      if (d.audience) setAudience(d.audience);
      if (d.designType) setDesignType(d.designType);
      if (d.material) setMaterial(d.material);
      if (d.sizeDescription !== undefined || (d as any).size_description !== undefined) {
        setSizeDescription(d.sizeDescription || (d as any).size_description || "");
      }
      if (d.colourDescription !== undefined || (d as any).colour_description !== undefined) {
        setColourDescription(d.colourDescription || (d as any).colour_description || "");
      }
      if (d.packageAssortmentVisible !== undefined || (d as any).package_assortment_visible !== undefined) {
        setPackageAssortmentVisible(Boolean(d.packageAssortmentVisible ?? (d as any).package_assortment_visible));
      }
      if (d.packageAssortmentMessage !== undefined || (d as any).package_assortment_message !== undefined) {
        const raw = d.packageAssortmentMessage ?? (d as any).package_assortment_message;
        setPackageAssortmentMessage(typeof raw === "string" && raw.trim() !== "" ? raw.trim() : DEFAULT_PACKAGE_ASSORTMENT_MESSAGE);
      }
      if (d.description !== undefined) setDescription(d.description || "");
      if (d.seoTitle) setSeoTitle(d.seoTitle);
      if (d.seoDescription) setSeoDescription(d.seoDescription);
      const draftKeywords = Array.isArray(d.keywords) ? d.keywords : (Array.isArray((d as any).seo_keywords) ? (d as any).seo_keywords : null);
      if (draftKeywords && draftKeywords.length > 0) {
        setKeywords(draftKeywords.map(String));
      } else {
        const initRaw = initialData?.keywords || (initialData as any)?.seo_keywords || (initialData as any)?.seoKeywords;
        if (Array.isArray(initRaw) && initRaw.length > 0) {
          setKeywords(initRaw.map(String));
        }
      }
      if (d.images && Array.isArray(d.images)) {
        const clean = d.images
          .map((u: string) => normalizeImageUrl(u))
          .filter((u: string) => isValidImageUrl(u));
        if (clean.length > 0) setImages(clean);
      }
      if (d.videoUrl !== undefined) setVideoUrl(d.videoUrl);
      if (d.wholesalePrice !== undefined) setWholesalePrice(d.wholesalePrice);
      if (d.bulkPricingEnabled !== undefined) setBulkPricingEnabled(Boolean(d.bulkPricingEnabled));
      else if ((d as any).bulk_pricing_enabled !== undefined) setBulkPricingEnabled(Boolean((d as any).bulk_pricing_enabled));
      if (d.bulkThreshold !== undefined) setBulkThreshold(d.bulkThreshold ?? undefined);
      if (d.bulkPrice !== undefined) setBulkPrice(d.bulkPrice ?? undefined);
      if (d.fullStockPrice !== undefined) setFullStockPrice(d.fullStockPrice);
      if ((d as any).costPrice !== undefined) setCostPrice((d as any).costPrice);
      if (d.stock !== undefined) setStock(d.stock);
      if (d.warehouseId !== undefined) setWarehouseId(d.warehouseId);
      if (d.moq !== undefined && d.moq > 0) setCustomMoq(d.moq);
      if (d.colors && d.colors.length > 0) setColors(d.colors);
      if (d.sizes && d.sizes.length > 0) setSizes(d.sizes);
      if (d.packageAllocations && d.packageAllocations.length > 0) {
        setPackageAllocations(d.packageAllocations);
      }
      if (d.shippingPackageProfiles && d.shippingPackageProfiles.length > 0) setShippingProfiles(d.shippingPackageProfiles);
      if (d.isNew !== undefined) setIsNew(d.isNew);
      if (d.newUntil !== undefined) setNewUntil(d.newUntil);
      if (d.isHot !== undefined) setIsHot(d.isHot);
      if (d.hotUntil !== undefined) setHotUntil(d.hotUntil);
      if (d.isFeatured !== undefined) setIsFeatured(d.isFeatured);
      if (d.featuredUntil !== undefined) setFeaturedUntil(d.featuredUntil);
      if (d.isPreorder !== undefined) setIsPreorder(d.isPreorder);
      if (d.isSoldOut !== undefined) setIsSoldOut(d.isSoldOut);
      if (d.estimatedDeliveryDate !== undefined) setEstimatedDeliveryDate(d.estimatedDeliveryDate);
      if ((d.status === "draft" || d.status === "published") && initialData?.status !== "published") {
        setStatus(d.status);
      }
      setDraftRestored(true);
    }
  }, [draftKey, initialData?.status, isEdit, resumeDraft]);

  // Track when user starts editing form after initial mount
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    setHasUserEdited(true);
    setAutosaveStatus("unsaved");
    setSuccessMessage(null);
  }, [
    productId, name, slug, brand, brandId, categoryId, audience, designType,
    material, description, images, videoUrl, wholesalePrice, bulkPricingEnabled, bulkThreshold,
    bulkPrice, fullStockPrice, costPrice, stock, warehouseId, customMoq,
    colors, sizes, packageAllocations, shippingProfiles, isNew, isHot,
    isFeatured, isPreorder, isSoldOut, estimatedDeliveryDate
  ]);

  // Debounced auto-save of current draft
  useEffect(() => {
    if (!hasUserEdited) return;

    const timer = setTimeout(() => {
      persistDraftToBackendAndStorage({ isAutosave: true });
    }, 1500);
    return () => clearTimeout(timer);
  }, [
    persistDraftToBackendAndStorage, hasUserEdited,
    productId, name, slug, brand, categoryId, description, images, wholesalePrice,
    bulkPricingEnabled, bulkThreshold, bulkPrice, fullStockPrice, costPrice, stock, warehouseId, customMoq,
    colors, sizes, packageAllocations, shippingProfiles, isPreorder, isSoldOut, estimatedDeliveryDate
  ]);

  // Navigation Guard: auto-save draft before user leaves via link clicks
  useEffect(() => {
    const handleDocumentClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor || !anchor.href) return;

      try {
        const targetUrl = new URL(anchor.href, window.location.href);
        if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search) {
          return;
        }
      } catch {
        return;
      }

      if (autosaveStatusRef.current === "unsaved") {
        e.preventDefault();
        e.stopPropagation();

        await persistDraftToBackendAndStorage({ isAutosave: false });
        autosaveStatusRef.current = "saved";
        setHasUserEdited(false);
        window.location.href = anchor.href;
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [persistDraftToBackendAndStorage]);

  // Immediate synchronous auto-save before page unload or visibility change
  useEffect(() => {
    const handleImmediateSave = () => {
      if (!hasUserEditedRef.current && !isEdit) return;
      productDraftService.saveDraft(draftKey, getCurrentDraftData(), isEdit ? "edit" : "create");
    };

    window.addEventListener("beforeunload", handleImmediateSave);
    window.addEventListener("visibilitychange", handleImmediateSave);
    return () => {
      window.removeEventListener("beforeunload", handleImmediateSave);
      window.removeEventListener("visibilitychange", handleImmediateSave);
    };
  }, [draftKey, getCurrentDraftData, isEdit]);

  // Load Reference Data — do NOT auto-select brand or category
  useEffect(() => {
    async function loadRefs() {
      try {
        const bList = await getBrands({ all: true, isAdmin: true });
        setBrands(bList.map((b) => ({ id: b.id, name: b.name, logo_url: b.logo_url || b.logo })));
      } catch {
        // Fallback
      }

      try {
        const cList = await categoryService.getCategories({ all: true });
        setCategories(cList.map((c) => ({ id: String(c.id), name: c.name })));
      } catch {
        // Fallback
      }
    }
    loadRefs();
  }, []);

  // Auto-generate slug and SKU from name in Create mode (unless manually edited)
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
    if (!isEdit && !skuManuallyEdited) {
      const activeCat = categories.find((c) => String(c.id) === String(categoryId));
      setSku(generateProductSku(brand || "AY", activeCat?.name || "APP", val || "PROD"));
    }
    if (errors.name) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
  };

  const handleNameBlur = () => {
    if (!isEdit && name.trim().length >= 3) {
      autoPopulateSeoDefaults(name);
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

  const handleSkuChange = (val: string) => {
    setSkuManuallyEdited(true);
    setSku(val);
    if (errors.sku) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.sku;
        return next;
      });
    }
  };

  // Draft validation — permissive: requires Product ID and product name to save progress
  const validateDraft = (): boolean => {
    const errs: Record<string, string> = {};

    const normalizedPid = productId.replace(/\s+/g, "");
    if (!normalizedPid) {
      errs.productId = "Product ID is required to save a draft.";
    } else if (!/^[A-Za-z0-9\-\/]+$/.test(normalizedPid)) {
      errs.productId = "Product ID may only contain letters, numbers, hyphens (-), and slashes (/).";
    }

    // Package breakdown is strictly optional. Only validate if rows exist
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
      setGeneralError("Please review the highlighted fields before saving draft.");
      return false;
    }
    setGeneralError(null);
    return true;
  };

  // Publish validation — strict, enforces all required fields for a live product
  const validatePublish = (): boolean => {
    const errs: Record<string, string> = {};

    const rawPid = productId.trim() || (isEdit ? (initialData?.productId || (initialData as any)?.product_id || "") : "");
    const normalizedPid = rawPid.replace(/\s+/g, "");
    if (!normalizedPid) {
      errs.productId = "Product ID is required.";
    } else if (!/^[A-Za-z0-9\-\/]+$/.test(normalizedPid)) {
      errs.productId = "Product ID may only contain letters, numbers, hyphens (-), and slashes (/).";
    }

    if (!name.trim()) errs.name = "Product name is required.";
    else if (name.trim().length < 3) errs.name = "Product name must be at least 3 characters.";

    if (!slug.trim()) errs.slug = "Slug / URL key is required.";

    if (!brand.trim()) errs.brand = "Brand selection is required.";

    if (!categoryId) errs.category = "Category selection is required.";

    if (!audience) errs.audience = "Audience selection is required.";

    if (!designType) errs.designType = "Design Type selection is required.";

    if (wholesalePrice === undefined || wholesalePrice <= 0) {
      errs.wholesalePrice = "Standard unit price must be greater than $0.00.";
      errs.standardPrice = "Standard unit price must be greater than $0.00.";
    }

    // Package breakdown is optional for publishing unless configured
    if (packageAllocations.length > 0) {
      for (const a of packageAllocations) {
        if (!Number.isInteger(a.quantity) || a.quantity < 0) {
          errs.package_allocations = "Package allocation quantities must be non-negative whole integers.";
          break;
        }
      }
    }

    if (moq <= 0) errs.moq = "Minimum order quantity (MOQ) must be greater than 0.";

    if (bulkPricingEnabled) {
      if (bulkThreshold === undefined || bulkThreshold <= moq) {
        errs.bulkThreshold = `Bulk threshold (${bulkThreshold || 0}) must be strictly greater than MOQ (${moq}).`;
      }

      if (bulkPrice === undefined || bulkPrice <= 0) {
        errs.bulkPrice = "Bulk tier price must be greater than $0.00.";
      }
    }

    if (fullStockPrice === undefined || fullStockPrice === null || fullStockPrice <= 0) {
      errs.fullStockPrice = "Full Stock Price is required and must be greater than $0.00.";
    }

    if (stock === undefined || stock < 0) {
      errs.stock = "Initial stock quantity is required and cannot be negative.";
    }

    if (!isEdit && !warehouseId) {
      errs.warehouse_id = "Please select a warehouse location for initial stock allocation.";
    }

    if (isPreorder && !estimatedDeliveryDate) {
      errs.estimatedDeliveryDate = "Estimated delivery date is required when publishing a Preorder product.";
    }

    if (isPreorder && isSoldOut) {
      errs.is_sold_out = "A product cannot be marked as both Pre-Order and Sold Out. Please choose either Pre-Order or Sold Out.";
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

      let finalSeoTitle = seoTitle.trim();
      let finalSeoDescription = seoDescription.trim();
      let finalKeywords = keywords;

      if (!isEdit && name.trim().length >= 3) {
        const generated = generateDeterministicProductSeo({
          name: name.trim(),
          brand: brand.trim(),
          categoryName: activeCat?.name || categoryName,
          audience,
          designType,
          material,
          colourDescription,
          sizeDescription,
        });

        if (!finalSeoTitle && !seoTitleManuallyEditedRef.current) {
          finalSeoTitle = generated.seoTitle;
        }
        if (!finalSeoDescription && !seoDescriptionManuallyEditedRef.current) {
          finalSeoDescription = generated.seoDescription;
        }
        if ((!finalKeywords || finalKeywords.length === 0) && !hasUserEditedKeywordsRef.current) {
          finalKeywords = generated.keywords;
        }
      }

      // Generate variant combinations (no variant SKU)
      const variants: B2BProductVariant[] = currentVariants;

      // Pricing Tiers: only construct tiers if wholesale price is set and greater than 0
      const pricingTiers = (wholesalePrice !== undefined && wholesalePrice > 0)
        ? (bulkPricingEnabled && bulkThreshold && bulkPrice ? [
            {
              min_quantity: moq || 1,
              max_quantity: bulkThreshold - 1,
              unit_price: wholesalePrice,
            },
            {
              min_quantity: bulkThreshold,
              max_quantity: null,
              unit_price: bulkPrice,
            },
          ] : [
            {
              min_quantity: moq || 1,
              max_quantity: null,
              unit_price: wholesalePrice,
            },
          ])
        : [];

      const rawPid = productId.trim() || (isEdit ? (initialData?.productId || (initialData as any)?.product_id || "") : "");
      const normalizedPid = rawPid.replace(/\s+/g, "");
      const isDraftTarget = targetStatus === "draft";
      const payload: B2BProductInput = {
        id: persistedDraftIdRef.current || initialData?.id || `prod_${Date.now()}`,
        productId: normalizedPid,
        product_id: normalizedPid,
        name: name.trim() || (isEdit ? (initialData?.name || "") : (isDraftTarget ? "" : (undefined as any))),
        slug: slug.trim() || (isEdit ? (initialData?.slug || undefined) : (undefined as any)),
        sku: sku.trim() || (isEdit ? (initialData?.sku || undefined) : (name.trim() ? generatedSku : (undefined as any))),
        isHiddenFromStorefront: isHiddenFromStorefront,
        is_hidden_from_storefront: isHiddenFromStorefront,
        supplierId: supplierId || undefined,
        supplier_id: supplierId ? Number(supplierId) : null,
        supplier: selectedSupplier,
        brand: brand.trim() || (isEdit ? (initialData?.brand || undefined) : (undefined as any)),
        brandLogo: activeBrand?.logo_url || brandLogo || (isEdit ? (initialData?.brandLogo || undefined) : undefined),
        brand_id: activeBrand?.id ? String(activeBrand.id) : (brandId ? String(brandId) : (isEdit ? (initialData?.brand_id ? String(initialData.brand_id) : undefined) : undefined)),
        categoryId: categoryId || (isEdit ? (initialData?.categoryId || (initialData as any)?.category_id || undefined) : undefined),
        categoryName: activeCat?.name || categoryName || (isEdit ? (initialData?.categoryName || (initialData as any)?.category_name || undefined) : (isDraftTarget ? undefined : "Apparel")),
        audience: (audience || (isEdit ? (initialData?.audience || undefined) : (isDraftTarget ? undefined : "UNISEX"))) as any,
        designType: (designType || (isEdit ? (initialData?.designType || undefined) : undefined)) as any,
        productType: designType || (isEdit ? (initialData?.productType || undefined) : undefined),
        description: description.trim() || (isEdit ? (initialData?.description || undefined) : undefined),
        shortDescription: finalSeoDescription || (description ? description.slice(0, 160).trim() : (isEdit ? (initialData?.shortDescription || undefined) : undefined)),
        seoTitle: finalSeoTitle || (isEdit ? (initialData?.seoTitle || (initialData as any)?.seo_title || undefined) : undefined),
        seo_title: finalSeoTitle || (isEdit ? (initialData?.seoTitle || (initialData as any)?.seo_title || undefined) : undefined),
        seoDescription: finalSeoDescription || (isEdit ? (initialData?.seoDescription || (initialData as any)?.seo_description || undefined) : undefined),
        seo_description: finalSeoDescription || (isEdit ? (initialData?.seoDescription || (initialData as any)?.seo_description || undefined) : undefined),
        keywords: finalKeywords && finalKeywords.length > 0 ? finalKeywords : (isEdit ? (initialData?.keywords || (initialData as any)?.seo_keywords || undefined) : undefined),
        seo_keywords: finalKeywords && finalKeywords.length > 0 ? finalKeywords : (isEdit ? (initialData?.keywords || (initialData as any)?.seo_keywords || undefined) : undefined),
        material: material.trim() || (isEdit ? (initialData?.material || undefined) : undefined),
        sizeDescription: sizeDescription.trim() || (isEdit ? (initialData?.sizeDescription || (initialData as any)?.size_description || undefined) : undefined),
        size_description: sizeDescription.trim() || (isEdit ? (initialData?.sizeDescription || (initialData as any)?.size_description || undefined) : undefined),
        colourDescription: colourDescription.trim() || (isEdit ? (initialData?.colourDescription || (initialData as any)?.colour_description || undefined) : undefined),
        colour_description: colourDescription.trim() || (isEdit ? (initialData?.colourDescription || (initialData as any)?.colour_description || undefined) : undefined),
        packageAssortmentVisible: packageAssortmentVisible !== undefined ? packageAssortmentVisible : (isEdit ? (initialData?.packageAssortmentVisible ?? (initialData as any)?.package_assortment_visible ?? true) : true),
        package_assortment_visible: packageAssortmentVisible !== undefined ? packageAssortmentVisible : (isEdit ? (initialData?.packageAssortmentVisible ?? (initialData as any)?.package_assortment_visible ?? true) : true),
        packageAssortmentMessage: (() => {
          const trimmed = packageAssortmentMessage.trim();
          if (trimmed) return trimmed;
          const initialTrimmed = (initialData?.packageAssortmentMessage ?? (initialData as any)?.package_assortment_message)?.trim();
          return initialTrimmed || DEFAULT_PACKAGE_ASSORTMENT_MESSAGE;
        })(),
        package_assortment_message: (() => {
          const trimmed = packageAssortmentMessage.trim();
          if (trimmed) return trimmed;
          const initialTrimmed = (initialData?.packageAssortmentMessage ?? (initialData as any)?.package_assortment_message)?.trim();
          return initialTrimmed || DEFAULT_PACKAGE_ASSORTMENT_MESSAGE;
        })(),
        images: (() => {
          const clean = images.map((u) => normalizeImageUrl(u)).filter((u) => isValidImageUrl(u));
          if (clean.length > 0) return clean;
          if (isEdit && initialData?.images && initialData.images.length > 0) return initialData.images;
          return isDraftTarget ? [] : ["/placeholder.jpg"];
        })(),
        videoUrl: videoUrl.trim() || (isEdit ? (initialData?.videoUrl || (initialData as any)?.video_url || undefined) : undefined),
        video_url: videoUrl.trim() || (isEdit ? (initialData?.videoUrl || (initialData as any)?.video_url || undefined) : undefined),
        wholesalePrice: wholesalePrice !== undefined ? wholesalePrice : (isEdit ? (initialData?.wholesalePrice ?? initialData?.standardPrice ?? undefined) : undefined),
        standardPrice: wholesalePrice !== undefined ? wholesalePrice : (isEdit ? (initialData?.standardPrice ?? initialData?.wholesalePrice ?? undefined) : undefined),
        wholesale_price: wholesalePrice !== undefined ? wholesalePrice : (isEdit ? (initialData?.wholesalePrice ?? initialData?.standardPrice ?? undefined) : undefined),
        standard_price: wholesalePrice !== undefined ? wholesalePrice : (isEdit ? (initialData?.standardPrice ?? initialData?.wholesalePrice ?? undefined) : undefined),
        bulkPricingEnabled: bulkPricingEnabled,
        bulk_pricing_enabled: bulkPricingEnabled,
        bulkThreshold: bulkPricingEnabled && bulkThreshold ? bulkThreshold : (isEdit && !bulkPricingEnabled ? undefined : (isEdit ? initialData?.bulkThreshold : undefined)),
        bulkPrice: bulkPricingEnabled && bulkPrice ? bulkPrice : (isEdit && !bulkPricingEnabled ? undefined : (isEdit ? initialData?.bulkPrice : undefined)),
        bulk_threshold: bulkPricingEnabled && bulkThreshold ? bulkThreshold : null,
        bulk_price: bulkPricingEnabled && bulkPrice ? bulkPrice : null,
        bulk_minimum_quantity: bulkPricingEnabled && bulkThreshold ? bulkThreshold : null,
        bulk_unit_price: bulkPricingEnabled && bulkPrice ? bulkPrice : null,
        fullStockPrice: fullStockPrice !== undefined ? fullStockPrice : (isEdit ? (initialData?.fullStockPrice ?? undefined) : undefined),
        full_stock_price: fullStockPrice !== undefined ? fullStockPrice : (isEdit ? (initialData?.fullStockPrice ?? undefined) : undefined),
        costPrice: costPrice !== undefined ? costPrice : (isEdit ? ((initialData as any)?.costPrice ?? (initialData as any)?.cost_price ?? undefined) : undefined),
        moq: (moq && moq >= 1) ? moq : (isDraftTarget ? (undefined as any) : 1),
        stock: isEdit ? (availableStockState ?? stock ?? initialData?.stock ?? 0) : (stock !== undefined ? stock : (isDraftTarget ? (undefined as any) : 0)),
        initialStock: !isEdit ? (stock !== undefined ? stock : (isDraftTarget ? (undefined as any) : 0)) : undefined,
        initial_stock: !isEdit ? (stock !== undefined ? stock : (isDraftTarget ? (undefined as any) : 0)) : undefined,
        warehouseId: !isEdit ? (warehouseId || undefined) : undefined,
        warehouse_id: !isEdit ? (warehouseId || undefined) : undefined,
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
        isSoldOut: isSoldOut,
        is_sold_out: isSoldOut,
        estimatedDeliveryDate: isPreorder ? estimatedDeliveryDate : null,
        estimated_delivery_date: isPreorder ? estimatedDeliveryDate : null,
        colors: colors.length > 0 ? colors : (isEdit && initialData?.colors ? initialData.colors : []),
        sizes: sizes.length > 0 ? sizes : (isEdit && initialData?.sizes ? initialData.sizes : []),
        variants: variants.length > 0 ? variants : (isEdit && initialData?.variants ? initialData.variants : []),
        pricingTiers: pricingTiers.length > 0 ? pricingTiers : (isEdit && initialData?.pricingTiers ? initialData.pricingTiers : []),
        packageAllocations: packageAllocations.length > 0
          ? packageAllocations
          : (isEdit && (initialData?.packageAllocations || (initialData as any)?.package_allocations)
              ? (initialData?.packageAllocations || (initialData as any)?.package_allocations)
              : []),
        package_allocations: packageAllocations.length > 0
          ? packageAllocations
          : (isEdit && (initialData?.packageAllocations || (initialData as any)?.package_allocations)
              ? (initialData?.packageAllocations || (initialData as any)?.package_allocations)
              : []),
        shippingPackageProfiles: (() => {
          const valid = shippingProfiles.filter((p) => p && Number(p.gross_weight) > 0 && Number(p.package_quantity) > 0);
          if (valid.length > 0) return valid;
          if (isEdit && (initialData?.shippingPackageProfiles || (initialData as any)?.shipping_package_profiles)) {
            return initialData?.shippingPackageProfiles || (initialData as any)?.shipping_package_profiles;
          }
          return [];
        })(),
        shipping_package_profiles: (() => {
          const valid = shippingProfiles.filter((p) => p && Number(p.gross_weight) > 0 && Number(p.package_quantity) > 0);
          if (valid.length > 0) return valid;
          if (isEdit && (initialData?.shippingPackageProfiles || (initialData as any)?.shipping_package_profiles)) {
            return initialData?.shippingPackageProfiles || (initialData as any)?.shipping_package_profiles;
          }
          return [];
        })(),
      };

      const priorStatus = status || initialData?.status;
      const isExisting = isEdit || Boolean(persistedDraftIdRef.current) || Boolean(initialData?.id);
      const wasDraft = priorStatus === "draft";

      let contextualMsg = "Product updated successfully.";
      if (!isExisting) {
        if (targetStatus === "draft") {
          contextualMsg = "Product draft saved successfully.";
        } else {
          contextualMsg = "Product published successfully.";
        }
      } else if (wasDraft) {
        if (targetStatus === "draft") {
          contextualMsg = "Draft updated successfully.";
        } else {
          contextualMsg = "Product published successfully.";
        }
      } else {
        if (targetStatus === "published") {
          contextualMsg = "Product updated successfully.";
        } else {
          contextualMsg = "Product draft saved successfully.";
        }
      }

      const res = await onSubmit(payload);
      if (!res) {
        throw new Error("Product save failed: No response from server.");
      }

      if ((res as any).id) {
        persistedDraftIdRef.current = String((res as any).id);
        setPersistedDraftId(String((res as any).id));
      }

      // Rehydrate local images and supplier from server response
      if (res.images && Array.isArray(res.images)) {
        const clean = res.images.map((u) => normalizeImageUrl(u)).filter((u) => isValidImageUrl(u));
        if (clean.length > 0) {
          setImages(clean);
        }
      }
      if ((res as any).supplier_id !== undefined) {
        setSupplierId((res as any).supplier_id);
      }
      if ((res as any).supplier !== undefined) {
        setSelectedSupplier((res as any).supplier);
      }
      
      // On success: clear draft, update status, notify
      productDraftService.clearDraft(draftKey);
      setStatus(targetStatus);
      showSuccessMessage(contextualMsg);
      setDraftRestored(false);
      setHasUserEdited(false);
      hasUserEditedRef.current = false;
      setAutosaveStatus("saved");

      if (!isEdit && targetStatus === "published") {
        setTimeout(() => {
          router.push(backHref);
        }, 1200);
      }
    } catch (err: unknown) {
      setSuccessMessage(null);
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
    setSuccessMessage(null);
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

        {/* Action Buttons & Autosave Status */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {hasUserEdited && (
            <div
              id="autosave-status-indicator"
              className="flex items-center gap-1.5 text-xs font-medium"
              aria-live="polite"
            >
              {autosaveStatus === "saving" && (
                <span className="flex items-center gap-1.5 text-muted-foreground animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                  Saving...
                </span>
              )}
              {autosaveStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Check size={13} className="shrink-0 stroke-[2.5]" />
                  Saved
                </span>
              )}
              {autosaveStatus === "unsaved" && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Unsaved changes
                </span>
              )}
              {autosaveStatus === "error" && (
                <button
                  type="button"
                  id="autosave-retry-btn"
                  onClick={() => persistDraftToBackendAndStorage({ isAutosave: true })}
                  className="flex items-center gap-1.5 text-red-500 hover:text-red-600 underline font-semibold cursor-pointer"
                  title="Autosave failed. Click to retry."
                >
                  <AlertCircle size={13} className="shrink-0" />
                  Save failed (retry)
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            id="toggle-product-catalog-visibility-btn"
            onClick={() => setIsHiddenFromStorefront(!isHiddenFromStorefront)}
            className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isHiddenFromStorefront
                ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                : "border-border text-foreground hover:bg-secondary"
            }`}
            title={
              isHiddenFromStorefront
                ? "Product is hidden from customer storefront search and catalog. Click to make visible."
                : "Product is visible on storefront catalog when published. Click to hide product."
            }
          >
            {isHiddenFromStorefront ? (
              <>
                <EyeOff size={13} className="shrink-0 text-amber-700 dark:text-amber-400" />
                <span>PRODUCT HIDDEN FROM CATALOG</span>
              </>
            ) : (
              <>
                <Eye size={13} className="shrink-0 text-muted-foreground" />
                <span>PRODUCT VISIBLE IN CATALOG</span>
              </>
            )}
          </button>

          {canSaveDraft && (
            <button
              type="button"
              id="save-draft-btn"
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
              id="publish-product-btn"
              onClick={() => handleSaveWithStatus("published")}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <span className="w-3.5 h-3.5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <Globe size={13} />
              )}
              <span>{isEdit ? (status === "published" ? "Save Changes" : "Publish Product") : "Publish Product"}</span>
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

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-emerald-400/40 hover:bg-emerald-500/20 transition-colors cursor-pointer"
          >
            Dismiss
          </button>
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
            sku={sku}
            brand={brand}
            brandId={brandId}
            categoryId={categoryId}
            categoryName={categoryName}
            supplierId={supplierId}
            selectedSupplier={selectedSupplier}
            onSupplierChange={(sId, sup) => {
              setSupplierId(sId ?? undefined);
              setSelectedSupplier(sup);
            }}
            audience={audience}
            designType={designType}
            material={material}
            sizeDescription={sizeDescription}
            colourDescription={colourDescription}
            description={description}
            brands={brands}
            categories={categories}
            isEdit={isEdit}
            errors={errors}
            canCreateCategory={canCreateCategory}
            onProductIdChange={setProductId}
            onNameChange={handleNameChange}
            onNameBlur={handleNameBlur}
            onSlugChange={handleSlugChange}
            onSkuChange={handleSkuChange}
            onBrandChange={(bName, bId, bLogo) => {
              setBrand(bName);
              setBrandId(bId);
              setBrandLogo(bLogo);
              if (errors.brand) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.brand;
                  return next;
                });
              }
              if (!isEdit && !skuManuallyEdited && name) {
                const activeCat = categories.find((c) => String(c.id) === String(categoryId));
                setSku(generateProductSku(bName || "AY", activeCat?.name || "APP", name || "PROD"));
              }
              if (!isEdit) {
                autoPopulateSeoDefaults(name, bName);
              }
            }}
            onCategoryChange={(cId, cName) => {
              setCategoryId(cId);
              if (cName) setCategoryName(cName);
              if (errors.category) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.category;
                  return next;
                });
              }
              if (!isEdit && !skuManuallyEdited && name) {
                setSku(generateProductSku(brand || "AY", cName || "APP", name || "PROD"));
              }
              if (!isEdit) {
                autoPopulateSeoDefaults(name, brand, cName);
              }
            }}
            onAudienceChange={(val) => {
              setAudience(val);
              if (!isEdit) {
                autoPopulateSeoDefaults(name, brand, categoryName, val);
              }
            }}
            onDesignTypeChange={(val) => {
              setDesignType(val);
            }}
            onMaterialChange={(val) => {
              setMaterial(val);
              if (!isEdit) {
                autoPopulateSeoDefaults(name, brand, categoryName, audience, val);
              }
            }}
            onSizeDescriptionChange={setSizeDescription}
            onColourDescriptionChange={setColourDescription}
            onDescriptionChange={(val) => {
              hasUserEditedDescriptionRef.current = true;
              setDescription(val);
            }}
            onBrandCreated={(newB) => {
              setBrands((prev) => [...prev, { id: String(newB.id), name: newB.name, logo_url: newB.logo_url || newB.logo }]);
            }}
            onCategoryCreated={(newCat) => {
              setCategories((prev) => {
                if (prev.some((c) => String(c.id) === String(newCat.id))) return prev;
                return [...prev, { id: String(newCat.id), name: newCat.name }];
              });
              if (!isEdit) {
                setCategoryId(String(newCat.id));
                setCategoryName(newCat.name);
                if (errors.category) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.category;
                    return next;
                  });
                }
                if (!skuManuallyEdited && name) {
                  setSku(generateProductSku(brand || "AY", newCat.name || "APP", name || "PROD"));
                }
                autoPopulateSeoDefaults(name, brand, newCat.name);
              }
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
            onHandStock={onHandStockState}
            availableStock={availableStockState}
            warehouseBreakdown={warehouseBreakdownState}
            productId={initialData?.id}
            productName={name}
            productSku={sku}
            variants={currentVariants}
            onStockAdjusted={(newStock) => {
              setStock(newStock.stock);
              setOnHandStockState(newStock.onHandStock);
              setAvailableStockState(newStock.availableStock);
              setWarehouseBreakdownState(newStock.warehouseBreakdown);
              setSuccessMessage(`Inventory adjusted successfully. Authoritative stock: ${newStock.availableStock.toLocaleString()} PCS.`);
            }}
          />

          {/* Section 2: Package Assortment */}
          <ProductPackageBreakdownSection
            packageAssortmentVisible={packageAssortmentVisible}
            onPackageAssortmentVisibleChange={setPackageAssortmentVisible}
            packageAssortmentMessage={packageAssortmentMessage}
            onPackageAssortmentMessageChange={setPackageAssortmentMessage}
            colors={colors}
            sizes={sizes}
            allocations={packageAllocations}
            stock={stock !== undefined ? stock : 0}
            errors={errors}
            onColorsChange={setColors}
            onSizesChange={setSizes}
            onAllocationsChange={handlePackageAllocationsChange}
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
          {/* Section 5: Pricing & Volume Tiers */}
          <ProductPricingSection
            wholesalePrice={wholesalePrice}
            standardPrice={wholesalePrice}
            moq={moq}
            isMoqDerived={packageTotalUnits > 0}
            availableStock={
              availableStockState ??
              initialData?.availableStock ??
              (initialData as any)?.available_stock ??
              (stock !== undefined && stock > 0 ? stock : undefined)
            }
            bulkPricingEnabled={bulkPricingEnabled}
            onBulkPricingEnabledChange={(enabled) => {
              setBulkPricingEnabled(enabled);
              if (!enabled) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.bulkThreshold;
                  delete next.bulk_threshold;
                  delete next.bulkPrice;
                  delete next.bulk_price;
                  return next;
                });
              }
            }}
            bulkThreshold={bulkPricingEnabled ? bulkThreshold : undefined}
            bulkPrice={bulkPricingEnabled ? bulkPrice : undefined}
            fullStockPrice={fullStockPrice}
            costPrice={costPrice}
            purchasePriceUpdated={purchasePriceUpdated}
            isNew={isNew}
            newUntil={newUntil}
            isHot={isHot}
            hotUntil={hotUntil}
            isFeatured={isFeatured}
            featuredUntil={featuredUntil}
            isPreorder={isPreorder}
            isSoldOut={isSoldOut}
            estimatedDeliveryDate={estimatedDeliveryDate}
            errors={errors}
            onWholesalePriceChange={setWholesalePrice}
            onStandardPriceChange={setWholesalePrice}
            onMoqChange={setCustomMoq}
            onBulkThresholdChange={setBulkThreshold}
            onBulkPriceChange={setBulkPrice}
            onIsPreorderChange={(val, date) => {
              setIsPreorder(val);
              if (val) {
                setIsSoldOut(false);
              }
              setEstimatedDeliveryDate(val ? (date ?? null) : null);
              if (errors.estimatedDeliveryDate) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.estimatedDeliveryDate;
                  delete next.is_sold_out;
                  return next;
                });
              }
            }}
            onIsSoldOutChange={(val) => {
              setIsSoldOut(val);
              if (val) {
                setIsPreorder(false);
                setEstimatedDeliveryDate(null);
              }
              if (errors.is_sold_out) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.is_sold_out;
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
            onSeoTitleChange={(val) => {
              seoTitleManuallyEditedRef.current = true;
              setSeoTitle(val);
            }}
            onSeoDescriptionChange={(val) => {
              seoDescriptionManuallyEditedRef.current = true;
              setSeoDescription(val);
            }}
            onKeywordsChange={(newKws) => {
              hasUserEditedKeywordsRef.current = true;
              setKeywords(newKws);
            }}
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
