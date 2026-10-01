"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MoreHorizontal,
  Edit,
  ExternalLink,
  ArrowUpCircle,
  ArrowDownCircle,
  Copy,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { B2BProductInput } from "@/types/b2b";
import { getBrandLogoUrl } from "@/lib/brand-logos";
import { LOW_STOCK_THRESHOLD } from "@/services/admin/inventory.service";
import { useAdminAuth } from "@/lib/AdminAuthContext";

interface ProductTableRowProps {
  product: B2BProductInput;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onTogglePublish: (product: B2BProductInput) => void;
  onToggleStorefrontVisibility?: (product: B2BProductInput) => void;
  onDuplicate: (product: B2BProductInput) => void;
  onDelete: (product: B2BProductInput) => void;
}

export default function ProductTableRow({
  product,
  selected,
  onSelect,
  onTogglePublish,
  onToggleStorefrontVisibility,
  onDuplicate,
  onDelete,
}: ProductTableRowProps) {
  const pathname = usePathname();
  const { can } = useAdminAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [storefrontBase, setStorefrontBase] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Determine storefront base URL (so admin website opens customer storefront correctly)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const { hostname, port, protocol } = window.location;
      if (port === "3001") {
        setStorefrontBase("http://localhost:3000");
      } else if (hostname.startsWith("admin.")) {
        const apex = hostname.replace(/^admin\./, "");
        setStorefrontBase(`${protocol}//${apex}${port ? `:${port}` : ""}`);
      } else {
        setStorefrontBase("");
      }
    }
  }, []);

  const isPublished = product.status === "published";
  const isHiddenFromStorefront = Boolean(
    product.isHiddenFromStorefront || (product as any).is_hidden_from_storefront
  );
  const effectiveMoq = Math.max(1, product.moq || 1);
  const availableStock = product.availableStock !== undefined ? Number(product.availableStock) : Number(product.stock);
  const completeMoqs = product.availableMoqs !== undefined 
    ? Number(product.availableMoqs) 
    : Math.floor(availableStock / effectiveMoq);
  const isLowStock = availableStock < LOW_STOCK_THRESHOLD;
  const thumbnail = product.images?.[0] || "/placeholder.jpg";
  const brandLogo = getBrandLogoUrl(product.brand);

  const isUnderAdminPath = Boolean(pathname?.startsWith("/admin"));
  const editHref = product.id === "draft_local_new"
    ? (isUnderAdminPath ? "/admin/products/new?resume=true" : "/products/new?resume=true")
    : (isUnderAdminPath ? `/admin/products/${product.id}/edit` : `/products/${product.id}/edit`);
  const storefrontHref = `${storefrontBase}/products/${product.slug}`;

  return (
    <tr className="border-b border-border/40 hover:bg-secondary/40 transition-colors group">
      {/* Checkbox */}
      <td className="px-1.5 py-1.5 w-8 text-center" style={{ width: "32px" }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(product.id, e.target.checked)}
          className="w-3.5 h-3.5 rounded border-border accent-foreground cursor-pointer align-middle"
          aria-label={`Select ${product.name}`}
        />
      </td>

      {/* Thumbnail (Canonical 3:4 aspect ratio) */}
      <td className="px-1 py-1.5 w-10 text-center" style={{ width: "40px" }}>
        <div className="w-7 h-[37px] aspect-[3/4] rounded-md overflow-hidden bg-secondary border border-border/40 shrink-0 p-0.5 mx-auto flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnail}
            alt={product.name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </div>
      </td>

      {/* Product ID */}
      <td className="px-1 py-1.5 w-[68px] text-center" style={{ width: "68px" }}>
        <span
          className="text-[9.5px] font-mono font-bold text-foreground bg-secondary/80 px-1 py-0.5 rounded border border-border/60 truncate block text-center max-w-full"
          title={product.productId || (product as any).product_id || ""}
        >
          {product.productId || (product as any).product_id || "—"}
        </span>
      </td>

      {/* Product Name */}
      <td className="px-2 py-1.5 min-w-0">
        <div className="min-w-0 pr-1 max-w-full">
          <p
            className={`text-xs font-bold truncate block ${!product.name ? "text-muted-foreground italic font-normal" : "text-foreground"}`}
            title={product.name}
          >
            {product.name || "(Untitled Draft)"}
          </p>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <span className="text-[8.5px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-secondary text-foreground/80 border border-border/50 shrink-0">
              {(product.designType || "").toUpperCase() === "MASTER COPY"
                ? "MASTER COPY"
                : "ORIGINAL"}
            </span>
            {product.isNew && (
              <span className="text-[8.5px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 shrink-0">
                New
              </span>
            )}
            {product.isHot && (
              <span className="text-[8.5px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 shrink-0">
                Hot
              </span>
            )}
            {(product as any).purchasePriceUpdated === false && (
              <span
                className="text-[8.5px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-700 shrink-0"
                title="Purchase Price not yet set"
              >
                $ Pending
              </span>
            )}
          </div>
        </div>
      </td>

      {/* SKU */}
      <td className="px-1 py-1.5 w-[60px]" style={{ width: "60px" }}>
        <span
          className="text-[10px] font-mono font-medium text-muted-foreground truncate block max-w-full"
          title={product.sku || ""}
        >
          {product.sku || "—"}
        </span>
      </td>

      {/* Brand */}
      <td className="px-1 py-1.5 w-[68px]" style={{ width: "68px" }}>
        <div className="flex items-center gap-1 min-w-0 max-w-full" title={product.brand || ""}>
          {brandLogo && (
            <div className="w-3.5 h-3.5 rounded bg-secondary/80 flex items-center justify-center shrink-0 overflow-hidden p-0.5 border border-border/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={brandLogo} alt="" className="w-full h-full object-contain" />
            </div>
          )}
          <span className="text-[10.5px] font-semibold text-foreground truncate block">
            {product.brand || "—"}
          </span>
        </div>
      </td>

      {/* Category */}
      <td className="px-1 py-1.5 w-[70px]" style={{ width: "70px" }}>
        <span
          className="text-[10.5px] text-muted-foreground truncate block max-w-full"
          title={product.categoryName || ""}
        >
          {product.categoryName || "—"}
        </span>
      </td>

      {/* Audience */}
      <td className="px-1 py-1.5 w-[58px]" style={{ width: "58px" }}>
        <span
          className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground truncate block max-w-full"
          title={product.audience || ""}
        >
          {product.audience || "—"}
        </span>
      </td>

      {/* Price */}
      <td className="px-1 py-1.5 w-[52px] text-right whitespace-nowrap" style={{ width: "52px" }}>
        <span className="text-xs font-bold tabular-nums text-foreground">
          {product.wholesalePrice !== undefined && product.wholesalePrice !== null && !isNaN(Number(product.wholesalePrice))
            ? `$${Number(product.wholesalePrice).toFixed(2)}`
            : "—"}
        </span>
      </td>

      {/* MOQ */}
      <td className="px-1 py-1.5 w-[46px] text-right whitespace-nowrap" style={{ width: "46px" }}>
        <span className="text-xs font-mono font-bold tabular-nums text-foreground">
          {effectiveMoq}
        </span>
        <span className="text-[9px] text-muted-foreground ml-0.5">pcs</span>
      </td>

      {/* Available Stock */}
      <td className="px-1 py-1.5 w-[60px] text-right whitespace-nowrap" style={{ width: "60px" }}>
        <div className="text-right leading-tight">
          <span
            className={`text-xs font-bold tabular-nums ${
              isLowStock
                ? "text-red-600 dark:text-red-400"
                : "text-foreground"
            }`}
          >
            {availableStock.toLocaleString()}
          </span>
          <span className="text-[9px] text-muted-foreground ml-0.5">pcs</span>
          {isLowStock && (
            <span className="block text-[8px] font-bold uppercase text-red-500 dark:text-red-400 leading-none mt-0.5">
              {availableStock === 0 ? "Out" : "Low"}
            </span>
          )}
        </div>
      </td>

      {/* Complete MOQs Available */}
      <td className="px-1 py-1.5 w-[62px] text-right whitespace-nowrap" style={{ width: "62px" }}>
        <span
          className={`inline-flex items-center px-1 py-0.2 rounded text-[9.5px] font-mono font-bold tabular-nums ${
            completeMoqs > 0
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/40"
          }`}
        >
          {completeMoqs} MOQ{completeMoqs !== 1 ? "s" : ""}
        </span>
      </td>

      {/* Status */}
      <td className="px-1 py-1.5 w-[64px]" style={{ width: "64px" }}>
        <div className="flex flex-col gap-0.5 items-start">
          <span
            className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[8.5px] font-bold uppercase tracking-wider ${
              isPublished
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
            }`}
          >
            {product.status}
          </span>
          {isHiddenFromStorefront && (
            <span
              className="inline-flex items-center px-1 py-0.2 rounded text-[7.5px] font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 whitespace-nowrap"
              title="Hidden from Storefront"
            >
              Hidden
            </span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td
        className={`px-1 py-1.5 w-[42px] text-center sticky right-0 bg-card group-hover:bg-secondary/40 transition-colors ${
          menuOpen ? "z-40" : "z-10"
        }`}
        style={{ width: "42px" }}
      >
        <div className="relative inline-block" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer mx-auto"
            aria-label={`Actions for ${product.name}`}
          >
            <MoreHorizontal size={14} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-7 z-50 w-48 rounded-xl border border-border/80 bg-card p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100 text-left">
              {can("product.edit") && (
                <Link
                  href={editHref}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <Edit size={13} />
                  Edit Product
                </Link>
              )}

              <a
                href={storefrontHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <ExternalLink size={13} />
                View Storefront
              </a>

              {onToggleStorefrontVisibility && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleStorefrontVisibility(product);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors w-full text-left cursor-pointer"
                >
                  {isHiddenFromStorefront ? (
                    <>
                      <Eye size={13} className="text-emerald-600" />
                      Show on Storefront
                    </>
                  ) : (
                    <>
                      <EyeOff size={13} className="text-amber-600" />
                      Hide from Storefront
                    </>
                  )}
                </button>
              )}

              {can("product.publish") && (
                <>
                  <div className="h-px bg-border/60 my-1" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onTogglePublish(product);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors w-full text-left cursor-pointer"
                  >
                    {isPublished ? (
                      <>
                        <ArrowDownCircle size={13} className="text-amber-600" />
                        Unpublish
                      </>
                    ) : (
                      <>
                        <ArrowUpCircle size={13} className="text-emerald-600" />
                        Publish
                      </>
                    )}
                  </button>
                </>
              )}

              {can("product.create") && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicate(product);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors w-full text-left"
                >
                  <Copy size={13} className="text-blue-600" />
                  Duplicate
                </button>
              )}

              {can("product.delete") && (
                <>
                  <div className="h-px bg-border/60 my-1" />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(product);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors w-full text-left"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
