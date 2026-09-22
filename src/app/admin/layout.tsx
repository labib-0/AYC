"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard,
  Package, 
  Tag, 
  Layers, 
  Warehouse,
  ShoppingBag,
  Users,
  FileText, 
  FileCheck, 
  Percent,
  Store, 
  Menu, 
  X, 
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  LogOut,
  UserCheck,
  PanelTop,
  Files,
  Settings,
} from "lucide-react";
import BrandName from "@/components/common/BrandName";
import { useAuth } from "@/lib/AuthContext";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", adminOriginHref: "/", icon: LayoutDashboard, exact: true },
  { label: "Products Catalog", href: "/admin/products", adminOriginHref: "/products", icon: Package },
  { label: "Category Taxonomy", href: "/admin/categories", adminOriginHref: "/categories", icon: Layers },
  { label: "Brands Directory", href: "/admin/brands", adminOriginHref: "/brands", icon: Tag },
  { label: "Inventory & Stock", href: "/admin/inventory", adminOriginHref: "/inventory", icon: Warehouse },
  { label: "Orders & Fulfillment", href: "/admin/orders", adminOriginHref: "/orders", icon: ShoppingBag },
  { label: "Customer Accounts", href: "/admin/customers", adminOriginHref: "/customers", icon: Users },
  { label: "B2B RFQs & Inquiries", href: "/admin/rfq", adminOriginHref: "/rfq", icon: FileText },
  { label: "Commercial Quotes", href: "/admin/quotations", adminOriginHref: "/quotations", icon: FileCheck },
  { label: "Commercial Documents", href: "/admin/documents", adminOriginHref: "/documents", icon: Files },
  { label: "Homepage & Banner", href: "/admin/homepage", adminOriginHref: "/homepage", icon: PanelTop },
  { label: "Promotions & Coupons", href: "/admin/promotions", adminOriginHref: "/promotions", icon: Percent },
  { label: "Settings", href: "/admin/settings", adminOriginHref: "/settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading, signIn, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(false);
  const [storefrontUrl, setStorefrontUrl] = useState("/");

  // Determine external storefront origin URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const { hostname, port, protocol } = window.location;
      if (port === "3001") {
        setStorefrontUrl("http://localhost:3000");
      } else if (hostname.startsWith("admin.")) {
        const apex = hostname.replace(/^admin\./, "");
        setStorefrontUrl(`${protocol}//${apex}${port ? `:${port}` : ""}`);
      } else {
        setStorefrontUrl("/");
      }
    }
  }, []);

  const isUnderAdminPath = pathname.startsWith("/admin");
  const addProductHref = isUnderAdminPath ? "/admin/products/new" : "/products/new";
  const inventoryHref = isUnderAdminPath ? "/admin/inventory" : "/inventory";
  const ordersHref = isUnderAdminPath ? "/admin/orders" : "/orders";

  const handleQuickAdminLogin = async () => {
    setAuthChecking(true);
    try {
      await signIn("admin@ayaanclothing.com", "admin123");
    } finally {
      setAuthChecking(false);
    }
  };

  // 1. Initial session resolution loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-secondary/30 text-foreground flex flex-col">
        <header className="h-14 bg-card border-b border-border/80 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-5 w-28 bg-secondary animate-pulse rounded" />
            <div className="h-4 w-16 bg-secondary animate-pulse rounded-full" />
          </div>
          <div className="h-7 w-24 bg-secondary animate-pulse rounded-full" />
        </header>
        <div className="flex-1 flex w-full max-w-[1600px] mx-auto">
          <aside className="hidden md:block w-64 border-r border-border/80 bg-card p-4 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 bg-secondary animate-pulse rounded-xl" />
            ))}
          </aside>
          <main className="flex-1 p-6 space-y-4">
            <div className="h-8 w-48 bg-secondary animate-pulse rounded-lg" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-secondary animate-pulse rounded-xl" />
              ))}
            </div>
            <div className="h-64 bg-secondary animate-pulse rounded-xl" />
          </main>
        </div>
      </div>
    );
  }

  // 2. Authentication Guard: Restrict access if not admin
  const isAdmin = user && user.role === "admin";
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-secondary/30 text-foreground flex flex-col">
        <header className="sticky top-0 z-40 bg-card border-b border-border/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <BrandName className="font-bold text-base sm:text-lg uppercase tracking-wider text-foreground" />
            <span className="text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              B2B Admin
            </span>
          </div>
          <a
            href={storefrontUrl}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border text-xs font-bold uppercase tracking-wider hover:bg-secondary transition-colors"
          >
            <Store size={13} />
            <span>Storefront</span>
          </a>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <ShieldAlert size={26} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Admin Authentication Required</h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Access to the wholesale catalog management panel is restricted to administrators. Please authenticate with administrator privileges.
              </p>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleQuickAdminLogin}
                disabled={authChecking}
                className="w-full h-10 rounded-xl bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {authChecking ? (
                  <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                ) : (
                  <>
                    <UserCheck size={14} />
                    <span>Sign In as Admin</span>
                  </>
                )}
              </button>

              <Link
                href={`/login?redirect=${encodeURIComponent(isUnderAdminPath ? "/admin/products" : "/products")}`}
                className="block w-full py-2.5 rounded-xl border border-border text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Use Another Account
              </Link>

              <a
                href={storefrontUrl}
                className="block text-xs font-semibold text-muted-foreground hover:text-foreground pt-1"
              >
                &larr; Return to Storefront
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated Admin Workspace Shell
  return (
    <div className="min-h-screen bg-secondary/30 text-foreground flex flex-col">
      {/* Top Admin Bar */}
      <header className="sticky top-0 z-40 bg-card border-b border-border/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-secondary text-foreground"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link href={isUnderAdminPath ? "/admin" : "/"} className="flex items-center gap-2.5" aria-label="Ayaan Clothing Admin">
            <BrandName className="font-bold text-base sm:text-lg uppercase tracking-wider text-foreground" />
            <span className="text-xs font-bold uppercase tracking-widest bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              B2B Admin
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={15} className="text-emerald-500" />
            <span className="font-medium">Admin Mode Active</span>
          </div>

          {/* User profile & Sign out */}
          <div className="flex items-center gap-2 pl-2 border-l border-border/80">
            <div className="w-7 h-7 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center shrink-0">
              {user.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="hidden lg:block text-left text-xs leading-tight">
              <p className="font-bold text-foreground truncate max-w-[120px]">{user.name || "Ayaan Admin"}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Admin</p>
            </div>
            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>

          <a
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border text-xs font-bold uppercase tracking-wider hover:bg-secondary transition-colors"
          >
            <Store size={13} />
            <span>Storefront</span>
          </a>
        </div>
      </header>

      {/* Main Admin Workspace (Sidebar + Content) */}
      <div className="flex-1 flex w-full max-w-[1600px] mx-auto">
        {/* Desktop Left Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-border/80 bg-card p-4 space-y-6 shrink-0">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-3 block mb-2">
              Management Suite
            </span>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const linkHref = isUnderAdminPath ? item.href : item.adminOriginHref;
                const isActive = item.exact 
                  ? pathname === item.href || pathname === item.adminOriginHref
                  : pathname === item.href ||
                    pathname === item.adminOriginHref ||
                    pathname.startsWith(item.href + "/") ||
                    pathname.startsWith(item.adminOriginHref + "/");

                return (
                  <Link
                    key={item.href}
                    href={linkHref}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      isActive
                        ? "bg-foreground text-background shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-border/60">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-3 block mb-2">
              Quick Shortcuts
            </span>
            <div className="space-y-1">
              <Link
                href={addProductHref}
                className="flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <span>+ Add New Product</span>
                <ChevronRight size={13} />
              </Link>
              <Link
                href={inventoryHref}
                className="flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <span>Stock Adjustments</span>
                <ChevronRight size={13} />
              </Link>
              <Link
                href={ordersHref}
                className="flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <span>Review Pending Orders</span>
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-ink/50 backdrop-blur-xs flex">
            <div className="w-64 bg-card h-full p-4 space-y-6 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <BrandName className="font-bold text-sm uppercase tracking-wider text-foreground" />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="space-y-1 flex-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const linkHref = isUnderAdminPath ? item.href : item.adminOriginHref;
                  const isActive = item.exact 
                    ? pathname === item.href || pathname === item.adminOriginHref
                    : pathname === item.href ||
                      pathname === item.adminOriginHref ||
                      pathname.startsWith(item.href + "/") ||
                      pathname.startsWith(item.adminOriginHref + "/");

                  return (
                    <Link
                      key={item.href}
                      href={linkHref}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider ${
                        isActive
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

