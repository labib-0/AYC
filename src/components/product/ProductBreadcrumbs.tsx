"use client";

import React from "react";
import Link from "next/link";
import { Product } from "@/types";
import { B2BProductInput } from "@/types/b2b";
import { buildProductBreadcrumbTrail, ProductBreadcrumbTrailItem } from "@/lib/seo/breadcrumbs";

export interface ProductBreadcrumbsProps {
  product: Partial<Product | B2BProductInput> | null | undefined;
  className?: string;
}

/**
 * Semantic, accessible product-detail breadcrumb component:
 * Catalog → Audience → Category → Brand → Product Title
 */
export default function ProductBreadcrumbs({
  product,
  className = "",
}: ProductBreadcrumbsProps) {
  if (!product) return null;

  const items: ProductBreadcrumbTrailItem[] = buildProductBreadcrumbTrail(product);
  if (!items || items.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`w-full max-w-[1480px] xl:max-w-[1560px] 2xl:max-w-[1600px] mx-auto ${className}`}
    >
      <ol className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-xs sm:text-[13px] text-muted-foreground leading-normal font-sans">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li
              key={`${item.level}-${item.label}-${index}`}
              className="inline-flex items-center gap-1.5 min-w-0"
            >
              {!isLast && item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors font-medium whitespace-nowrap py-0.5 px-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-muted-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="text-foreground font-semibold py-0.5 break-words"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <span
                  className="text-muted-foreground/40 font-normal select-none text-[11px] sm:text-xs mx-0.5 shrink-0"
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
