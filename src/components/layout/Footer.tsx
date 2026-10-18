"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, ArrowUp, MessageCircle, Mail, Phone } from "lucide-react";
import HeaderBranding from "../common/HeaderBranding";
import SocialIcon from "../common/SocialIcon";
import { useSiteSettings } from "@/lib/SiteSettingsContext";
import BUSINESS_PROFILE, { normalizeWhatsAppNumber } from "@/config/business-profile";
import { categoryService, CategoryModel } from "@/services/category.service";
import { brandService, BrandModel } from "@/services/brand.service";
import { filterConfiguredSocialLinks } from "@/lib/social-links";

export default function Footer() {
  const { settings, getWhatsAppUrl } = useSiteSettings();
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
          setCategories(filtered.slice(0, 10));
        }
        if (Array.isArray(bList)) {
          const activeBrands = bList.filter((b) => b.is_active !== false);
          setBrands(activeBrands.slice(0, 10));
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

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Authoritative business contact details (omits empty fields)
  const businessAddress =
    settings.public_address !== undefined
      ? settings.public_address
      : (BUSINESS_PROFILE.address.formatted || "");
  const googleMapsUrl = businessAddress.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessAddress.trim())}`
    : null;
  const businessEmail =
    settings.public_email !== undefined
      ? settings.public_email.trim()
      : (BUSINESS_PROFILE.contact.email || "");
  const rawPhone =
    settings.public_phone !== undefined
      ? settings.public_phone.trim()
      : (BUSINESS_PROFILE.contact.phone || "");
  const telDigits = rawPhone ? normalizeWhatsAppNumber(rawPhone) : "";
  const rawWhatsApp = settings.whatsapp?.display?.trim() || "";
  const activeSocialLinks = filterConfiguredSocialLinks(settings.social_links);

  const aboutUsContent = (settings as any).footer_description || `${BUSINESS_PROFILE.description}. Established in ${BUSINESS_PROFILE.establishedYear}, serving international retail chains and corporate apparel importers with export-grade ready-made garments.`;

  return (
    <>
      <footer className="bg-[#0b1329] text-white/90 pt-14 pb-20 sm:pb-10 border-t border-white/10">
        <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
          
          {/* Main 5-Column Structured IA Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-8 lg:gap-7 pb-12 border-b border-white/10">
            
            {/* COLUMN 1 — BRANDING / ABOUT US (Col span 3) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <Link href="/" className="flex items-center inline-block w-fit" aria-label={`${settings.site_title} Home`}>
                <HeaderBranding
                  siteTitle={settings.site_title}
                  siteLogo={settings.site_logo}
                  titleClassName="font-black text-2xl tracking-widest text-white"
                  logoHeightClass="h-8"
                />
              </Link>
              
              <div>
                <Link
                  href="/#top-banner"
                  className="text-xs font-bold uppercase tracking-[0.15em] text-white hover:text-white/80 transition-colors text-left inline-flex items-center gap-1 group"
                >
                  <span>ABOUT US</span>
                  <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                </Link>
                <p className="text-[13px] text-white/70 leading-relaxed mt-2.5 max-w-sm">
                  {aboutUsContent}
                </p>
              </div>

              <div className="pt-1">
                <Link
                  href="/faq"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-white/80 hover:text-white transition-colors underline underline-offset-4"
                >
                  FAQ →
                </Link>
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
                {categories.slice(0, 10).map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/search?category=${encodeURIComponent(cat.slug || cat.name)}`}
                      className="hover:text-white transition-colors"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
                <li className="pt-1.5 border-t border-white/10 mt-1">
                  <Link
                    href="/search"
                    className="hover:text-white text-amber-400 font-semibold transition-colors flex items-center gap-1 text-[13px]"
                  >
                    <span>All Categories</span>
                    <span>→</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* COLUMN 4 — POPULAR BRANDS (Col span 2) */}
            <div className="lg:col-span-2">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.15em] mb-4 text-white/50">
                BRANDS
              </h3>
              <ul className="flex flex-col gap-2 text-[13px] text-white/75">
                {brands.slice(0, 10).map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/search?brand=${encodeURIComponent(b.slug || b.name)}`}
                      className="hover:text-white transition-colors"
                    >
                      {b.name}
                    </Link>
                  </li>
                ))}
                <li className="pt-1.5 border-t border-white/10 mt-1">
                  <Link
                    href="/search"
                    className="hover:text-white text-amber-400 font-semibold transition-colors flex items-center gap-1 text-[13px]"
                  >
                    <span>All Brands</span>
                    <span>→</span>
                  </Link>
                </li>
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
                    <Link
                      href="/compliance"
                      className="hover:text-white transition-colors text-left"
                    >
                      Compliance &amp; Certifications
                    </Link>
                  </li>
                </ul>

                {/* Social Icons (Dynamic Line style SVGs, minimum 40px touch targets, verified profiles only) */}
                {activeSocialLinks.length > 0 ? (
                  <div className="flex items-center gap-2.5 mb-4 flex-wrap">
                    {activeSocialLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={link.name}
                        title={link.name}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <SocialIcon provider={link.icon || link.provider} className="w-4 h-4" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Official Business Information */}
              <div className="space-y-2.5 text-[13px] text-white/75 border-t border-white/10 pt-3">
                {googleMapsUrl ? (
                  <div className="flex items-start gap-2.5">
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${settings.site_title} office on Google Maps`}
                      className="flex items-start gap-2.5 text-white/75 hover:text-white transition-colors group"
                    >
                      <MapPin size={15} className="text-white/60 group-hover:text-white shrink-0 mt-0.5 transition-colors" />
                      <span className="leading-relaxed group-hover:underline underline-offset-4">
                        {businessAddress}
                      </span>
                    </a>
                  </div>
                ) : null}

                {businessEmail ? (
                  <div className="flex items-start gap-2.5">
                    <Mail size={15} className="text-white/60 shrink-0 mt-0.5" />
                    <a
                      href={`mailto:${businessEmail}`}
                      aria-label={`Email ${settings.site_title} at ${businessEmail}`}
                      className="text-white/75 hover:text-white transition-colors underline-offset-4 hover:underline"
                    >
                      {businessEmail}
                    </a>
                  </div>
                ) : null}

                {rawPhone ? (
                  <div className="flex items-start gap-2.5">
                    <Phone size={15} className="text-white/60 shrink-0 mt-0.5" />
                    <a
                      href={`tel:+${telDigits}`}
                      aria-label={`Call ${settings.site_title} at ${rawPhone}`}
                      className="text-white/75 hover:text-white transition-colors underline-offset-4 hover:underline"
                    >
                      Call: {rawPhone}
                    </a>
                  </div>
                ) : null}

                {rawWhatsApp ? (
                  <div className="flex items-start gap-2.5">
                    <MessageCircle size={15} className="text-[#25D366] shrink-0 mt-0.5" />
                    <a
                      href={getWhatsAppUrl(`Hi ${settings.site_title}, I have an inquiry regarding wholesale apparel sourcing.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Chat with ${settings.site_title} on WhatsApp`}
                      className="text-white/75 hover:text-white transition-colors underline-offset-4 hover:underline"
                    >
                      WhatsApp: {rawWhatsApp}
                    </a>
                  </div>
                ) : null}
              </div>
            </div>

          </div>

          {/* Brand Legal Disclaimer */}
          <div className="pt-6 pb-6 text-[13px] text-white/50 leading-relaxed border-b border-white/5">
            <p>
              Disclaimer: All brand names, logos, trademarks, and registered trademarks displayed on this website are the property of their respective owners. {settings.site_title} is an independent ready-made garments manufacturer and exporter.
            </p>
          </div>

          {/* Bottom Copyright & Legal Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 gap-4 text-[13px] text-white/40">
            <p>© {new Date().getFullYear()} {settings.site_title}. All rights reserved.</p>
            <div className="flex items-center gap-6">
              {settings.legal_pages && settings.legal_pages.length > 0 ? (
                settings.legal_pages.map((page) => (
                  <Link
                    key={page.type}
                    href={page.url}
                    className="hover:text-white/70 transition-colors"
                  >
                    {page.title}
                  </Link>
                ))
              ) : (
                <>
                  <Link href="/privacy-policy" className="hover:text-white/70 transition-colors">
                    Privacy Policy
                  </Link>
                  <Link href="/terms-and-conditions" className="hover:text-white/70 transition-colors">
                    Terms &amp; Conditions
                  </Link>
                </>
              )}
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
        href={getWhatsAppUrl(`Hi ${settings.site_title}, I have an inquiry regarding wholesale apparel sourcing.`)}
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

