"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, ArrowUp, MessageCircle } from "lucide-react";
import BrandName from "../common/BrandName";
import BUSINESS_PROFILE, { getWhatsAppUrl } from "@/config/business-profile";

export default function Footer() {
  const [showBackToTop, setShowBackToTop] = useState(false);

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
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 xl:px-10">
          
          {/* Main 4-Column Grid (Desktop 4 cols, Tablet 2 cols, Mobile Stacked 1 col) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-white/10">
            
            {/* COLUMN 1 — AYAAN CLOTHING / ABOUT US (Col span 4) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
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
                <p className="text-sm text-white/70 leading-relaxed mt-2.5 max-w-sm">
                  {BUSINESS_PROFILE.description}. Established in {BUSINESS_PROFILE.establishedYear}, serving international buyers with premium ready-made garments manufacturing & export.
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleAboutUsClick}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/80 hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
                >
                  Explore Buyer Capabilities →
                </button>
              </div>
            </div>

            {/* COLUMN 2 — INFORMATION (Col span 3) */}
            <div className="lg:col-span-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] mb-4 text-white/50">
                INFORMATION
              </h3>
              <ul className="flex flex-col gap-2.5 text-sm text-white/75">
                <li>
                  <button
                    type="button"
                    onClick={handleAboutUsClick}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    About Us
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={handleComplianceClick}
                    className="hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Compliance & Certifications
                  </button>
                </li>
                <li>
                  <Link href="/rfq" className="hover:text-white transition-colors">
                    Request for Quotation (RFQ)
                  </Link>
                </li>
                <li>
                  <Link href="#privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#terms" className="hover:text-white transition-colors">
                    Terms & Conditions
                  </Link>
                </li>
              </ul>
            </div>

            {/* COLUMN 3 — OFFICIAL BUSINESS ADDRESS & CONTACT (Col span 3) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] mb-4 text-white/50">
                  OFFICIAL BUSINESS ADDRESS
                </h3>
                
                {/* Social Icons (Line style SVGs) */}
                <div className="flex items-center gap-2.5 mb-5">
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
              <div className="space-y-2.5 text-xs text-white/75">
                <div className="flex items-start gap-2.5">
                  <MapPin size={15} className="text-white/60 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    {BUSINESS_PROFILE.address.formatted}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <MessageCircle size={15} className="text-[#25D366] shrink-0 mt-0.5" />
                  <a
                    href={getWhatsAppUrl(`Hi ${BUSINESS_PROFILE.name}, I have an inquiry regarding wholesale apparel.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors underline-offset-4 hover:underline"
                  >
                    Chat on WhatsApp
                  </a>
                </div>
                <div className="text-[11px] text-white/50 pl-6">
                  Established: {BUSINESS_PROFILE.establishedYear} • Brand Mark: {BUSINESS_PROFILE.brandMark}
                </div>
              </div>
            </div>

            {/* COLUMN 4 — SUPPORT (Col span 2) */}
            <div className="lg:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] mb-4 text-white/50">
                SUPPORT
              </h3>
              <ul className="flex flex-col gap-2.5 text-sm text-white/75">
                <li>
                  <Link href="#shipping" className="hover:text-white transition-colors">
                    Shipping Information
                  </Link>
                </li>
                <li>
                  <Link href="/profile/orders" className="hover:text-white transition-colors">
                    Order Tracking
                  </Link>
                </li>
                <li>
                  <Link href="#faq" className="hover:text-white transition-colors">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          {/* Brand Legal Disclaimer */}
          <div className="pt-6 pb-6 text-xs text-white/50 leading-relaxed border-b border-white/5">
            <p>
              Disclaimer: All brand names, logos, trademarks, and registered trademarks displayed on this website are the property of their respective owners. {BUSINESS_PROFILE.name} is an independent ready-made garments manufacturer and exporter.
            </p>
          </div>

          {/* Bottom Copyright & Legal Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 gap-4 text-xs text-white/40">
            <p>© {new Date().getFullYear()} {BUSINESS_PROFILE.name}. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="#privacy" className="hover:text-white/70 transition-colors">
                Privacy Policy
              </Link>
              <Link href="#terms" className="hover:text-white/70 transition-colors">
                Terms & Conditions
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
        href={getWhatsAppUrl(`Hi ${BUSINESS_PROFILE.name}, I have an inquiry regarding wholesale apparel.`)}
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
