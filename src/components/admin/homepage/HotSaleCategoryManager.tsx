"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Plus, 
  Search, 
  X, 
  Check, 
  Flame, 
  Layers,
  Save,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { 
  homepageService, 
  HomepageHotSaleCategoryModel 
} from "@/services/homepage.service";
import { categoryService, CategoryModel } from "@/services/category.service";
import { getCategoryImageUrl } from "@/lib/category-images";

function CategoryItemThumbnail({
  src,
  alt,
  fallbackSlug,
  size = "md",
}: {
  src?: string | null;
  alt: string;
  fallbackSlug?: string;
  size?: "sm" | "md";
}) {
  const [currentSrc, setCurrentSrc] = useState<string>(() => {
    return src || getCategoryImageUrl(fallbackSlug || alt);
  });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSrc(src || getCategoryImageUrl(fallbackSlug || alt));
    setHasError(false);
  }, [src, fallbackSlug, alt]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      const fallback = getCategoryImageUrl(fallbackSlug || alt);
      if (fallback && fallback !== currentSrc) {
        setCurrentSrc(fallback);
      }
    }
  };

  const containerClasses =
    size === "sm"
      ? "relative w-10 h-10 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border/60 flex items-center justify-center"
      : "relative w-11 h-11 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border/60 flex items-center justify-center";

  return (
    <div className={containerClasses}>
      {currentSrc && !hasError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSrc}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={handleError}
        />
      ) : (
        <Layers size={size === "sm" ? 16 : 18} className="text-muted-foreground/40" />
      )}
    </div>
  );
}

interface HotSaleCategoryManagerProps {
  initialCategories: HomepageHotSaleCategoryModel[];
  onSaveSuccess?: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export default function HotSaleCategoryManager({
  initialCategories,
  onSaveSuccess,
  showToast,
}: HotSaleCategoryManagerProps) {
  const [categories, setCategories] = useState<HomepageHotSaleCategoryModel[]>(initialCategories);
  const [allTaxonomyCategories, setAllTaxonomyCategories] = useState<CategoryModel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync state if initialCategories changes externally
  useEffect(() => {
    setCategories(initialCategories);
    setHasUnsavedChanges(false);
  }, [initialCategories]);

  // Load category taxonomy when selector modal is opened
  const handleOpenModal = async () => {
    setIsModalOpen(true);
    setModalSearch("");
    if (allTaxonomyCategories.length === 0) {
      setLoadingTaxonomy(true);
      try {
        const list = await categoryService.getCategories({ all: true, isAdmin: true });
        setAllTaxonomyCategories(list);
      } catch (err) {
        console.error("Failed to load taxonomy categories:", err);
      } finally {
        setLoadingTaxonomy(false);
      }
    }
  };

  // Move category up in sort order
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setCategories((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setHasUnsavedChanges(true);
  };

  // Move category down in sort order
  const handleMoveDown = (index: number) => {
    if (index >= categories.length - 1) return;
    setCategories((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setHasUnsavedChanges(true);
  };

  // Remove category from hot sales (does NOT delete category)
  const handleRemove = (categoryId: number) => {
    setCategories((prev) => {
      const next = prev.filter((c) => c.category_id !== categoryId);
      return next.map((item, idx) => ({ ...item, sort_order: idx }));
    });
    setHasUnsavedChanges(true);
  };

  // Add category from taxonomy modal
  const handleAddCategory = (taxonomyCat: CategoryModel) => {
    const exists = categories.some((c) => c.category_id === Number(taxonomyCat.id));
    if (exists) return;

    const newItem: HomepageHotSaleCategoryModel = {
      category_id: Number(taxonomyCat.id),
      sort_order: categories.length,
      is_active: true,
      category: {
        id: Number(taxonomyCat.id),
        name: taxonomyCat.name,
        slug: taxonomyCat.slug,
        description: taxonomyCat.description,
        image_url: taxonomyCat.image_url || taxonomyCat.image,
        accent_color: taxonomyCat.accent_color,
        sort_order: taxonomyCat.sort_order,
        is_active: taxonomyCat.is_active !== false,
      },
    };

    setCategories((prev) => [...prev, newItem]);
    setHasUnsavedChanges(true);
  };

  // Save changes to Laravel API
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = categories.map((c, idx) => ({
        category_id: c.category_id,
        sort_order: idx,
        is_active: c.is_active !== false,
      }));

      const updated = await homepageService.syncHotSaleCategories(payload);
      setCategories(updated);
      setHasUnsavedChanges(false);
      showToast("Hot Sale categories updated successfully. Active on storefront.", "success");
      if (onSaveSuccess) onSaveSuccess();
    } catch {
      showToast("Failed to save Hot Sale categories. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Filter taxonomy in modal
  const filteredTaxonomy = useMemo(() => {
    const q = modalSearch.toLowerCase().trim();
    if (!q) return allTaxonomyCategories;
    return allTaxonomyCategories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        (cat.slug && cat.slug.toLowerCase().includes(q))
    );
  }, [allTaxonomyCategories, modalSearch]);

  const selectedCategoryIds = useMemo(() => {
    return new Set(categories.map((c) => c.category_id));
  }, [categories]);

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-6 shadow-2xs">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <Flame size={16} />
            </div>
            <h2 className="text-base sm:text-lg font-display font-bold uppercase tracking-tight text-foreground">
              Hot Sale Categories
            </h2>
            {hasUnsavedChanges && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 font-mono">
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Curate and arrange the category cards displayed in the storefront HOT SALE showcase.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Category</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Categories</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Selected Categories List */}
      {categories.length === 0 ? (
        <div className="py-12 border-2 border-dashed border-border/70 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mx-auto">
            <Layers size={22} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">No Hot Sale categories selected</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add product categories to feature them prominently in the storefront Hot Sale section.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus size={14} />
            <span>Add First Category</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {categories.map((item, index) => {
            const cat = item.category;
            const isFirst = index === 0;
            const isLast = index === categories.length - 1;

            return (
              <div
                key={item.category_id}
                className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-border/70 bg-card hover:bg-secondary/40 transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Position Badge */}
                  <span className="w-6 h-6 rounded-lg bg-secondary text-foreground text-xs font-mono font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>

                  {/* Thumbnail */}
                  <CategoryItemThumbnail
                    src={cat?.image_url || (cat as { image?: string } | undefined)?.image}
                    alt={cat?.name || "Category"}
                    fallbackSlug={cat?.slug || cat?.name}
                    size="md"
                  />

                  {/* Details */}
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold uppercase tracking-tight text-foreground truncate">
                      {cat?.name || `Category #${item.category_id}`}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      slug: {cat?.slug || "—"}
                    </p>
                  </div>
                </div>

                {/* Actions: Reorder & Remove */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={isFirst}
                    title="Move Up"
                    className="p-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <ArrowUp size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={isLast}
                    title="Move Down"
                    className="p-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-secondary disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <ArrowDown size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(item.category_id)}
                    title="Remove from Hot Sale"
                    className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors cursor-pointer ml-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Selector Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/80">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Select Product Category
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Search */}
            <div className="p-4 border-b border-border/60 bg-muted/20">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search taxonomy categories..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Modal List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingTaxonomy ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Loading product categories...
                </div>
              ) : filteredTaxonomy.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No matching categories found.
                </div>
              ) : (
                filteredTaxonomy.map((cat) => {
                  const isSelected = selectedCategoryIds.has(Number(cat.id));

                  return (
                    <div
                      key={cat.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "border-primary/40 bg-primary/5 opacity-70"
                          : "border-border/70 bg-card hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CategoryItemThumbnail
                          src={cat.image_url || cat.image}
                          alt={cat.name}
                          fallbackSlug={cat.slug || cat.name}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold uppercase tracking-tight text-foreground truncate">
                            {cat.name}
                          </h4>
                          <span className="text-[11px] text-muted-foreground font-mono truncate block">
                            /{cat.slug}
                          </span>
                        </div>
                      </div>

                      <div>
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary px-2.5 py-1 rounded-lg bg-primary/10">
                            <Check size={12} />
                            <span>Added</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddCategory(cat)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border/80 flex items-center justify-end bg-muted/10">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer"
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
