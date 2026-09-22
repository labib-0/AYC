
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { brandService, BrandModel } from "@/services/brand.service";
import { getBrandLogoUrl } from "@/lib/brand-logos";
import { ChevronDown, Tag, LayoutGrid } from "lucide-react";
import AllCategoriesPanel from "./AllCategoriesPanel";
import BrandLogoTile from "@/components/common/BrandLogoTile";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  logo?: string;
  sort_order?: number;
}

/**
 * Authentic brand dataset with local SVG/PNG wordmark assets in /public/brands/
 * Compatible with BrandModel to allow seamless admin-managed logo_url overrides.
 */
const FALLBACK_BRANDS: Brand[] = [
  { id: "br_nike", name: "Nike", slug: "nike", logo_url: "/brands/nike.svg", logo: "/brands/nike.svg" },
  { id: "br_adidas", name: "Adidas", slug: "adidas", logo_url: "/brands/adidas.svg", logo: "/brands/adidas.svg" },
  { id: "br_levis", name: "Levi's", slug: "levis", logo_url: "/brands/levis.svg", logo: "/brands/levis.svg" },
  { id: "br_puma", name: "Puma", slug: "puma", logo_url: "/brands/puma.svg", logo: "/brands/puma.svg" },
  { id: "br_reebok", name: "Reebok", slug: "reebok", logo_url: "/brands/reebok.svg", logo: "/brands/reebok.svg" },
  { id: "br_champion", name: "Champion", slug: "champion", logo_url: "/brands/champion.svg", logo: "/brands/champion.svg" },
  { id: "br_fila", name: "Fila", slug: "fila", logo_url: "/brands/fila.svg", logo: "/brands/fila.svg" },
  { id: "br_vans", name: "Vans", slug: "vans", logo_url: "/brands/vans.svg", logo: "/brands/vans.svg" },
  { id: "br_converse", name: "Converse", slug: "converse", logo_url: "/brands/converse.svg", logo: "/brands/converse.svg" },
  { id: "br_newbalance", name: "New Balance", slug: "new-balance", logo_url: "/brands/new-balance.svg", logo: "/brands/new-balance.svg" },
  { id: "br_underarmour", name: "Under Armour", slug: "under-armour", logo_url: "/brands/under-armour.svg", logo: "/brands/under-armour.svg" },
  { id: "br_northface", name: "The North Face", slug: "the-north-face", logo_url: "/brands/the-north-face.svg", logo: "/brands/the-north-face.svg" },
  { id: "br_columbia", name: "Columbia", slug: "columbia", logo_url: "/brands/columbia.svg", logo: "/brands/columbia.svg" },
  { id: "br_patagonia", name: "Patagonia", slug: "patagonia", logo_url: "/brands/patagonia.svg", logo: "/brands/patagonia.svg" },
  { id: "br_calvinklein", name: "Calvin Klein", slug: "calvin-klein", logo_url: "/brands/calvin-klein.svg", logo: "/brands/calvin-klein.svg" },
  { id: "br_tommy", name: "Tommy Hilfiger", slug: "tommy-hilfiger", logo_url: "/brands/tommy-hilfiger.svg", logo: "/brands/tommy-hilfiger.svg" },
  { id: "br_hugoboss", name: "Hugo Boss", slug: "hugo-boss", logo_url: "/brands/hugo-boss.svg", logo: "/brands/hugo-boss.svg" },
  { id: "br_ralphlauren", name: "Ralph Lauren", slug: "ralph-lauren", logo_url: "/brands/ralph-lauren.svg", logo: "/brands/ralph-lauren.svg" },
  { id: "br_zara", name: "Zara", slug: "zara", logo_url: "/brands/zara.svg", logo: "/brands/zara.svg" },
  { id: "br_hm", name: "H&M", slug: "hm", logo_url: "/brands/hm.svg", logo: "/brands/hm.svg" },
  { id: "br_uniqlo", name: "Uniqlo", slug: "uniqlo", logo_url: "/brands/uniqlo.svg", logo: "/brands/uniqlo.svg" },
  { id: "br_diesel", name: "Diesel", slug: "diesel", logo_url: "/brands/diesel.svg", logo: "/brands/diesel.svg" },
  { id: "br_timberland", name: "Timberland", slug: "timberland", logo_url: "/brands/timberland.svg", logo: "/brands/timberland.svg" },
  { id: "br_mango", name: "Mango", slug: "mango", logo_url: "/brands/mango.svg", logo: "/brands/mango.svg" },
  { id: "br_jackjones", name: "Jack & Jones", slug: "jack-and-jones", logo_url: "/brands/jack-and-jones.svg", logo: "/brands/jack-and-jones.svg" },
  { id: "br_carhartt", name: "Carhartt", slug: "carhartt", logo_url: "/brands/carhartt.png", logo: "/brands/carhartt.png" },
  { id: "br_next", name: "Next", slug: "next", logo_url: "/brands/next.png", logo: "/brands/next.png" },
  { id: "br_guess", name: "Guess", slug: "guess", logo_url: "/brands/guess.png", logo: "/brands/guess.png" },
  { id: "br_lee", name: "Lee", slug: "lee", logo_url: "/brands/lee.png", logo: "/brands/lee.png" },
  { id: "br_benetton", name: "Benetton", slug: "benetton", logo_url: "/brands/united-colors-of-benetton.png", logo: "/brands/united-colors-of-benetton.png" },
  { id: "br_uspolo", name: "U.S. Polo Assn.", slug: "us-polo-assn", logo_url: "/brands/us-polo-assn.png", logo: "/brands/us-polo-assn.png" },
  { id: "br_armani", name: "Armani Exchange", slug: "armani-exchange", logo_url: "/brands/armani-exchange.png", logo: "/brands/armani-exchange.png" },
  { id: "br_bananarepublic", name: "Banana Republic", slug: "banana-republic", logo_url: "/brands/banana-republic.png", logo: "/brands/banana-republic.png" },
  { id: "br_jackwolfskin", name: "Jack Wolfskin", slug: "jack-wolfskin", logo_url: "/brands/jack-wolfskin.png", logo: "/brands/jack-wolfskin.png" },
  { id: "br_arcteryx", name: "Arc'teryx", slug: "arcteryx", logo_url: "/brands/arcteryx.png", logo: "/brands/arcteryx.png" },
  { id: "br_decathlon", name: "Decathlon", slug: "decathlon", logo_url: "/brands/decathlon.png", logo: "/brands/decathlon.png" },
  { id: "br_primark", name: "Primark", slug: "primark", logo_url: "/brands/primark.png", logo: "/brands/primark.png" },
  { id: "br_salomon", name: "Salomon", slug: "salomon", logo_url: "/brands/salomon.png", logo: "/brands/salomon.png" },
  { id: "br_gstar", name: "G-Star RAW", slug: "g-star-raw", logo_url: "/brands/g-star-raw.png", logo: "/brands/g-star-raw.png" },
  { id: "br_mand_s", name: "Marks & Spencer", slug: "m-and-s", logo_url: "/brands/m-and-s.png", logo: "/brands/m-and-s.png" },
];

const INITIAL_DISPLAY_COUNT = 28; // 14 columns x 2 rows = 28 brands

export default function ShopByBrand() {
  const router = useRouter();
  const [dbBrands, setDbBrands] = useState<Brand[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_DISPLAY_COUNT);
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1800) {
      setVisibleCount(32); // 16 columns x 2 rows = 32 brands on very wide desktop
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const brandsData = await brandService.getBrands();
        if (brandsData && brandsData.length > 0) {
          const formatted: Brand[] = brandsData.map((b: BrandModel) => ({
            id: String(b.slug || b.id),
            name: b.name,
            slug: b.slug,
            logo_url: b.logo_url || b.logo || (b.slug ? `/brands/${b.slug}.svg` : undefined),
            logo: b.logo || b.logo_url || (b.slug ? `/brands/${b.slug}.svg` : undefined),
            sort_order: b.sort_order,
          }));
          setDbBrands(formatted);
        }
      } catch (err) {
        console.error("Failed to load storefront brands:", err);
      }
    }
    load();
  }, []);

  // Merge real database brands with authentic local fallbacks up to 36 items
  const allBrands = useMemo(() => {
    const existingSlugs = new Set(dbBrands.map((b) => b.slug.toLowerCase()));
    const existingNames = new Set(dbBrands.map((b) => b.name.toLowerCase()));

    const combined = [...dbBrands];
    for (const fb of FALLBACK_BRANDS) {
      if (
        !existingSlugs.has(fb.slug.toLowerCase()) &&
        !existingNames.has(fb.name.toLowerCase())
      ) {
        combined.push(fb);
      }
    }
    return combined;
  }, [dbBrands]);

  const visibleBrands = useMemo(() => {
    return allBrands.slice(0, visibleCount);
  }, [allBrands, visibleCount]);

  const handleBrandClick = (brand: Brand) => {
    router.push(`/search?brand=${encodeURIComponent(brand.name)}&filterOpen=true`);
  };

  const handleAllCategoriesClick = () => {
    setIsAllCategoriesOpen((prev) => !prev);
  };

  return (
    <section
      id="brands"
      className="pt-1.5 sm:pt-2 pb-1.5 sm:pb-2 bg-background scroll-mt-20 select-none"
      aria-label="Shop By Brand"
    >
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10">
        
        {/* Centered Section Heading with ALL CATEGORIES Action */}
        <div className="relative mb-1.5 sm:mb-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2">
          {/* Centered Heading */}
          <h2 className="text-fluid-h2 font-display font-bold uppercase tracking-tight text-foreground leading-none text-center">
            SHOP BY BRAND
          </h2>

          {/* Action: ALL CATEGORIES (repositioned to right without offsetting the centered title) */}
          <div className="sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2">
            <button
              type="button"
              onClick={handleAllCategoriesClick}
              aria-expanded={isAllCategoriesOpen}
              aria-controls="shop-by-brand-categories"
              className={`inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[13px] font-sans font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground ${
                isAllCategoriesOpen
                  ? "bg-foreground text-background border border-foreground shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border/60 hover:border-foreground/30"
              }`}
              aria-label="All Categories"
            >
              <LayoutGrid
                size={13}
                className={
                  isAllCategoriesOpen
                    ? "text-background"
                    : "text-foreground/70 group-hover:text-foreground transition-colors"
                }
              />
              <span>ALL CATEGORIES</span>
            </button>
          </div>
        </div>

        {/* ── Inline Expanded Category Panel (Shared AllCategoriesPanel) ── */}
        <AllCategoriesPanel isOpen={isAllCategoriesOpen} id="shop-by-brand-categories" />

        {/* 
          Compact Responsive Brand Navigation Grid:
          - Very Wide Desktop (min-1800px): 16 columns per row
          - Large Desktop (2xl): 14 columns per row
          - Desktop (xl): 12 columns per row
          - Laptop (lg): 10 columns per row
          - Tablet (md): 8 columns per row
          - Small Tablet (sm): 6 columns per row
          - Mobile: 4 columns per row
        */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-[repeat(14,minmax(0,1fr))] min-[1800px]:grid-cols-[repeat(16,minmax(0,1fr))] gap-1.5 sm:gap-2">
          {visibleBrands.map((brand) => {
            // Direct logo source: brand.logo_url is authoritative (supports local /brands/*.svg or admin-uploaded URLs)
            const logoUrl = brand.logo_url || brand.logo || getBrandLogoUrl(brand.name);

            return (
              <BrandLogoTile
                key={brand.id}
                id={brand.id}
                name={brand.name}
                logoUrl={logoUrl}
                onClick={() => handleBrandClick(brand)}
                title={brand.name}
                ariaLabel={`Shop ${brand.name}`}
              />
            );
          })}
        </div>

        {/* 
          Centered Minimal Down-Arrow Load More Control:
                  ↓
              LOAD MORE
        */}
        {visibleCount < allBrands.length && (
          <div className="flex justify-center mt-2 sm:mt-2.5">
            <button
              type="button"
              onClick={() => setVisibleCount(allBrands.length)}
              className="inline-flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors group cursor-pointer focus-visible:outline-none"
              aria-label="Load more brands"
            >
              <div className="w-6.5 h-6.5 rounded-full border border-border/80 group-hover:border-foreground/50 bg-card group-hover:bg-secondary/70 flex items-center justify-center transition-all shadow-2xs group-hover:shadow-xs">
                <ChevronDown size={13} className="transition-transform duration-200 group-hover:translate-y-0.5 text-foreground/70 group-hover:text-foreground" />
              </div>
              <span className="text-[9.5px] font-bold uppercase tracking-widest font-sans">
                LOAD MORE
              </span>
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
