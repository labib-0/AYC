"use client";

import React from "react";
import Link from "next/link";
import { BrandModel } from "@/services/brand.service";
import { CategoryModel } from "@/services/category.service";
import { BreadcrumbItem, formatBreadcrumbLabel } from "@/lib/seo/breadcrumbs";
import { absoluteUrl } from "@/lib/seo/config";

export { formatBreadcrumbLabel };

export interface BreadcrumbCrumb {
  label: string;
  href?: string;
}

export interface StorefrontBreadcrumbsProps {
  items: BreadcrumbCrumb[];
  className?: string;
}



/**
 * Builds standard hierarchical breadcrumbs for the customer storefront listing page.
 *
 * Rules:
 * 1. Always starts with "Home" linking to "/".
 * 2. Intermediate items link to their corresponding category, audience, or catalog page.
 * 3. The current page is the final, non-clickable item.
 * 4. Never includes search terms, sorting, or pagination as breadcrumb items.
 * 5. Handles unknown, deleted, or unavailable taxonomies gracefully.
 */
export function buildStorefrontBreadcrumbs(params: {
  query?: string | null;
  selectedBrands?: string[];
  selectedCategories?: string[];
  selectedAudiences?: string[];
  subcategory?: string | null;
  liveBrands?: BrandModel[];
  liveCategories?: CategoryModel[];
}): { crumbs: BreadcrumbCrumb[]; jsonLdItems: BreadcrumbItem[] } {
  const {
    query = "",
    selectedBrands = [],
    selectedCategories = [],
    selectedAudiences = [],
    subcategory = null,
    liveBrands = [],
    liveCategories = [],
  } = params;

  const crumbs: BreadcrumbCrumb[] = [{ label: "Home", href: "/" }];

  const hasQuery = Boolean(query && query.trim());
  const singleBrand = selectedBrands.length === 1 && !hasQuery && selectedCategories.length === 0 && selectedAudiences.length === 0;
  const singleAudience = selectedAudiences.length === 1;
  const singleCategory = selectedCategories.length === 1;

  // Case 1: Brand listing (e.g. Home / Brands / LEE)
  if (singleBrand) {
    const rawBrand = selectedBrands[0];
    const matchedBrand = liveBrands.find(
      (b) => b.name.toLowerCase() === rawBrand.toLowerCase() || (b.slug && b.slug.toLowerCase() === rawBrand.toLowerCase())
    );
    const brandLabel = matchedBrand?.name || formatBreadcrumbLabel(rawBrand);

    crumbs.push({ label: "Brands", href: "/search" });
    crumbs.push({ label: brandLabel });
  }
  // Case 2: Audience + Category + Subcategory (e.g. Home / Women / Tops / T-Shirts)
  else if (singleAudience && singleCategory) {
    const rawAudience = selectedAudiences[0].toUpperCase();
    const audienceLabel = formatBreadcrumbLabel(rawAudience);
    const rawCategory = selectedCategories[0];
    const matchedCategory = liveCategories.find(
      (c) => c.name.toLowerCase() === rawCategory.toLowerCase() || (c.slug && c.slug.toLowerCase() === rawCategory.toLowerCase())
    );
    const catLabel = matchedCategory?.name || formatBreadcrumbLabel(rawCategory);

    // Audience crumb
    crumbs.push({
      label: audienceLabel,
      href: `/search?audience=${rawAudience.toLowerCase()}`,
    });

    // Check for subcategory
    const subcatRaw = subcategory || (matchedCategory?.parent_id ? matchedCategory.name : null);
    if (subcatRaw && matchedCategory?.parent_id) {
      // Current category is a subcategory with a parent
      const parentCat = liveCategories.find(
        (c) => String(c.id) === String(matchedCategory.parent_id)
      );
      const parentName = parentCat?.name || "Categories";
      crumbs.push({
        label: parentName,
        href: `/search?audience=${rawAudience.toLowerCase()}&category=${encodeURIComponent(parentName)}`,
      });
      crumbs.push({ label: catLabel });
    } else if (subcategory && subcategory.trim()) {
      const matchedSub = liveCategories.find(
        (c) => c.name.toLowerCase() === subcategory.toLowerCase() || (c.slug && c.slug.toLowerCase() === subcategory.toLowerCase())
      );
      crumbs.push({
        label: catLabel,
        href: `/search?audience=${rawAudience.toLowerCase()}&category=${encodeURIComponent(catLabel)}`,
      });
      crumbs.push({ label: matchedSub?.name || formatBreadcrumbLabel(subcategory) });
    } else {
      crumbs.push({ label: catLabel });
    }
  }
  // Case 3: Category listing (e.g. Home / Tops or Home / Tops / T-Shirts)
  else if (singleCategory && !singleAudience && !hasQuery && selectedBrands.length === 0) {
    const rawCategory = selectedCategories[0];
    const matchedCategory = liveCategories.find(
      (c) => c.name.toLowerCase() === rawCategory.toLowerCase() || (c.slug && c.slug.toLowerCase() === rawCategory.toLowerCase())
    );
    const catLabel = matchedCategory?.name || formatBreadcrumbLabel(rawCategory);

    if (subcategory && subcategory.trim()) {
      const matchedSub = liveCategories.find(
        (c) => c.name.toLowerCase() === subcategory.toLowerCase() || (c.slug && c.slug.toLowerCase() === subcategory.toLowerCase())
      );
      crumbs.push({
        label: catLabel,
        href: `/search?category=${encodeURIComponent(catLabel)}`,
      });
      crumbs.push({ label: matchedSub?.name || formatBreadcrumbLabel(subcategory) });
    } else if (matchedCategory?.parent_id) {
      const parentCat = liveCategories.find(
        (c) => String(c.id) === String(matchedCategory.parent_id)
      );
      if (parentCat && parentCat.name.toLowerCase() !== "apparel") {
        crumbs.push({
          label: parentCat.name,
          href: `/search?category=${encodeURIComponent(parentCat.name)}`,
        });
      }
      crumbs.push({ label: catLabel });
    } else {
      crumbs.push({ label: catLabel });
    }
  }
  // Case 4: Audience listing only (e.g. Home / Women)
  else if (singleAudience && !singleCategory && !hasQuery && selectedBrands.length === 0) {
    const rawAudience = selectedAudiences[0].toUpperCase();
    crumbs.push({ label: formatBreadcrumbLabel(rawAudience) });
  }
  // Case 5: Search results
  else if (hasQuery) {
    crumbs.push({ label: "Search Results" });
  }
  // Case 6: All Products (default catalog)
  else {
    crumbs.push({ label: "All Products" });
  }

  // Generate corresponding Schema.org BreadcrumbItem array
  const jsonLdItems: BreadcrumbItem[] = crumbs.map((crumb, idx) => ({
    name: crumb.label,
    url: absoluteUrl(crumb.href || "/search"),
    position: idx + 1,
  }));

  return { crumbs, jsonLdItems };
}

/**
 * Customer-facing semantic breadcrumb component for AYAAN CLOTHING storefront.
 */
export default function StorefrontBreadcrumbs({
  items,
  className = "",
}: StorefrontBreadcrumbsProps) {
  if (!items || items.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`w-full mb-3 sm:mb-4 ${className}`}
    >
      <ol className="flex items-center flex-wrap gap-1.5 text-xs text-muted-foreground font-sans">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li
              key={`${item.label}-${index}`}
              className="inline-flex items-center gap-1.5"
            >
              {!isLast && item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors font-medium"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="text-foreground font-semibold truncate max-w-[200px] sm:max-w-xs"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <span
                  className="text-muted-foreground/40 font-normal select-none text-[11px]"
                  aria-hidden="true"
                >
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
