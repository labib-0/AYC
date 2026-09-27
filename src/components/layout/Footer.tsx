"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, ArrowUp, MessageCircle } from "lucide-react";
import BrandName from "../common/BrandName";
import BUSINESS_PROFILE, { getWhatsAppUrl } from "@/config/business-profile";
import { categoryService, CategoryModel } from "@/services/category.service";
import { brandService, BrandModel } from "@/services/brand.service";

export default function Footer() {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [brands, setBrands] = useState<BrandModel[]>([]);

  // Load active categories and brands for dynamic crawlable links
  useEffect(() => {
    async function loadTaxonomies() {
      try {
        const [cList, bList] = await Promise.all([
          categoryService.getCategories(),
          brandService.getBrands(),
        ]);
        if (Array.isArray(cList)) {
          const filtered = cList.filter(
            (c) =>
              c.is_active !== false &&
              !["men", "women", "boys", "girls", "unisex"].includes(
                (c.name || "").toLowerCase()
              )
          );
          setCategories(filtered.slice(0, 9));
        }
        if (Array.isArray(bList)) {
          const activeBrands = bList.filter((b) => b.is_active !== false);
          setBrands(activeBrands.slice(0, 9));
        }
      } catch (err) {
        console.warn("Footer taxonomy load notice:", err);
      }
    }
    loadTaxonomies();
  }, []);

  // Monitor scroll for back-to-top visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth scroll & auto-expand "Built for international buyers"
  const handleAboutUsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("expand-about-us"));
    const section = document.getElementById("built-for-international-buyers");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Smooth scroll to Compliance & Certifications
  const handleComplianceClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const section = document.getElementById("brand-trust");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <footer className="bg-[#0b1329] text-white/90 pt-14 pb-10 border-t border-white/10">
        <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
          
          {/* Main 5-Column Structured IA Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-8 lg:gap-7 pb-12 border-b border-white/10">
            
            {/* COLUMN 1 — AYAAN CLOTHING / ABOUT US (Col span 3) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <Link href="/" className="flex items-center inline-block w-fit" aria-label="Ayaan Clothing Home">
                <BrandName className="font-black text-2xl tracking-widest text-white" />
              </Link>
              
              <div>
                <button
                  type="button"
                  onClick={handleAboutUsClick}
                  className="text-xs font-bold uppercase tracking-[0.15em] text-white hover:text-white/80 transition-colors text-left flex items-center gap-1 group cursor-pointer"
                >
                  <span>ABOUT US</span>
                  <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                </button>
                <p className="text-[13px] text-white/70 leading-relaxed mt-2.5 max-w-sm">
                  {BUSINESS_PROFILE.description}. Established in {BUSINESS_PROFILE.establishedYear}, serving international retail chains and corporate apparel importers with export-grade ready-made garments.
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleAboutUsClick}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-white/80 hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
                >
                  Explore Buyer Capabilities →
                </button>
              </div>
            </div>

            {/* COLUMN 2 — SHOP & COLLECTIONS (Col span 2) */}
            <div className="lg:col-span-2">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.15em] mb-4 text-white/50">
                SHOP
              </h3>
              <ul className="flex flex-col gap-2 text-[13px] text-white/75">
                <li>
                  <Link href="/search" className="hover:text-white transition-colors">
                    All Products
                  </Link>
                </li>
                <li>
                  <Link href="/search?sort=newest" className="hover:text-white transition-colors">
                    New Arrivals
                  </Link>
                </li>
                <li>
                  <Link href="/search?sort=popular" className="hover:text-white transition-colors">
                    Best Deals &amp; Hot Sales
                  </Link>
                </li>
                <li>
                  <Link href="/search?audience=MEN" className="hover:text-white transition-colors">
                    Men&apos;s Collection
                  </Link>
                </li>
                <li>
                  <Link href="/search?audience=WOMEN" className="hover:text-white transition-colors">
                    Women&apos;s Apparel
                  </Link>
                </li>
                <li>
                  <Link href="/search?audience=BOYS" className="hover:text-white transition-colors">
                    Boys Fashion
                  </Link>
                </li>
                <li>
                  <Link href="/search?audience=GIRLS" className="hover:text-white transition-colors">
                    Girls Wear
                  </Link>
                </li>
                <li>
                  <Link href="/search?audience=UNISEX" className="hover:text-white transition-colors">
                    Unisex Essentials
                  </Link>
                </li>
              </ul>
            </div>

            {/* COLUMN 3 — POPULAR CATEGORIES (Col span 2) */}
            <div className="lg:col-span-2">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.15em] mb-4 text-white/50">
                CATEGORIES
              </h3>
              <ul className="flex flex-col gap-2 text-[13px] text-white/75">
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        href={`/search?category=${encodeURIComponent(cat.name)}`}
                        className="hover:text-white transition-colors"
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))
                ) : (
                  <>
                    <li><Link href="/search?category=Sweaters" className="hover:text-white transition-colors">Sweaters</Link></li>
                    <li><Link href="/search?category=T-Shirts" className="hover:text-white transition-colors">T-Shirts</Link></li>
                    <li><Link href="/search?category=Hoodies" className="hover:text-white transition-colors">Hoodies</Link></li>
                    <li><Link href="/search?category=Trousers" className="hover:text-white transition-colors">Trousers</Link></li>
                    <li><Link href="/search?category=Jackets" className="hover:text-white transition-colors">Jackets</Link></li>
                    <li><Link href="/search?category=Pants" className="hover:text-white transition-colors">Pants</Link></li>
                  </>
                )}
              </ul>
            </div>

            {/* COLUMN 4 — POPULAR BRANDS (Col span 2) */}
            <div className="lg:col-span-2">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.15em] mb-4 text-white/50">
                BRANDS
              </h3>
              <ul className="flex flex-col gap-2 text-[13px] text-white/75">
                {brands.length > 0 ? (
                  brands.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`/search?brand=${encodeURIComponent(b.name)}`}
                        className="hover:text-white transition-colors"
                      >
                        {b.name}
                      </Link>
                    </li>
                  ))
                ) : (
                  <>
                    <li><Link href="/search?brand=Nike" className="hover:text-white transition-colors">Nike</Link></li>
                    <li><Link href="/search?brand=Adidas" className="hover:text-white transition-colors">Adidas</Link></li>
                    <li><Link href="search?brand=Levi%27s" className="hover:text-white transition-colors">Levi&apos;s</Link></li>
                    <li><Link href="/search?brand=Puma" className="hover:text-white transition-colors">Puma</Link></li>
                    <li><Link href="/search?brand=Champion" className="hover:text-white transition-colors">Champion</Link></li>
                    <li><Link href="/search?brand=Zara" className="hover:text-white transition-colors">Zara</Link></li>
                  </>
                )}
              </ul>
            </div>

            {/* COLUMN 5 — WHOLESALE SOURCING & CONTACT (Col span 3) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div>
                <h3 className="text-[13px] font-bold uppercase tracking-[0.15em] mb-4 text-white/50">
                  WHOLESALE SOURCING
                </h3>
                <ul className="flex flex-col gap-2 text-[13px] text-white/75 mb-4">
                  <li>
                    <Link href="/rfq" className="hover:text-white transition-colors font-medium text-white/90">
                      Request for Quotation (RFQ) →
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={handleComplianceClick}
                      className="hover:text-white transition-colors text-left cursor-pointer"
                    >
                      Compliance &amp; Certifications (AQL 2.5)
                    </button>
                  </li>
                  <li>
                    <Link href="#shipping" className="hover:text-white transition-colors">
                      Export Shipping &amp; Incoterms
                    </Link>
                  </li>
                  <li>
                    <Link href="#faq" className="hover:text-white transition-colors">
                      Wholesale FAQ
                    </Link>
                  </li>
                </ul>

                {/* Social Icons (Line style SVGs) */}
                <div className="flex items-center gap-2.5 mb-4">
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <FacebookIcon className="w-4 h-4" />
                  </a>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <LinkedinIcon className="w-4 h-4" />
                  </a>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <InstagramIcon className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Official Business Information */}
              <div className="space-y-2 text-[13px] text-white/75 border-t border-white/10 pt-3">
                <div className="flex items-start gap-2.5">
                  <MapPin size={15} className="text-white/60 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    {BUSINESS_PROFILE.address.formatted}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <MessageCircle size={15} className="text-[#25D366] shrink-0 mt-0.5" />
                  <a
                    href={getWhatsAppUrl(`Hi ${BUSINESS_PROFILE.name}, I have an inquiry regarding wholesale apparel sourcing.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors underline-offset-4 hover:underline"
                  >
                    WhatsApp: {BUSINESS_PROFILE.contact.whatsappDisplay || BUSINESS_PROFILE.contact.phone || "+880 1982-183886"}
                  </a>
                </div>
              </div>
            </div>

          </div>

          {/* Brand Legal Disclaimer */}
          <div className="pt-6 pb-6 text-[13px] text-white/50 leading-relaxed border-b border-white/5">
            <p>
              Disclaimer: All brand names, logos, trademarks, and registered trademarks displayed on this website are the property of their respective owners. {BUSINESS_PROFILE.name} is an independent ready-made garments manufacturer and exporter.
            </p>
          </div>

          {/* Bottom Copyright & Legal Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 gap-4 text-[13px] text-white/40">
            <p>© {new Date().getFullYear()} {BUSINESS_PROFILE.name}. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="#privacy" className="hover:text-white/70 transition-colors">
                Privacy Policy
              </Link>
              <Link href="#terms" className="hover:text-white/70 transition-colors">
                Terms &amp; Conditions
              </Link>
            </div>
          </div>

        </div>
      </footer>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-20 right-6 z-40 w-11 h-11 rounded-full bg-white text-[#111827] shadow-xl flex items-center justify-center hover:bg-white/90 hover:scale-105 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Back to top"
          title="Back to top"
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      )}

      {/* Floating WhatsApp Button */}
      <a
        href={getWhatsAppUrl(`Hi ${BUSINESS_PROFILE.name}, I have an inquiry regarding wholesale apparel sourcing.`)}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[#25D366] text-white shadow-xl flex items-center justify-center hover:bg-[#20ba59] hover:scale-105 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Contact via WhatsApp"
        title="Contact via WhatsApp"
      >
        <MessageCircle size={24} fill="currentColor" />
      </a>
    </>
  );
}

// Clean line-style SVG icons for social networks
function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function LinkedinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
