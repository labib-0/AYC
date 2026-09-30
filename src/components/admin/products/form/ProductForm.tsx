"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Globe, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Check, Eye, EyeOff } from "lucide-react";
import { B2BProductInput, B2BProductVariant } from "@/types/b2b";
import { ShippingPackageProfile, PackageAllocation } from "@/types";
import { getBrands } from "@/lib/services/brands";
import { categoryService } from "@/services/category.service";
import { generateProductSku, createProduct, updateProduct } from "@/lib/services/products";
import { productDraftService } from "@/lib/services/product-draft.service";
import AdminAuthModal from "@/components/admin/auth/AdminAuthModal";
import { ApiError } from "@/services/api-client";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import { normalizeImageUrl, isValidImageUrl } from "@/lib/media";

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
  const [sku, setSku] = useState(initialData?.sku || "");
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(Boolean(initialData?.sku));
  const [isHiddenFromStorefront, setIsHiddenFromStorefront] = useState<boolean>(
    Boolean(initialData?.isHiddenFromStorefront || (initialData as any)?.is_hidden_from_storefront)
  );
  const [brand, setBrand] = useState(initialData?.brand || "");
  const [brandId, setBrandId] = useState<string | number | undefined>(initialData?.brand_id);
  const [brandLogo, setBrandLogo] = useState<string | undefined>(initialData?.brandLogo);
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
  const [packageAssortmentMessage, setPackageAssortmentMessage] = useState<string>(
    () => initialData?.packageAssortmentMessage || (initialData as any)?.package_assortment_message || DEFAULT_PACKAGE_ASSORTMENT_MESSAGE
  );
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
    return false;
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
  const [warehouseId, setWarehouseId] = useState<string | number | undefined>(
    initialData?.warehouseId || (initialData as any)?.warehouse_id || ""
  );
  const [customMoq, setCustomMoq] = useState<number | undefined>(() => {
    return initialData?.moq && initialData.moq > 0 ? initialData.moq : undefined;
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
        carton_length: undefined,
        carton_width: undefined,
        carton_height: undefined,
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
          carton_length: undefined,
          carton_width: undefined,
          carton_height: undefined,
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
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Snapshot constructor for current form state
  const getCurrentDraftData = useCallback((): Partial<B2BProductInput> => {
    const normalizedProductId = productId.replace(/\s+/g, "");
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
      seoDescription,
      keywords,
      images,
      videoUrl,
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
    productId, name, slug, sku, isHiddenFromStorefront, brand, brandId, brandLogo, categoryId, categoryName,
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
    const normalizedPid = (data.productId || "").replace(/\s+/g, "");
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
        wholesalePrice: wholesalePrice || 0,
        fullStockPrice: fullStockPrice || wholesalePrice || 0,
        moq: moq || 1,
        colors: colors,
        sizes: sizes,
        stock: (stock !== undefined && stock >= 0) ? stock : 0,
        warehouseId: warehouseId || undefined,
        images: images.length > 0 ? images : ["/placeholder.jpg"],
        packageAllocations: colors.length > 0 && sizes.length > 0 ? packageAllocations : [],
        shippingPackageProfiles: shippingProfiles,
        isPreorder: isPreorder,
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

  // Restore unsaved draft on mount (ONLY in edit mode or when resumeDraft is explicitly requested)
  useEffect(() => {
    if (!isEdit && !resumeDraft) return;

    const saved = productDraftService.getDraft(draftKey);
    if (saved && saved.data) {
      const d = saved.data;
      if (d.productId) setProductId(d.productId);
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
        setPackageAssortmentMessage(d.packageAssortmentMessage || (d as any).package_assortment_message || DEFAULT_PACKAGE_ASSORTMENT_MESSAGE);
      }
      if (d.description !== undefined) setDescription(d.description || "");
      if (d.seoTitle) setSeoTitle(d.seoTitle);
      if (d.seoDescription) setSeoDescription(d.seoDescription);
      if (d.keywords) setKeywords(d.keywords);
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
  }, [
    productId, name, slug, brand, brandId, categoryId, audience, designType,
    material, description, images, videoUrl, wholesalePrice, bulkPricingEnabled, bulkThreshold,
    bulkPrice, fullStockPrice, costPrice, stock, warehouseId, customMoq,
    colors, sizes, packageAllocations, shippingProfiles, isNew, isHot,
    isFeatured, isPreorder, estimatedDeliveryDate
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
    colors, sizes, packageAllocations, shippingProfiles, isPreorder, estimatedDeliveryDate
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

    if (!name.trim()) {
      errs.name = "Product name is required to save a draft.";
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

    const normalizedPid = productId.replace(/\s+/g, "");
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
      errs.wholesalePrice = "Wholesale price must be greater than $0.00.";
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

      // Generate variant combinations (no variant SKU)
      const variants: B2BProductVariant[] = [];
      const totalVariants = colors.length * sizes.length;
      const effectiveStock = stock !== undefined ? stock : 0;
      const stockPerVar = totalVariants > 0 ? Math.floor(effectiveStock / totalVariants) : effectiveStock;

      colors.forEach((c) => {
        sizes.forEach((s) => {
          variants.push({
            title: `${c} / ${s}`,
            color: c,
            size: s,
            wholesalePrice: wholesalePrice || 0,
            stock: stockPerVar,
            isActive: true,
          });
        });
      });

      // Pricing Tiers
      const pricingTiers = bulkPricingEnabled && bulkThreshold && bulkPrice ? [
        {
          min_quantity: moq,
          max_quantity: bulkThreshold - 1,
          unit_price: wholesalePrice || 0,
        },
        {
          min_quantity: bulkThreshold,
          max_quantity: null,
          unit_price: bulkPrice,
        },
      ] : [
        {
          min_quantity: moq,
          max_quantity: null,
          unit_price: wholesalePrice || 0,
        },
      ];

      const normalizedPid = productId.replace(/\s+/g, "");
      const payload: B2BProductInput = {
        id: persistedDraftIdRef.current || initialData?.id || `prod_${Date.now()}`,
        productId: normalizedPid,
        product_id: normalizedPid,
        name: name.trim(),
        slug: slug.trim(),
        sku: sku.trim() || generatedSku,
        isHiddenFromStorefront: isHiddenFromStorefront,
        is_hidden_from_storefront: isHiddenFromStorefront,
        brand: brand.trim(),
        brandLogo: activeBrand?.logo_url || brandLogo,
        brand_id: activeBrand?.id ? String(activeBrand.id) : undefined,
        categoryId: categoryId,
        categoryName: activeCat?.name || categoryName || "Apparel",
        audience: audience as any,
        designType: designType as any,
        productType: designType,
        description: description.trim(),
        shortDescription: seoDescription.trim() || description.slice(0, 160).trim(),
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        keywords: keywords,
        material: material.trim(),
        sizeDescription: sizeDescription.trim() || undefined,
        size_description: sizeDescription.trim() || undefined,
        colourDescription: colourDescription.trim() || undefined,
        colour_description: colourDescription.trim() || undefined,
        packageAssortmentVisible: packageAssortmentVisible,
        package_assortment_visible: packageAssortmentVisible,
        packageAssortmentMessage: packageAssortmentMessage.trim() || DEFAULT_PACKAGE_ASSORTMENT_MESSAGE,
        package_assortment_message: packageAssortmentMessage.trim() || DEFAULT_PACKAGE_ASSORTMENT_MESSAGE,
        images: (() => {
          const clean = images.map((u) => normalizeImageUrl(u)).filter((u) => isValidImageUrl(u));
          return clean.length > 0 ? clean : ["/placeholder.jpg"];
        })(),
        videoUrl: videoUrl.trim() || undefined,
        video_url: videoUrl.trim() || undefined,
        wholesalePrice: wholesalePrice || 0,
        standardPrice: wholesalePrice || 0,
        bulkPricingEnabled: bulkPricingEnabled,
        bulk_pricing_enabled: bulkPricingEnabled,
        bulkThreshold: bulkPricingEnabled && bulkThreshold ? bulkThreshold : undefined,
        bulkPrice: bulkPricingEnabled && bulkPrice ? bulkPrice : undefined,
        bulk_threshold: bulkPricingEnabled && bulkThreshold ? bulkThreshold : null,
        bulk_price: bulkPricingEnabled && bulkPrice ? bulkPrice : null,
        bulk_minimum_quantity: bulkPricingEnabled && bulkThreshold ? bulkThreshold : null,
        bulk_unit_price: bulkPricingEnabled && bulkPrice ? bulkPrice : null,
        fullStockPrice: fullStockPrice,
        full_stock_price: fullStockPrice,
        costPrice: costPrice,
        moq: moq,
        stock: stock !== undefined ? stock : 0,
        initialStock: stock !== undefined ? stock : 0,
        initial_stock: stock !== undefined ? stock : 0,
        warehouseId: warehouseId || undefined,
        warehouse_id: warehouseId || undefined,
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
        packageAllocations: colors.length > 0 && sizes.length > 0 ? packageAllocations : [],
        package_allocations: colors.length > 0 && sizes.length > 0 ? packageAllocations : [],
        shippingPackageProfiles: shippingProfiles,
        shipping_package_profiles: shippingProfiles,
      };

      const res = await onSubmit(payload);
      if (res && (res as any).id) {
        persistedDraftIdRef.current = String((res as any).id);
        setPersistedDraftId(String((res as any).id));
      }
      
      // On success: clear draft, update status, notify
      productDraftService.clearDraft(draftKey);
      setStatus(targetStatus);
      setSaveSuccess(true);
      setDraftRestored(false);
      setHasUserEdited(false);
      hasUserEditedRef.current = false;
      setAutosaveStatus("saved");

      if (!isEdit && targetStatus === "published") {
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

        {/* Action Buttons & Autosave Status */}
        <div className="flex items-center gap-3">
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
            sku={sku}
            brand={brand}
            brandId={brandId}
            categoryId={categoryId}
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
            onProductIdChange={setProductId}
            onNameChange={handleNameChange}
            onSlugChange={handleSlugChange}
            onSkuChange={handleSkuChange}
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
            onSizeDescriptionChange={setSizeDescription}
            onColourDescriptionChange={setColourDescription}
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
            availableStock={initialData?.availableStock ?? (initialData as any)?.available_stock ?? initialData?.stock}
            warehouseBreakdown={initialData?.warehouseBreakdown ?? (initialData as any)?.warehouse_breakdown}
            productId={initialData?.id}
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
            moq={moq}
            isMoqDerived={packageTotalUnits > 0}
            availableStock={
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
            estimatedDeliveryDate={estimatedDeliveryDate}
            errors={errors}
            onWholesalePriceChange={setWholesalePrice}
            onMoqChange={setCustomMoq}
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
