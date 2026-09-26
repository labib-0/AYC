"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Plus, 
  Search, 
  X, 
  Check, 
  Tags, 
  Save,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { 
  homepageService, 
  HomepageFeaturedBrandModel 
} from "@/services/homepage.service";
import { brandService, BrandModel } from "@/services/brand.service";
import { getBrandLogoUrl } from "@/lib/brand-logos";

interface ShopByBrandManagerProps {
  initialBrands: HomepageFeaturedBrandModel[];
  onSaveSuccess?: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export default function ShopByBrandManager({
  initialBrands,
  onSaveSuccess,
  showToast,
}: ShopByBrandManagerProps) {
  const [brands, setBrands] = useState<HomepageFeaturedBrandModel[]>(initialBrands);
  const [allCatalogBrands, setAllCatalogBrands] = useState<BrandModel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync state if initialBrands changes externally
  useEffect(() => {
    setBrands(initialBrands);
    setHasUnsavedChanges(false);
  }, [initialBrands]);

  // Load backend brand directory when selector modal is opened
  const handleOpenModal = async () => {
    setIsModalOpen(true);
    setModalSearch("");
    if (allCatalogBrands.length === 0) {
      setLoadingBrands(true);
      try {
        const list = await brandService.getBrands({ all: true, isAdmin: true });
        setAllCatalogBrands(list);
      } catch (err) {
        console.error("Failed to load catalog brands:", err);
      } finally {
        setLoadingBrands(false);
      }
    }
  };

  // Move brand up in sort order
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setBrands((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setHasUnsavedChanges(true);
  };

  // Move brand down in sort order
  const handleMoveDown = (index: number) => {
    if (index >= brands.length - 1) return;
    setBrands((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setHasUnsavedChanges(true);
  };

  // Remove brand from Shop By Brand landing list
  const handleRemove = (brandId: string | number) => {
    setBrands((prev) => {
      const next = prev.filter((b) => String(b.brand_id) !== String(brandId));
      return next.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setHasUnsavedChanges(true);
  };

  // Add brand from catalog modal
  const handleAddBrand = (catalogBrand: BrandModel) => {
    const exists = brands.some((b) => String(b.brand_id) === String(catalogBrand.id));
    if (exists) return;

    const newItem: HomepageFeaturedBrandModel = {
      brand_id: catalogBrand.id,
      sort_order: brands.length,
      is_active: true,
      brand: {
        id: catalogBrand.id,
        name: catalogBrand.name,
        slug: catalogBrand.slug,
        logo_url: catalogBrand.logo_url || catalogBrand.logo,
        website: catalogBrand.website,
        sort_order: catalogBrand.sort_order,
        is_active: catalogBrand.is_active !== false,
      },
    };

    setBrands((prev) => [...prev, newItem]);
    setHasUnsavedChanges(true);
  };

  // Toggle active state
  const handleToggleActive = (index: number) => {
    setBrands((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        is_active: !next[index].is_active,
      };
      return next;
    });
    setHasUnsavedChanges(true);
  };

  // Save changes to Laravel API
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = brands.map((b, idx) => ({
        brand_id: b.brand_id,
        sort_order: idx,
        is_active: b.is_active !== false,
      }));

      const updated = await homepageService.syncFeaturedBrands(payload);
      setBrands(updated);
      setHasUnsavedChanges(false);
      showToast("Shop By Brand selection and order updated successfully. Active on storefront.", "success");
      if (onSaveSuccess) onSaveSuccess();
    } catch {
      showToast("Failed to save Shop By Brand selection. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Filter catalog brands in modal
  const filteredCatalogBrands = useMemo(() => {
    const q = modalSearch.trim().toLowerCase();
    return allCatalogBrands.filter((b) => {
      if (b.is_active === false) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        (b.slug && b.slug.toLowerCase().includes(q))
      );
    });
  }, [allCatalogBrands, modalSearch]);

  const selectedBrandIds = useMemo(
    () => new Set(brands.map((b) => String(b.brand_id))),
    [brands]
  );

  return (
    <div className="space-y-4">
      {/* Section Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Tags size={16} />
            </div>
            <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-foreground">
              Shop By Brand (Landing Page)
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select and sequence the brands that appear in the &quot;SHOP BY BRAND&quot; section on the storefront homepage.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-semibold hover:bg-secondary/80 border border-border transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Brand</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Brands</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unsaved indicator notice */}
      {hasUnsavedChanges && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />
            <span>You have unsaved changes in your Shop By Brand list. Click <strong>Save Brands</strong> to persist.</span>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="font-bold underline uppercase tracking-wider hover:opacity-80 cursor-pointer"
          >
            Save Now
          </button>
        </div>
      )}

      {/* Brands List Display */}
      {brands.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border/80 text-center space-y-3 bg-secondary/10">
          <div className="w-10 h-10 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mx-auto">
            <Tags size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No Brands Selected for Landing Page</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              The storefront Shop By Brand section will remain empty until you select brands to feature. Click &quot;Add Brand&quot; to choose from your active catalog.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus size={14} />
            <span>Select Brands from Catalog</span>
          </button>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-2xs divide-y divide-border/60">
          {brands.map((item, index) => {
            const brand = item.brand;
            const logo = brand?.logo_url || (brand?.name ? getBrandLogoUrl(brand.name) : "/placeholder.jpg");
            const isFirst = index === 0;
            const isLast = index === brands.length - 1;

            return (
              <div
                key={String(item.brand_id)}
                className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 transition-colors ${
                  item.is_active ? "hover:bg-secondary/20" : "opacity-50 bg-secondary/30"
                }`}
              >
                {/* Left: Position Number & Logo + Details */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-6 text-center font-mono text-xs font-bold text-muted-foreground">
                    #{index + 1}
                  </div>

                  <div className="w-12 h-12 rounded-xl bg-secondary/40 border border-border/60 overflow-hidden relative shrink-0 flex items-center justify-center p-1.5">
                    {logo ? (
                      <Image
                        src={logo}
                        alt={brand?.name || "Brand logo"}
                        fill
                        className="object-contain p-1"
                        sizes="48px"
                        unoptimized
                      />
                    ) : (
                      <Tags size={20} className="text-muted-foreground" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground truncate">
                        {brand?.name || `Brand #${item.brand_id}`}
                      </h4>
                      {brand?.slug && (
                        <span className="text-[11px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                          {brand.slug}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.is_active ? "Active on landing page" : "Inactive (Hidden)"}
                    </p>
                  </div>
                </div>

                {/* Right: Actions (Active Toggle, Up/Down, Remove) */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {/* Active Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(index)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                      item.is_active
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    }`}
                    title={item.is_active ? "Click to deactivate on landing page" : "Click to activate"}
                  >
                    {item.is_active ? "Active" : "Hidden"}
                  </button>

                  {/* Move Up */}
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={isFirst}
                    className="p-1.5 rounded-lg border border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors cursor-pointer"
                    aria-label={`Move ${brand?.name} up`}
                  >
                    <ArrowUp size={14} />
                  </button>

                  {/* Move Down */}
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={isLast}
                    className="p-1.5 rounded-lg border border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-25 transition-colors cursor-pointer"
                    aria-label={`Move ${brand?.name} down`}
                  >
                    <ArrowDown size={14} />
                  </button>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => handleRemove(item.brand_id)}
                    className="p-1.5 rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    aria-label={`Remove ${brand?.name} from Shop By Brand`}
                    title="Remove from landing page"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Catalog Brand Selector Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground">Select Brands for Landing Page</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pick manufacturer brands from your active database catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-border/60">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search brands by name or slug..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-secondary/50 rounded-xl text-xs text-foreground placeholder:text-muted-foreground border border-border/60 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Brands List */}
            <div className="p-4 overflow-y-auto flex-1 divide-y divide-border/40">
              {loadingBrands ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Loading catalog brands from database...
                </div>
              ) : filteredCatalogBrands.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-xs text-muted-foreground">No matching brands found in your database.</p>
                </div>
              ) : (
                filteredCatalogBrands.map((b) => {
                  const isSelected = selectedBrandIds.has(String(b.id));
                  const logo = b.logo_url || b.logo || (b.name ? getBrandLogoUrl(b.name) : undefined);

                  return (
                    <div
                      key={String(b.id)}
                      className="py-2.5 flex items-center justify-between gap-3 hover:bg-secondary/30 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-secondary/50 border border-border/40 overflow-hidden relative shrink-0 flex items-center justify-center p-1">
                          {logo ? (
                            <Image
                              src={logo}
                              alt={b.name}
                              fill
                              className="object-contain p-0.5"
                              sizes="36px"
                              unoptimized
                            />
                          ) : (
                            <Tags size={14} className="text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{b.name}</p>
                          {b.slug && <p className="text-[11px] font-mono text-muted-foreground truncate">{b.slug}</p>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            handleRemove(b.id);
                          } else {
                            handleAddBrand(b);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1 ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check size={12} />
                            <span>Selected</span>
                          </>
                        ) : (
                          <>
                            <Plus size={12} />
                            <span>Select</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border/60 flex items-center justify-between bg-secondary/20">
              <span className="text-xs text-muted-foreground">
                {brands.length} brand{brands.length === 1 ? "" : "s"} selected for Shop By Brand
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
