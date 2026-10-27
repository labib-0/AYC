"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MoreHorizontal,
  Edit,
  ExternalLink,
  ArrowUpCircle,
  ArrowDownCircle,
  Trash2,
  Eye,
  EyeOff,
  SlidersHorizontal,
  History,
  Ban,
  Package,
  Star,
  Pin,
  Loader2,
  FileText,
} from "lucide-react";
import { B2BProductInput } from "@/types/b2b";
import { getBrandLogoUrl } from "@/lib/brand-logos";
import { LOW_STOCK_THRESHOLD } from "@/services/admin/inventory.service";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import { getProductCanonicalUrl } from "@/config/business-profile";
import { TableDragHandle, TableMoveControls } from "@/components/admin/ordered-list";

interface ProductTableRowProps {
  product: B2BProductInput;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onTogglePublish: (product: B2BProductInput) => void;
  onToggleStorefrontVisibility?: (product: B2BProductInput) => void;
  onToggleFeatured?: (product: B2BProductInput) => void;
  isPinLoading?: boolean;
  onDelete: (product: B2BProductInput) => void;
  onAdjustStock?: (product: B2BProductInput) => void;
  onViewStockHistory?: (product: B2BProductInput) => void;
  onMarkSoldOut?: (product: B2BProductInput) => void;
  onViewOfferSheet?: (product: B2BProductInput) => void;
  globalIndex?: number;
  localIndex?: number;
  showReorderControls?: boolean;
  isReorderDisabled?: boolean;
  disabledReason?: string;
  onPointerDown?: (e: React.PointerEvent, globalIndex: number, localIndex: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  rowVisualClass?: string;
  initialMenuOpen?: boolean;
}

export default function ProductTableRow({
  product,
  selected,
  onSelect,
  onTogglePublish,
  onToggleStorefrontVisibility,
  onToggleFeatured,
  isPinLoading = false,
  onDelete,
  onAdjustStock,
  onViewStockHistory,
  onMarkSoldOut,
  onViewOfferSheet,
  globalIndex = 0,
  localIndex = 0,
  showReorderControls = false,
  isReorderDisabled = false,
  disabledReason = "Reordering is disabled while search or filters are active.",
  onPointerDown,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  rowVisualClass = "",
  initialMenuOpen = false,
}: ProductTableRowProps) {
  const pathname = usePathname();
  const { can, isSuperAdmin } = useAdminAuth();
  const canReorder = can("product.edit") || can("product.manage");
  const canAdjustStock = isSuperAdmin || can("inventory.adjust") || can("product.edit");
  const canViewHistory = isSuperAdmin || can("inventory.audit") || can("inventory.view") || can("product.view");
  const [menuOpen, setMenuOpen] = useState(initialMenuOpen);
  const [storefrontBase, setStorefrontBase] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current || typeof window === "undefined") return;
    const triggerRect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Check if trigger button has scrolled offscreen
    if (triggerRect.bottom < 0 || triggerRect.top > viewportHeight) {
      setMenuOpen(false);
      return;
    }

    const GAP = 4;
    const PADDING = 8;
    const MENU_WIDTH = 192; // w-48 = 192px
    const menuEl = menuRef.current;
    const estimatedHeight = menuEl && menuEl.offsetHeight > 0 ? menuEl.offsetHeight : 360;

    const spaceBelow = viewportHeight - triggerRect.bottom - GAP - PADDING;
    const spaceAbove = triggerRect.top - GAP - PADDING;

    const shouldOpenUp = spaceBelow < Math.min(estimatedHeight, 260) && spaceAbove > spaceBelow;
    const chosenPlacement = shouldOpenUp ? "top" : "bottom";
    setPlacement(chosenPlacement);

    let top: number | undefined;
    let bottom: number | undefined;
    let maxHeight: number;

    if (shouldOpenUp) {
      bottom = Math.round(viewportHeight - triggerRect.top + GAP);
      maxHeight = Math.min(estimatedHeight, Math.max(120, Math.floor(spaceAbove)));
    } else {
      top = Math.round(triggerRect.bottom + GAP);
      maxHeight = Math.min(estimatedHeight, Math.max(120, Math.floor(spaceBelow)));
    }

    // Horizontal positioning: align to right of trigger, or flip/clamp if near viewport boundary
    let right: number | undefined = Math.round(viewportWidth - triggerRect.right);
    let left: number | undefined;

    if (triggerRect.right - MENU_WIDTH < PADDING) {
      left = Math.max(PADDING, Math.round(triggerRect.left));
      right = undefined;
    } else if (right < PADDING) {
      right = PADDING;
    }

    const style: React.CSSProperties = {
      position: "fixed",
      width: `${MENU_WIDTH}px`,
      maxHeight: `${maxHeight}px`,
      zIndex: 9999,
    };

    if (top !== undefined) style.top = `${top}px`;
    if (bottom !== undefined) style.bottom = `${bottom}px`;
    if (right !== undefined) style.right = `${right}px`;
    if (left !== undefined) style.left = `${left}px`;

    setMenuStyle(style);
  }, []);

  // Recalculate position on open, scroll, or resize
  useEffect(() => {
    if (!menuOpen) return;
    updatePosition();
    const rafId = requestAnimationFrame(() => {
      updatePosition();
    });

    const handleScroll = () => {
      updatePosition();
    };
    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [menuOpen, updatePosition]);

  // Outside click and Escape key dismissal
  useEffect(() => {
    if (!menuOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      setMenuOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
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
  const isPreorder = Boolean(product.isPreorder || (product as any).is_preorder);
  const isSoldOut = Boolean(product.isSoldOut || (product as any).is_sold_out);
  const effectiveMoq = Math.max(1, product.moq || 1);
  const availableStock = product.availableStock !== undefined ? Number(product.availableStock) : Number(product.stock);
  const completeMoqs = product.availableMoqs !== undefined 
    ? Number(product.availableMoqs) 
    : Math.floor(availableStock / effectiveMoq);
  const isLowStock = availableStock < LOW_STOCK_THRESHOLD;
  const thumbnail = product.images?.[0] || "/placeholder.jpg";
  const brandLogo = getBrandLogoUrl(product.brand);

  // Authoritative design type: "Original", "Master Copy", or neutral fallback "—"
  const rawDesignType = product.designType || (product as any).design_type || null;
  const designTypeUpper = rawDesignType ? String(rawDesignType).trim().toUpperCase() : "";
  const isMasterCopy =
    designTypeUpper === "MASTER COPY" ||
    designTypeUpper === "MASTER_COPY" ||
    designTypeUpper === "REPLICA" ||
    designTypeUpper === "MC";
  const isOriginal = designTypeUpper === "ORIGINAL";
  const designTypeDisplay = isMasterCopy
    ? "Master Copy"
    : isOriginal
    ? "Original"
    : (rawDesignType ? String(rawDesignType).trim() : "—");

  const featUntil = product.featuredUntil || (product as any).featured_until;
  const [isFeaturedExpired, setIsFeaturedExpired] = useState(false);
  useEffect(() => {
    if (featUntil) {
      setIsFeaturedExpired(new Date(featUntil).getTime() <= Date.now());
    } else {
      setIsFeaturedExpired(false);
    }
  }, [featUntil]);
  const isPinned = Boolean(
    (product as any).is_pinned ??
    (product as any).isPinned ??
    product.isFeatured ??
    (product as any).is_featured ??
    (product as any).featured
  ) && !isFeaturedExpired;

  const isUnderAdminPath = Boolean(pathname?.startsWith("/ayc") || pathname?.startsWith("/admin"));
  const editHref = product.id === "draft_local_new"
    ? (isUnderAdminPath ? "/ayc/products/new?resume=true" : "/products/new?resume=true")
    : (isUnderAdminPath ? `/ayc/products/${product.id}/edit` : `/products/${product.id}/edit`);
  const storefrontHref = getProductCanonicalUrl(product);

  return (
    <tr
      data-ordered-row={showReorderControls ? "" : undefined}
      data-global-index={globalIndex}
      data-index={localIndex}
      className={`border-b border-border/40 hover:bg-secondary/40 transition-colors group ${showReorderControls ? rowVisualClass : ""}`}
    >
      {/* 0. Reorder Drag Handle */}
      <td className="px-1.5 py-2.5 sm:py-3 w-9 text-center align-middle" style={{ width: "36px" }}>
        {showReorderControls && canReorder ? (
          <TableDragHandle
            globalIndex={globalIndex}
            localIndex={localIndex}
            itemTitle={product.name}
            disabled={isReorderDisabled}
            disabledReason={disabledReason}
            onPointerDown={onPointerDown || (() => {})}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
        ) : null}
      </td>

      {/* Checkbox */}
      <td className="px-1.5 py-2.5 sm:py-3 w-[34px] text-center align-middle" style={{ width: "34px" }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(product.id, e.target.checked)}
          className="w-3.5 h-3.5 rounded border-border accent-foreground cursor-pointer align-middle"
          aria-label={`Select ${product.name}`}
        />
      </td>

      {/* Thumbnail (Canonical 3:4 aspect ratio, clean presentation without decorative border or background card) */}
      <td className="px-1.5 py-2.5 sm:py-3 w-[60px] text-center align-middle" style={{ width: "60px" }}>
        <div className="w-12 h-16 aspect-[3/4] mx-auto flex items-center justify-center shrink-0">
          {thumbnail && thumbnail !== "/placeholder.jpg" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt={product.name}
              className="w-full h-full object-contain pointer-events-none"
              loading="lazy"
            />
          ) : (
            <Package size={22} className="text-muted-foreground/35 pointer-events-none" />
          )}
        </div>
      </td>

      {/* Product ID */}
      <td className="px-2 py-2.5 sm:py-3 w-[86px] text-center align-middle" style={{ width: "86px" }}>
        <span
          className="text-[10px] font-mono font-bold text-foreground bg-secondary/80 px-1.5 py-0.5 rounded border border-border/60 truncate block text-center max-w-full select-all"
          title={product.productId || (product as any).product_id || "Product ID"}
        >
          {product.productId || (product as any).product_id || "—"}
        </span>
      </td>

      {/* Product Name */}
      <td className="px-3 py-2.5 sm:py-3 w-[250px] align-middle" style={{ width: "250px" }}>
        <div className="min-w-0 max-w-full flex items-center gap-1.5 flex-wrap">
          {isPinned && (
            <span
              data-testid="pinned-tag"
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-primary/10 text-primary border border-primary/20 shrink-0"
              title="Pinned"
              role="status"
            >
              Pinned
            </span>
          )}
          <p
            className={`text-xs font-bold leading-snug line-clamp-2 block ${!product.name ? "text-muted-foreground italic font-normal" : "text-foreground"}`}
            title={product.name}
          >
            {product.name || "(Untitled Draft)"}
          </p>
        </div>
      </td>

      {/* Design Type */}
      <td className="px-2.5 py-2.5 sm:py-3 w-[100px] align-middle" style={{ width: "100px" }}>
        {designTypeDisplay !== "—" ? (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
              isMasterCopy
                ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/70 dark:border-purple-800/60"
                : "bg-secondary text-foreground/90 border border-border/60"
            }`}
            title={`Design Type: ${designTypeDisplay}`}
          >
            {designTypeDisplay}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/60 select-none block" title="Design type not specified">
            —
          </span>
        )}
      </td>

      {/* SKU */}
      <td className="px-2.5 py-2.5 sm:py-3 w-[125px] align-middle" style={{ width: "125px" }}>
        <span
          className="text-xs font-mono font-medium text-muted-foreground truncate block max-w-full select-all"
          title={product.sku || ""}
        >
          {product.sku || "—"}
        </span>
      </td>

      {/* Brand */}
      <td className="px-2.5 py-2.5 sm:py-3 w-[115px] align-middle" style={{ width: "115px" }}>
        <div className="flex items-center gap-1.5 min-w-0 max-w-full" title={product.brand || ""}>
          {brandLogo && (
            <div className="w-4 h-4 shrink-0 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={brandLogo} alt="" className="w-full h-full object-contain" />
            </div>
          )}
          <span className="text-xs font-semibold text-foreground truncate block">
            {product.brand || "—"}
          </span>
        </div>
      </td>

      {/* Category */}
      <td className="px-2.5 py-2.5 sm:py-3 w-[115px] align-middle" style={{ width: "115px" }}>
        <span
          className="text-xs text-muted-foreground truncate block max-w-full"
          title={product.categoryName || ""}
        >
          {product.categoryName || "—"}
        </span>
      </td>

      {/* Audience */}
      <td className="px-2 py-2.5 sm:py-3 w-[75px] align-middle" style={{ width: "75px" }}>
        <span
          className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate block max-w-full"
          title={product.audience || ""}
        >
          {product.audience || "—"}
        </span>
      </td>

      {/* Price */}
      <td className="px-2 py-2.5 sm:py-3 w-[72px] text-right whitespace-nowrap align-middle" style={{ width: "72px" }}>
        <span className="text-xs font-bold tabular-nums text-foreground">
          {product.wholesalePrice !== undefined && product.wholesalePrice !== null && !isNaN(Number(product.wholesalePrice))
            ? `$${Number(product.wholesalePrice).toFixed(2)}`
            : "—"}
        </span>
      </td>

      {/* MOQ */}
      <td className="px-2 py-2.5 sm:py-3 w-[65px] text-right whitespace-nowrap align-middle" style={{ width: "65px" }}>
        <span className="text-xs font-mono font-bold tabular-nums text-foreground">
          {effectiveMoq}
        </span>
        <span className="text-[10px] text-muted-foreground ml-0.5">pcs</span>
      </td>

      {/* Available Stock */}
      <td className="px-2 py-2.5 sm:py-3 w-[84px] text-right whitespace-nowrap align-middle" style={{ width: "84px" }}>
        <div className="text-right leading-tight">
          {canAdjustStock && onAdjustStock ? (
            <button
              type="button"
              onClick={() => onAdjustStock(product)}
              className={`text-xs font-bold tabular-nums hover:underline cursor-pointer inline-flex items-center justify-end ${
                isLowStock
                  ? "text-red-600 dark:text-red-400"
                  : "text-foreground hover:text-primary"
              }`}
              title="Click to adjust stock"
            >
              {availableStock.toLocaleString()}
            </button>
          ) : (
            <span
              className={`text-xs font-bold tabular-nums ${
                isLowStock
                  ? "text-red-600 dark:text-red-400"
                  : "text-foreground"
              }`}
            >
              {availableStock.toLocaleString()}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground ml-0.5">pcs</span>
          {isLowStock && (
            <span className="block text-[8.5px] font-bold uppercase text-red-500 dark:text-red-400 leading-none mt-1">
              {isPreorder ? "Pre-Order" : (availableStock === 0 ? "Out" : "Low")}
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-2.5 py-2.5 sm:py-3 w-[100px] align-middle" style={{ width: "100px" }}>
        <div className="flex flex-col gap-1 items-start">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
              isPublished
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
            }`}
          >
            {product.status}
          </span>
          {isSoldOut && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-200 whitespace-nowrap"
              title="Sold Out"
            >
              Sold Out
            </span>
          )}
          {isPreorder && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-300 dark:border-purple-700 whitespace-nowrap"
              title={product.estimatedDeliveryDate ? `Pre-Order (Est: ${product.estimatedDeliveryDate})` : "Pre-Order"}
            >
              Pre-Order
            </span>
          )}
          {isHiddenFromStorefront && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 whitespace-nowrap"
              title="Hidden from Storefront"
            >
              Hidden
            </span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td
        className={`px-2 py-2.5 sm:py-3 w-[98px] text-center align-middle sticky right-0 bg-card group-hover:bg-secondary/40 transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.04)] ${
          menuOpen ? "z-40" : "z-10"
        }`}
        style={{ width: "98px" }}
      >
        <div className="flex items-center justify-center gap-1.5">
          {showReorderControls && canReorder && onMoveUp && onMoveDown && (
            <TableMoveControls
              globalIndex={globalIndex}
              isFirst={isFirst}
              isLast={isLast}
              disabled={isReorderDisabled}
              disabledReason={disabledReason}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              itemTitle={product.name}
            />
          )}

          <div className="relative inline-block">
            <button
              ref={buttonRef}
              type="button"
              id={`btn-product-actions-${product.id}`}
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-7 h-7 rounded-lg border border-border/60 bg-card hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer mx-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
              aria-label={`Actions for ${product.name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? `menu-product-actions-${product.id}` : undefined}
              title="More actions"
            >
              <MoreHorizontal size={15} />
            </button>

          {menuOpen && (() => {
            const menuElement = (
              <div
                ref={menuRef}
                id={`menu-product-actions-${product.id}`}
                role="menu"
                aria-label={`Actions for ${product.name}`}
                style={mounted && typeof document !== "undefined" ? menuStyle : undefined}
                data-placement={placement}
                data-testid={`menu-product-actions-${product.id}`}
                className={`w-48 rounded-xl border border-border/80 bg-card p-1 shadow-xl text-left overflow-y-auto subtle-scrollbar ${
                  mounted && typeof document !== "undefined"
                    ? "animate-in fade-in zoom-in-95 duration-100"
                    : "absolute right-0 top-8 z-50"
                }`}
              >
                {can("product.edit") && (
                  <Link
                    href={editHref}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Edit size={13} />
                    Edit Product
                  </Link>
                )}

                {canAdjustStock && onAdjustStock && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onAdjustStock(product);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors w-full text-left cursor-pointer"
                  >
                    <SlidersHorizontal size={13} className="text-primary" />
                    Adjust Stock
                  </button>
                )}

                {canViewHistory && onViewStockHistory && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onViewStockHistory(product);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors w-full text-left cursor-pointer"
                  >
                    <History size={13} className="text-muted-foreground" />
                    Stock Movement History
                  </button>
                )}

                {canAdjustStock && onMarkSoldOut && (
                  <button
                    type="button"
                    role="menuitem"
                    id={`btn-mark-sold-out-${product.id}`}
                    onClick={() => {
                      setMenuOpen(false);
                      onMarkSoldOut(product);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors w-full text-left cursor-pointer"
                  >
                    <Ban size={13} />
                    Mark as Sold Out
                  </button>
                )}

                {onViewOfferSheet && (
                  <button
                    type="button"
                    role="menuitem"
                    id={`btn-offer-sheet-${product.id}`}
                    onClick={() => {
                      setMenuOpen(false);
                      onViewOfferSheet(product);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors w-full text-left cursor-pointer"
                    title={`View Offer Sheet for ${product.name || product.productId}`}
                  >
                    <FileText size={13} className="text-primary" />
                    Offer Sheet
                  </button>
                )}

                {isPublished && !isHiddenFromStorefront ? (
                  <a
                    href={storefrontHref}
                    role="menuitem"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <ExternalLink size={13} />
                    View Storefront
                  </a>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      if (!isPublished) {
                        alert(`Product "${product.name || product.productId}" is in Draft status and is not published on the public storefront. Publish the product first to view it live.`);
                      } else {
                        alert(`Product "${product.name || product.productId}" is currently hidden from the public storefront. Click "Show on Storefront" to make it visible.`);
                      }
                    }}
                    className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary transition-colors w-full text-left cursor-pointer opacity-75"
                    title={!isPublished ? "Unpublished draft is not visible on the public storefront." : "Product is hidden from storefront."}
                  >
                    <span className="flex items-center gap-2.5">
                      <ExternalLink size={13} />
                      View Storefront
                    </span>
                    <span className="text-[9.5px] font-normal px-1 py-0.2 rounded bg-secondary text-amber-600 dark:text-amber-400 border border-border/50">
                      {!isPublished ? "Draft" : "Hidden"}
                    </span>
                  </button>
                )}

                {onToggleStorefrontVisibility && (
                  <button
                    type="button"
                    role="menuitem"
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

                {onToggleFeatured && (
                  <button
                    type="button"
                    role="menuitem"
                    id={`btn-toggle-featured-${product.id}`}
                    data-testid={`btn-toggle-pin-${product.id}`}
                    disabled={isPinLoading}
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleFeatured(product);
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors w-full text-left cursor-pointer ${
                      isPinLoading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    title={isPinned ? "Unpin" : "Pin"}
                  >
                    {isPinLoading ? (
                      <Loader2 size={13} className="animate-spin text-muted-foreground shrink-0" />
                    ) : (
                      <Pin
                        size={13}
                        className={isPinned ? "text-primary fill-primary shrink-0" : "text-muted-foreground shrink-0"}
                      />
                    )}
                    <span>{isPinLoading ? "Updating..." : (isPinned ? "Unpin" : "Pin")}</span>
                  </button>
                )}

                {can("product.publish") && (
                  <>
                    <div className="h-px bg-border/60 my-1" />
                    <button
                      type="button"
                      role="menuitem"
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

                {can("product.delete") && (
                  <>
                    <div className="h-px bg-border/60 my-1" />
                    <button
                      type="button"
                      role="menuitem"
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
            );

            return mounted && typeof document !== "undefined"
              ? createPortal(menuElement, document.body)
              : menuElement;
          })()}
        </div>
        </div>
      </td>
    </tr>
  );
}
