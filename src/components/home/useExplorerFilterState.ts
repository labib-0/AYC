"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { brandService, BrandModel } from "@/services/brand.service";
import { categoryService, CategoryModel } from "@/services/category.service";

export interface ExplorerFilterStateOptions {
  onFilterChange?: () => void;
}

export function useExplorerFilterState(options?: ExplorerFilterStateOptions) {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedDesignTypes, setSelectedDesignTypes] = useState<string[]>([]);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  const [availableBrands, setAvailableBrands] = useState<BrandModel[]>([]);
  const [availableCategories, setAvailableCategories] = useState<CategoryModel[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadMetadata() {
      try {
        const [brandsData, categoriesData] = await Promise.all([
          brandService.getBrands({ is_active: true, all: true }),
          categoryService.getCategories({ is_active: true, all: true }),
        ]);
        if (!isMounted) return;
        if (brandsData && brandsData.length > 0) {
          setAvailableBrands(brandsData);
        }
        if (categoriesData && categoriesData.length > 0) {
          setAvailableCategories(categoriesData);
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadMetadata();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeFiltersCount = useMemo(() => {
    return (
      selectedAudiences.length +
      selectedBrands.length +
      selectedDesignTypes.length +
      selectedCategories.length
    );
  }, [selectedAudiences, selectedBrands, selectedDesignTypes, selectedCategories]);

  const clearAllFilters = useCallback(() => {
    setSelectedBrands([]);
    setSelectedDesignTypes([]);
    setSelectedAudiences([]);
    setSelectedCategories([]);
    options?.onFilterChange?.();
  }, [options]);

  const handleBrandsChange = useCallback((brands: string[]) => {
    setSelectedBrands(brands);
    options?.onFilterChange?.();
  }, [options]);

  const handleDesignTypesChange = useCallback((types: string[]) => {
    setSelectedDesignTypes(types);
    options?.onFilterChange?.();
  }, [options]);

  const handleAudiencesChange = useCallback((audiences: string[]) => {
    setSelectedAudiences(audiences);
    options?.onFilterChange?.();
  }, [options]);

  const handleCategoriesChange = useCallback((categories: string[]) => {
    setSelectedCategories(categories);
    options?.onFilterChange?.();
  }, [options]);

  const toggleAudience = useCallback((audId: string) => {
    setSelectedAudiences((prev) =>
      prev.includes(audId) ? prev.filter((a) => a !== audId) : [...prev, audId]
    );
    options?.onFilterChange?.();
  }, [options]);

  return {
    selectedBrands,
    setSelectedBrands,
    selectedDesignTypes,
    setSelectedDesignTypes,
    selectedAudiences,
    setSelectedAudiences,
    selectedCategories,
    setSelectedCategories,
    isFilterOpen,
    setIsFilterOpen,
    availableBrands,
    availableCategories,
    activeFiltersCount,
    clearAllFilters,
    handleBrandsChange,
    handleDesignTypesChange,
    handleAudiencesChange,
    handleCategoriesChange,
    toggleAudience,
  };
}
