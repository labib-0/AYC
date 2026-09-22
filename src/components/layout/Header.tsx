"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Search, 
  ShoppingCart, 
  User, 
  Globe, 
  Menu,
  Package,
  LogOut,
  Heart,
  MessageCircle,
  ChevronDown
} from "lucide-react";
import LocationModal from "./LocationModal";
import LanguageCurrencyModal from "./LanguageCurrencyModal";
import AuthModal from "../auth/AuthModal";
import SearchOverlay from "./SearchOverlay";
import BrandName from "../common/BrandName";
import { useCart } from "@/lib/CartContext";
import { useWishlist } from "@/lib/WishlistContext";
import { usePreferences } from "@/lib/PreferencesContext";
import { useAuth } from "@/lib/AuthContext";
import BUSINESS_PROFILE, { getWhatsAppUrl } from "@/config/business-profile";

const AUDIENCE_MENU_ITEMS = [
  { label: "MEN", href: "/search?audience=MEN" },
  { label: "WOMEN", href: "/search?audience=WOMEN" },
  { label: "BOYS", href: "/search?audience=BOYS" },
  { label: "GIRLS", href: "/search?audience=GIRLS" },
  { label: "UNISEX", href: "/search?audience=UNISEX" },
];

const PRODUCT_CATEGORY_MENU_ITEMS = [
  { label: "ALL", href: "/search" },
  { label: "SWEATERS", href: "/search?category=Sweaters" },
  { label: "T-SHIRTS", href: "/search?category=T-Shirts" },
  { label: "HOODIES", href: "/search?category=Hoodies" },
  { label: "TROUSERS", href: "/search?category=Trousers" },
  { label: "PANTS", href: "/search?category=Pants" },
  { label: "SHORTS", href: "/search?category=Shorts" },
  { label: "SHIRTS", href: "/search?category=Shirts" },
  { label: "BEACHWEAR", href: "/search?category=Beachwear" },
  { label: "SOCKS", href: "/search?category=Socks" },
  { label: "BLOUSE", href: "/search?category=Blouse" },
  { label: "TANK TOP", href: "/search?category=Tank%20Top" },
  { label: "TOPS", href: "/search?category=Tops" },
  { label: "SPORTS", href: "/search?category=Sports" },
  { label: "TOWELS", href: "/search?category=Towels" },
];

type HeaderState = "expanded" | "compact";

function HeaderContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Single authoritative source of truth for header scroll state
  const [headerState, setHeaderState] = useState<HeaderState>("expanded");
  const isCompact = headerState === "compact";

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<"none" | "audience" | "category">("none");
  const isAudienceOpen = mobileAccordion === "audience";
  const isCategoryOpen = mobileAccordion === "category";

  const toggleAudienceAccordion = () => {
    setMobileAccordion((prev) => (prev === "audience" ? "none" : "audience"));
  };

  const toggleCategoryAccordion = () => {
    setMobileAccordion((prev) => (prev === "category" ? "none" : "category"));
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setMobileAccordion("none");
  };
  
  // Modals state
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<"signin" | "signup">("signin");

  // Search boundary refs for click-outside dismissal
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const mobileCompactSearchRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLFormElement>(null);

  // Contexts
  const { totalItems, setIsCartOpen } = useCart();
  const { totalWishlistItems } = useWishlist();
  const { preferences } = usePreferences();
  const { user, signOut } = useAuth();

  // Optimized single-listener scroll detection with hysteresis and requestAnimationFrame
  useEffect(() => {
    let rafId: number | null = null;
    let lastKnownState: HeaderState = "expanded";

    const handleScroll = () => {
      if (rafId !== null) return;

      rafId = window.requestAnimationFrame(() => {
        const y = window.scrollY || (typeof document !== "undefined" ? document.documentElement.scrollTop : 0) || 0;
        
        let nextState: HeaderState = lastKnownState;

        // Enter compact threshold: y > 50px
        if (lastKnownState === "expanded" && y > 50) {
          nextState = "compact";
        }
        // Return to expanded threshold: y <= 8px (or at top)
        else if (lastKnownState === "compact" && y <= 8) {
          nextState = "expanded";
        }

        // Only trigger React state update if state actually changed
        if (nextState !== lastKnownState) {
          lastKnownState = nextState;
          setHeaderState(nextState);
        }

        rafId = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Run initial scroll check
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [pathname]);

  // Outside click & Escape key dismissal for active search state
  useEffect(() => {
    if (!isSearchOpen) return;

    const handleOutsideInteraction = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Do not dismiss if clicking inside mobile search form or desktop search form
      if (
        mobileSearchRef.current?.contains(target) ||
        mobileCompactSearchRef.current?.contains(target) ||
        desktopSearchRef.current?.contains(target)
      ) {
        return;
      }

      // Do not dismiss if clicking inside the search discovery overlay (suggestions / recent searches)
      if (target.closest?.("[data-search-overlay]")) {
        return;
      }

      // Outside click detected -> dismiss search active state
      setIsSearchOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
    };

    // Close search dropdown when scrolling deeply
    const handleScrollClose = () => {
      if (window.scrollY > 120) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideInteraction);
    document.addEventListener("touchstart", handleOutsideInteraction, { passive: true });
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollClose, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("touchstart", handleOutsideInteraction);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollClose);
    };
  }, [isSearchOpen]);

  const handleLogoClick = (e: React.MouseEvent) => {
    setIsSearchOpen(false);
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (window.location.hash || window.location.search) {
        router.push("/");
      }
    }
  };

  const openSignIn = () => {
    setIsSearchOpen(false);
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  // Search execution handler -> Navigates to /search?query=...
  const handleExecuteSearch = (queryToSearch?: string) => {
    const q = (queryToSearch !== undefined ? queryToSearch : searchQuery).trim();
    if (q) {
      setIsSearchOpen(false);
      setSearchQuery(""); // Clear the visible input so search page loads with empty search bar

      // Save to localStorage recent searches
      try {
        const saved = localStorage.getItem("ayaan_recent_searches");
        const list: string[] = saved ? JSON.parse(saved) : ["Sweater", "T-Shirt", "Hoodie"];
        const updated = [q, ...list.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 6);
        localStorage.setItem("ayaan_recent_searches", JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }

      // Navigate to dedicated search page
      router.push(`/search?query=${encodeURIComponent(q)}`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteSearch();
  };

  return (
    <>
      {/* 
        STABLE OUTER HEADER SHELL:
        Reserves predictable document flow space so page content NEVER shifts/jumps vertically 
        when the header transitions between Expanded (106px) and Compact (58px) states.
      */}
      <div className="w-full h-[106px] lg:h-[4.25rem] shrink-0 pointer-events-none select-none" aria-hidden="true" />

      {/* 
        FIXED HEADER:
        Pinned at top: 0 with zero layout interference on page scroll.
      */}
      <header 
        role="banner"
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-250 w-full ${
          isCompact 
            ? "bg-[#0b1329]/95 backdrop-blur-md shadow-lg border-b border-white/10" 
            : "bg-[#0b1329] border-b border-white/5"
        }`}
      >
        {/* DESKTOP HEADER (Untouched, Full Desktop Bar) */}
        <div className="hidden lg:flex items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10 py-3 gap-6 text-white max-w-[1600px] mx-auto">
          {/* Logo */}
          <Link href="/" onClick={handleLogoClick} className="flex items-center gap-2 shrink-0 group" aria-label="Ayaan Clothing Home">
            <BrandName className="font-black text-2xl xl:text-3xl tracking-widest text-white group-hover:text-white/90 transition-colors" />
          </Link>

          {/* Search Bar */}
          <form 
            ref={desktopSearchRef}
            onSubmit={handleSearchSubmit}
            className="flex-1 max-w-xl xl:max-w-2xl 2xl:max-w-3xl relative"
          >
            <div 
              className={`flex items-center w-full rounded-full h-11 border transition-all duration-200 cursor-text ${
                isSearchOpen 
                  ? "bg-white border-white text-slate-900 shadow-[0_0_20px_rgba(255,255,255,0.35)] ring-2 ring-white/30 pl-4 pr-1.5" 
                  : "bg-white/[0.08] border-white/15 text-white hover:bg-white/[0.12] hover:border-white/30 px-4"
              }`}
            >
              {!isSearchOpen && (
                <Search size={18} className="mr-3 shrink-0 text-white/50" />
              )}
              <input 
                type="text"
                className={`bg-transparent border-none outline-none w-full text-[13px] focus:ring-0 ${
                  isSearchOpen 
                    ? "text-slate-900 placeholder:text-slate-400 font-medium pr-2" 
                    : "text-white placeholder:text-white/50"
                }`}
                placeholder={isSearchOpen ? "Search apparel, brand, or collection..." : "Search products..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
              />
              {isSearchOpen && (
                <button 
                  type="submit"
                  className="shrink-0 h-8 px-4 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  aria-label="Search"
                >
                  <Search size={14} className="text-white" strokeWidth={2.5} />
                  <span>Search</span>
                </button>
              )}
            </div>

            {/* Suggestions Dropdown (Desktop) */}
            <SearchOverlay 
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectTerm={(term) => {
                setSearchQuery(term);
                handleExecuteSearch(term);
              }}
              variant="desktop"
            />
          </form>

          {/* Desktop Utilities */}
          <div className="flex items-center gap-6 xl:gap-8 shrink-0">
            
            {/* Deliver To */}
            <button 
              type="button"
              className="flex items-center gap-2 text-white/85 hover:text-white cursor-pointer transition-colors press-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1"
              onClick={() => setIsLocationOpen(true)}
              aria-label={`Deliver to ${preferences.country}`}
            >
              <span className="text-xl leading-none">{preferences.flag}</span>
              <div className="flex flex-col leading-none justify-center text-left">
                <span className="text-[11px] text-white/50 mb-0.5 uppercase tracking-wide">Deliver to:</span>
                <span className="font-bold tracking-wide text-[13px] truncate max-w-[90px]">
                  {preferences.countryCode}
                </span>
              </div>
            </button>

            {/* Language */}
            <button 
              type="button"
              className="flex items-center gap-2 text-white/85 hover:text-white cursor-pointer transition-colors press-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1"
              onClick={() => setIsLanguageOpen(true)}
              aria-label={`Language: ${preferences.language}`}
            >
              <Globe size={18} strokeWidth={1.5} />
              <span className="font-bold tracking-wide text-[13px] uppercase">
                {preferences.language}
              </span>
            </button>

            {/* Wishlist — only visible when authenticated */}
            {user && (
              <Link 
                href="/profile"
                className="relative flex items-center justify-center h-10 w-10 rounded-full border border-white/20 hover:bg-white/10 transition-colors press-feedback focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer" 
                aria-label="Wishlist"
              >
                <Heart size={18} strokeWidth={1.5} />
                {totalWishlistItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[0.6rem] font-bold w-[1.125rem] h-[1.125rem] flex items-center justify-center rounded-full shadow-sm">
                    {totalWishlistItems}
                  </span>
                )}
              </Link>
            )}

            {/* Cart */}
            <button 
              type="button"
              className="relative flex items-center justify-center h-10 w-10 rounded-full border border-white/20 hover:bg-white/10 transition-colors press-feedback focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer" 
              aria-label="Shopping Cart"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart size={18} strokeWidth={1.5} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-900 text-[0.6rem] font-bold w-[1.125rem] h-[1.125rem] flex items-center justify-center rounded-full shadow-sm">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Account / Profile */}
            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 h-10 px-3 rounded-full border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors press-feedback focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
                aria-label={`My Dashboard: ${user.name || user.email}`}
              >
                <User size={18} strokeWidth={1.5} />
                <span className="text-xs font-semibold max-w-[100px] truncate">
                  {user.name?.split(" ")[0] || "Dashboard"}
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 h-10 px-3 rounded-full border border-white/20 hover:bg-white/10 text-white transition-colors press-feedback focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
                aria-label="Sign In / Account"
              >
                <User size={18} strokeWidth={1.5} />
              </Link>
            )}

          </div>
        </div>

        {/* MOBILE HEADER (lg:hidden) — Clean 3-Zone Flex Architecture */}
        <div
          className={`lg:hidden w-full text-white transition-all duration-250 ease-out motion-reduce:transition-none overflow-hidden relative ${
            isCompact ? "h-[58px] px-3.5 sm:px-4" : "h-[106px] px-4 sm:px-6 pt-2.5 pb-2.5 flex flex-col justify-between"
          }`}
        >
          {/* ROW 1: 3-Zone Flex Action Row */}
          <div className={`flex items-center justify-between w-full shrink-0 ${isCompact ? "h-full" : "h-9 sm:h-10"}`}>
            
            {/* ZONE 1: LOGO / LEFT MENU (shrink-0) */}
            <div className="flex items-center shrink-0 z-20">
              {/* Top-State Hamburger (Left) */}
              <div
                className={`transition-all duration-250 ease-out motion-reduce:transition-none flex items-center overflow-hidden ${
                  isCompact
                    ? "w-0 opacity-0 -translate-x-4 pointer-events-none"
                    : "w-10 opacity-100 translate-x-0 pointer-events-auto"
                }`}
              >
                <button
                  type="button"
                  className="flex items-center justify-center h-10 w-10 -ml-1 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
                  aria-label="Open navigation menu"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setIsMobileMenuOpen(true);
                  }}
                >
                  <Menu size={22} strokeWidth={1.75} />
                </button>
              </div>

              {/* Scrolled-State Compact Logo: AYC (Left) */}
              <div
                className={`transition-all duration-250 ease-out motion-reduce:transition-none flex items-center overflow-hidden ${
                  isCompact
                    ? "w-11 sm:w-12 opacity-100 translate-x-0 pointer-events-auto"
                    : "w-0 opacity-0 -translate-x-4 pointer-events-none"
                }`}
              >
                <Link
                  href="/"
                  onClick={handleLogoClick}
                  className="font-brand font-black text-[1.2rem] sm:text-[1.25rem] tracking-tight select-none text-white leading-none shrink-0 flex items-center hover:opacity-90 transition-opacity"
                  aria-label="Ayaan Clothing Home"
                >
                  <span className="text-[#EA580C]">A</span>
                  <span>Y</span>
                  <span className="text-[#EA580C]">C</span>
                </Link>
              </div>
            </div>

            {/* ZONE 2: MIDDLE AREA (Brand Wordmark in Expanded / Flexible Inline Search in Compact) */}
            <div className={`flex-1 min-w-0 flex items-center relative transition-all duration-250 ease-out motion-reduce:transition-none ${
              isCompact ? "justify-start px-2 sm:px-2.5" : "justify-center"
            }`}>
              {/* Top-State Full Brand Wordmark: AYAAN CLOTHING */}
              <div
                className={`transition-all duration-250 ease-out motion-reduce:transition-none flex items-center justify-center ${
                  isCompact
                    ? "opacity-0 scale-90 pointer-events-none absolute"
                    : "opacity-100 scale-100 pointer-events-auto relative max-w-[70%]"
                }`}
              >
                <Link
                  href="/"
                  onClick={handleLogoClick}
                  className="pointer-events-auto flex items-center justify-center"
                  aria-label="Ayaan Clothing Home"
                >
                  <BrandName className="font-black text-xl sm:text-2xl tracking-widest text-white leading-tight truncate" />
                </Link>
              </div>

              {/* Scrolled-State Compact Search Bar (Flex-1, constrained within Zone 2) */}
              <div
                ref={mobileCompactSearchRef}
                className={`w-full transition-all duration-250 ease-out motion-reduce:transition-none ${
                  isCompact
                    ? "opacity-100 pointer-events-auto flex items-center"
                    : "opacity-0 pointer-events-none absolute"
                }`}
              >
                <form
                  onSubmit={handleSearchSubmit}
                  className={`flex w-full items-center rounded-full border transition-all duration-200 cursor-text min-w-0 h-[36px] text-xs ${
                    isSearchOpen
                      ? "bg-white border-white text-slate-900 shadow-[0_0_16px_rgba(255,255,255,0.3)] ring-1.5 ring-white/30 pl-3 pr-1"
                      : "bg-white/[0.07] border-white/12 text-white hover:bg-white/[0.11] hover:border-white/25 pl-2.5 pr-2"
                  }`}
                >
                  {!isSearchOpen && (
                    <Search size={13} className="mr-1.5 shrink-0 text-white/45 transition-colors" />
                  )}

                  <input
                    type="text"
                    className={`bg-transparent border-none outline-none w-full min-w-0 focus:ring-0 transition-colors text-xs ${
                      isSearchOpen
                        ? "text-slate-900 placeholder:text-slate-400 font-medium pr-1"
                        : "text-white placeholder:text-white/40"
                    }`}
                    placeholder={isSearchOpen ? "Search apparel, brand..." : "Search products..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                  />

                  {isSearchOpen && (
                    <button
                      type="submit"
                      className="shrink-0 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold flex items-center justify-center shadow-sm transition-all duration-150 cursor-pointer animate-in fade-in zoom-in-90 h-6 px-2.5 text-[0.6875rem] gap-0.5"
                      aria-label="Search"
                      title="Search"
                    >
                      <Search size={11} className="text-white" strokeWidth={2.5} />
                    </button>
                  )}
                </form>
              </div>
            </div>

            {/* ZONE 3: ACTIONS AREA (Wishlist + Cart + Scrolled-State Hamburger — shrink-0) */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 z-20">
              {user && (
                <Link
                  href="/profile"
                  onClick={() => setIsSearchOpen(false)}
                  className="relative flex items-center justify-center h-9 w-9 text-white/85 hover:text-white press-feedback focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label="Wishlist"
                >
                  <Heart size={18} strokeWidth={1.5} />
                  {totalWishlistItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[0.6rem] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-slate-900">
                      {totalWishlistItems}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart Button */}
              <button
                type="button"
                className="relative flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 text-white/90 hover:text-white active:bg-white/10 rounded-full press-feedback focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
                onClick={() => {
                  setIsSearchOpen(false);
                  setIsCartOpen(true);
                }}
                aria-label="Shopping Cart"
              >
                <ShoppingCart size={19} strokeWidth={1.6} />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-amber-500 text-slate-950 text-[0.6rem] font-extrabold w-4 h-4 flex items-center justify-center rounded-full border border-[#0b1329] shadow-sm leading-none">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Scrolled-State Hamburger (Right-most) */}
              <div
                className={`transition-all duration-250 ease-out motion-reduce:transition-none flex items-center overflow-hidden ${
                  isCompact
                    ? "w-9 sm:w-10 opacity-100 translate-x-0 pointer-events-auto"
                    : "w-0 opacity-0 translate-x-4 pointer-events-none"
                }`}
              >
                <button
                  type="button"
                  className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
                  aria-label="Open navigation menu"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setIsMobileMenuOpen(true);
                  }}
                >
                  <Menu size={20} strokeWidth={1.75} />
                </button>
              </div>
            </div>

          </div>

          {/* ROW 2: Expanded-State Search Bar (Full width, only active in Expanded mode) */}
          <div
            ref={mobileSearchRef}
            className={`w-full transition-all duration-250 ease-out motion-reduce:transition-none ${
              isCompact ? "h-0 opacity-0 pointer-events-none overflow-hidden" : "h-10 opacity-100 pointer-events-auto relative z-10"
            }`}
          >
            <form
              onSubmit={handleSearchSubmit}
              className={`flex w-full items-center rounded-full border transition-all duration-200 cursor-text h-10 text-sm ${
                isSearchOpen
                  ? "bg-white border-white text-slate-900 shadow-[0_0_16px_rgba(255,255,255,0.3)] ring-1.5 ring-white/30 pl-3 pr-1"
                  : "bg-white/[0.08] border-white/15 text-white hover:bg-white/[0.12] hover:border-white/30 px-3.5"
              }`}
            >
              {!isSearchOpen && (
                <Search size={16} className="mr-2 shrink-0 text-white/45 transition-colors" />
              )}

              <input
                type="text"
                className={`bg-transparent border-none outline-none w-full focus:ring-0 transition-colors text-[0.8125rem] ${
                  isSearchOpen
                    ? "text-slate-900 placeholder:text-slate-400 font-medium pr-1"
                    : "text-white placeholder:text-white/50"
                }`}
                placeholder={isSearchOpen ? "Search apparel, brand..." : "Search products..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
              />

              {isSearchOpen && (
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold flex items-center justify-center shadow-sm transition-all duration-150 cursor-pointer animate-in fade-in zoom-in-90 h-7 px-3 text-xs gap-1"
                  aria-label="Search"
                  title="Search"
                >
                  <Search size={13} className="text-white" strokeWidth={2.5} />
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Mobile Search Dropdown (Anchored to mobile header) */}
        <div className="lg:hidden">
          <SearchOverlay 
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSelectTerm={(term) => {
              setSearchQuery(term);
              handleExecuteSearch(term);
            }}
            variant="mobile"
          />
        </div>

      </header>

      {/* Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 bg-[#0b1329] text-white z-[100] transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <Link href="/" className="flex items-center" onClick={(e) => { closeMobileMenu(); handleLogoClick(e); }} aria-label="Ayaan Clothing Home">
            <BrandName className="font-bold text-xl tracking-widest text-white" />
          </Link>
          <button 
            type="button"
            className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors"
            onClick={closeMobileMenu}
            aria-label="Close menu"
          >
            <div className="w-6 h-6 flex items-center justify-center relative">
              <span className="absolute w-5 h-0.5 bg-white rotate-45" />
              <span className="absolute w-5 h-0.5 bg-white -rotate-45" />
            </div>
          </button>
        </div>
        <nav className="flex flex-col p-4 overflow-y-auto max-h-[calc(100vh-64px)] divide-y divide-white/10 text-white">
          
          {/* Section 1: AUDIENCE */}
          <div className="py-3">
            <button
              type="button"
              onClick={toggleAudienceAccordion}
              className="w-full flex items-center justify-between py-2 text-[13px] font-display font-extrabold uppercase tracking-wider text-white/70 hover:text-white transition-colors cursor-pointer group"
            >
              <span>AUDIENCE</span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 text-white/50 group-hover:text-white ${
                  isAudienceOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>

            {isAudienceOpen && (
              <div className="flex flex-col pl-3 pt-1 space-y-0.5 animate-in fade-in duration-200">
                {AUDIENCE_MENU_ITEMS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className="py-2 text-[13px] font-display font-bold uppercase tracking-wider text-white hover:text-amber-400 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: PRODUCT CATEGORY */}
          <div className="py-3">
            <button
              type="button"
              onClick={toggleCategoryAccordion}
              className="w-full flex items-center justify-between py-2 text-[13px] font-display font-extrabold uppercase tracking-wider text-white/70 hover:text-white transition-colors cursor-pointer group"
            >
              <span>PRODUCT CATEGORY</span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 text-white/50 group-hover:text-white ${
                  isCategoryOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>

            {isCategoryOpen && (
              <div className="flex flex-col pl-3 pt-1 space-y-0.5 max-h-[280px] overflow-y-auto animate-in fade-in duration-200 no-scrollbar">
                {PRODUCT_CATEGORY_MENU_ITEMS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className="py-2 text-[13px] font-display font-semibold uppercase tracking-wider text-white/90 hover:text-amber-400 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Highlights / Specials */}
          <div className="py-3 flex flex-col">
            <Link
              href="/#hot-sales"
              onClick={() => setIsMobileMenuOpen(false)}
              className="py-2 text-[13px] font-display font-bold uppercase tracking-wider text-red-400 hover:text-red-300 transition-colors"
            >
              HOT SALES
            </Link>
            <Link
              href="/?tab=new-arrivals#featured"
              onClick={(e) => {
                setIsMobileMenuOpen(false);
                if (pathname === "/") {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent("activate-new-arrivals"));
                  const featEl = document.getElementById("featured");
                  if (featEl) featEl.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className="py-2 text-[13px] font-display font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors"
            >
              NEW ARRIVALS
            </Link>
          </div>

          {/* Mobile Utilities */}
          <div className="mt-8 flex flex-col gap-5 pt-4">

            <button 
              type="button"
              className="flex items-center justify-between py-2 text-white/90"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsLocationOpen(true);
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{preferences.flag}</span>
                <span className="font-semibold text-sm">Deliver to: {preferences.country}</span>
              </div>
              <span className="text-xs text-white/50 uppercase font-bold tracking-wider">Change</span>
            </button>

            <button 
              type="button"
              className="flex items-center justify-between py-2 text-white/90"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsLanguageOpen(true);
              }}
            >
              <div className="flex items-center gap-3">
                <Globe size={18} strokeWidth={1.5} />
                <span className="font-semibold text-sm">Language: {preferences.language}</span>
              </div>

              <span className="text-xs text-white/50 uppercase font-bold tracking-wider">Change</span>
            </button>

            {user ? (
              <>
                <Link 
                  href="/dashboard"
                  className="flex items-center justify-between py-2 text-amber-400"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center gap-3">
                    <User size={18} strokeWidth={1.5} />
                    <span className="font-semibold text-sm">B2B Dashboard ({user.name || user.email})</span>
                  </div>
                  <span className="text-xs uppercase font-bold tracking-wider">View</span>
                </Link>
                <Link 
                  href="/dashboard/orders"
                  className="flex items-center justify-between py-2 text-white/90"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center gap-3">
                    <Package size={18} strokeWidth={1.5} />
                    <span className="font-semibold text-sm">Wholesale Orders</span>
                  </div>
                  <span className="text-xs text-white/50 uppercase font-bold tracking-wider">Orders</span>
                </Link>
                <button 
                  type="button"
                  className="flex items-center justify-between py-2 text-red-400"
                  onClick={async () => {
                    setIsMobileMenuOpen(false);
                    await signOut();
                    router.push("/");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <LogOut size={18} strokeWidth={1.5} />
                    <span className="font-semibold text-sm">Sign Out</span>
                  </div>
                </button>
              </>
            ) : (
              <Link 
                href="/login"
                className="flex items-center justify-between py-2 text-white/90"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center gap-3">
                  <User size={18} strokeWidth={1.5} />
                  <span className="font-semibold text-sm">Sign In / Register</span>
                </div>
                <span className="text-xs text-white/50 uppercase font-bold tracking-wider">Account</span>
              </Link>
            )}

            {/* Official WhatsApp Help Contact */}
            <a 
              href={getWhatsAppUrl(`Hi ${BUSINESS_PROFILE.name}, I need assistance with customer support.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between py-2 text-[#25D366]"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex items-center gap-3">
                <MessageCircle size={18} strokeWidth={1.5} />
                <span className="font-semibold text-sm">WhatsApp Help</span>
              </div>
              <span className="text-xs text-[#25D366]/70 uppercase font-bold tracking-wider">Chat Now</span>
            </a>
          </div>
        </nav>
      </div>


      {/* Auth Modal (Sign In / Create Account) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialView={authModalView}
      />

      {/* Location Modal ("Specify your location") */}
      <LocationModal
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
        onOpenSignIn={openSignIn}
      />

      {/* Language & Currency Modal ("Set language and currency") */}
      <LanguageCurrencyModal
        isOpen={isLanguageOpen}
        onClose={() => setIsLanguageOpen(false)}
      />
    </>
  );
}

export default function Header() {
  return (
    <Suspense fallback={
      <div className="w-full h-[106px] lg:h-[4.25rem] bg-[#0b1329] border-b border-white/10 shrink-0" />
    }>
      <HeaderContent />
    </Suspense>
  );
}
