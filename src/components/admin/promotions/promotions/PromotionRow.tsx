/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import { 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  ImageIcon, 
  PanelTop
} from "lucide-react";
import { PromotionRecord } from "@/services/admin/promotion.service";

export interface PromotionRowProps {
  promotion: PromotionRecord;
  onEdit: (promotion: PromotionRecord) => void;
  onToggleActive: (promotion: PromotionRecord) => void;
  onDelete: (promotion: PromotionRecord) => void;
}

const TYPE_LABELS: Record<string, string> = {
  hero_banner: "Hero Banner",
  top_banner: "Top Banner",
  sidebar_banner: "Sidebar Banner",
  sale_event: "Sale Event",
};

export default function PromotionRow({
  promotion,
  onEdit,
  onToggleActive,
  onDelete,
}: PromotionRowProps) {
  const isHomepageBanner = (promotion.type === "hero_banner" || promotion.type === "top_banner") && promotion.is_active;

  return (
    <tr className="border-b border-border/60 hover:bg-secondary/20 transition-colors">
      {/* 1. Thumbnail Image */}
      <td className="py-3 px-4">
        <div className="w-16 h-10 rounded-lg overflow-hidden bg-secondary border border-border/80 flex items-center justify-center shrink-0 relative">
          {promotion.image_url ? (
            <img
              src={promotion.image_url}
              alt={promotion.title}
              className="w-full h-full object-cover object-center"
              loading="lazy"
            />
          ) : (
            <ImageIcon size={18} className="text-muted-foreground/50" />
          )}
        </div>
      </td>

      {/* 2. Promotion Title & Subtitle */}
      <td className="py-3 px-4 max-w-xs sm:max-w-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-foreground line-clamp-1">
              {promotion.title}
            </span>
            {isHomepageBanner && (
              <Link
                href="/admin/homepage"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                title="Active homepage banner — Click to manage dedicated banner settings"
              >
                <PanelTop size={10} />
                <span>Active Homepage Banner</span>
              </Link>
            )}
          </div>
          {promotion.subtitle && (
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {promotion.subtitle}
            </p>
          )}
          {promotion.button_target && (
            <span className="text-[10px] font-mono text-muted-foreground/80 block">
              Target: {promotion.button_target}
            </span>
          )}
        </div>
      </td>

      {/* 3. Type */}
      <td className="py-3 px-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-secondary text-foreground border border-border/60">
          {TYPE_LABELS[promotion.type] || promotion.type}
        </span>
      </td>

      {/* 4. Discount */}
      <td className="py-3 px-4 whitespace-nowrap text-xs font-semibold text-foreground">
        {promotion.discount_percentage ? (
          <span className="text-emerald-600 dark:text-emerald-400">
            {promotion.discount_percentage}% OFF
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* 5. Status */}
      <td className="py-3 px-4 whitespace-nowrap">
        <button
          type="button"
          onClick={() => onToggleActive(promotion)}
          className="inline-flex items-center gap-1.5 cursor-pointer focus:outline-none"
          title={`Click to ${promotion.is_active ? "deactivate" : "activate"}`}
        >
          {promotion.is_active ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={11} />
              <span>Active</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <XCircle size={11} />
              <span>Inactive</span>
            </span>
          )}
        </button>
      </td>

      {/* 6. Sort Order */}
      <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-muted-foreground">
        #{promotion.sort_order ?? 0}
      </td>

      {/* 7. Actions */}
      <td className="py-3 px-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(promotion)}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Edit promotion"
          >
            <Edit2 size={13} />
          </button>

          <button
            type="button"
            onClick={() => onDelete(promotion)}
            className="p-1.5 rounded-lg border border-red-500/20 bg-card hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
            title="Delete promotion"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}
