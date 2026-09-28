import React from "react";

interface CommerceSectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * CommerceSectionHeader
 * Compact, unified section header for B2B product commerce modules.
 * Communicates clear UI module boundaries rather than editorial article headings.
 */
export default function CommerceSectionHeader({
  title,
  icon,
  subtitle,
  badge,
  action,
  className = "",
}: CommerceSectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-2 pb-1 ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-primary shrink-0">{icon}</span>}
        <h2 className="text-[12px] sm:text-[13px] font-display font-bold uppercase tracking-wider text-foreground truncate">
          {title}
        </h2>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {subtitle && (
          <span className="text-[11px] sm:text-[11.5px] font-sans text-muted-foreground/80 hidden sm:inline">
            {subtitle}
          </span>
        )}
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
