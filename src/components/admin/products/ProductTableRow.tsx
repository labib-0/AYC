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
} from "lucide-react";
import { B2BProductInput } from "@/types/b2b";
import { getBrandLogoUrl } from "@/lib/brand-logos";

interface ProductTableRowProps {
  product: B2BProductInput;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onTogglePublish: (product: B2BProductInput) => void;
  onDuplicate: (product: B2BProductInput) => void;
  onDelete: (product: B2BProductInput) => void;
}

export default function ProductTableRow({
  product,
  selected,
  onSelect,
  onTogglePublish,
  onDuplicate,
  onDelete,
}: ProductTableRowProps) {
  const pathname = usePathname();
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
  const isLowStock = product.stock < 100;
  const thumbnail = product.images?.[0] || "/placeholder.jpg";
  const brandLogo = getBrandLogoUrl(product.brand);

  const isUnderAdminPath = pathname.startsWith("/admin");
  const editHref = isUnderAdminPath
    ? `/admin/products/${product.id}/edit`
    : `/products/${product.id}/edit`;
  const storefrontHref = `${storefrontBase}/products/${product.slug}`;

  return (
    <tr className="border-b border-border/40 hover:bg-secondary/40 transition-colors group">
      {/* Checkbox */}
      <td className="px-3 py-2.5 w-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(product.id, e.target.checked)}
          className="w-3.5 h-3.5 rounded border-border accent-foreground cursor-pointer"
          aria-label={`Select ${product.name}`}
        />
      </td>

      {/* Thumbnail (3:4 aspect ratio) */}
      <td className="px-2 py-2 w-14">
        <div className="w-10 h-[53px] rounded-lg overflow-hidden bg-secondary border border-border/40 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnail}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </td>

      {/* Product Name */}
      <td className="px-3 py-2.5 min-w-[180px]">
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground truncate max-w-[220px]">
            {product.name}
          </p>
          {(product.isNew || product.isHot) && (
            <div className="flex items-center gap-1 mt-0.5">
              {product.isNew && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  New
                </span>
              )}
              {product.isHot && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                  Hot
                </span>
              )}
            </div>
          )}
        </div>
      </td>

      {/* SKU */}
      <td className="px-3 py-2.5">
        <span className="text-[11px] font-mono font-medium text-muted-foreground truncate block max-w-[120px]">
          {product.sku || "—"}
        </span>
      </td>

      {/* Brand */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 max-w-[120px]">
          {brandLogo && (
            <div className="w-4 h-4 rounded bg-secondary/80 flex items-center justify-center shrink-0 overflow-hidden p-0.5 border border-border/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={brandLogo} alt="" className="w-full h-full object-contain" />
            </div>
          )}
          <span className="text-xs font-semibold text-foreground truncate">
            {product.brand || "—"}
          </span>
        </div>
      </td>

      {/* Category */}
      <td className="px-3 py-2.5">
        <span className="text-xs text-muted-foreground truncate block max-w-[100px]">
          {product.categoryName || "—"}
        </span>
      </td>

      {/* Audience */}
      <td className="px-3 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {product.audience || "—"}
        </span>
      </td>

      {/* Price */}
      <td className="px-3 py-2.5 text-right">
        <span className="text-xs font-bold tabular-nums text-foreground">
          ${product.wholesalePrice.toFixed(2)}
        </span>
      </td>

      {/* Stock */}
      <td className="px-3 py-2.5 text-right">
        <span
          className={`text-xs font-bold tabular-nums ${
            isLowStock
              ? "text-red-600 dark:text-red-400"
              : "text-foreground"
          }`}
        >
          {product.stock.toLocaleString()}
        </span>
        {isLowStock && (
          <p className="text-[9px] font-bold uppercase text-red-500 dark:text-red-400 mt-0.5">
            Low
          </p>
        )}
      </td>

      {/* Status */}
      <td className="px-3 py-2.5">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isPublished
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
          }`}
        >
          {product.status}
        </span>
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5 w-12">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label={`Actions for ${product.name}`}
          >
            <MoreHorizontal size={15} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-xl z-30 py-1 animate-[scaleIn_100ms_ease]">
              <Link
                href={editHref}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <Edit size={13} />
                Edit Product
              </Link>

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

              <div className="h-px bg-border/60 my-1" />

              <button
                onClick={() => {
                  setMenuOpen(false);
                  onTogglePublish(product);
                }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors w-full text-left"
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
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.95) translateY(-4px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
      </td>
    </tr>
  );
}
