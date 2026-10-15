"use client";

import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export interface TableMoveControlsProps {
  globalIndex: number;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  itemTitle?: string;
  className?: string;
}

export function TableMoveControls({
  globalIndex,
  isFirst,
  isLast,
  disabled = false,
  disabledReason = "Reordering is disabled while search or filters are active.",
  onMoveUp,
  onMoveDown,
  itemTitle,
  className = "",
}: TableMoveControlsProps) {
  const upDisabled = disabled || isFirst;
  const downDisabled = disabled || isLast;

  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`}>
      {/* Move Up Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!upDisabled) onMoveUp();
        }}
        disabled={upDisabled}
        aria-disabled={upDisabled}
        title={
          disabled
            ? disabledReason
            : isFirst
            ? "Already at top position"
            : `Move ${itemTitle || "item"} up to position ${globalIndex}`
        }
        aria-label={
          disabled
            ? disabledReason
            : isFirst
            ? "Already at top position"
            : `Move ${itemTitle || "item"} up to position ${globalIndex}`
        }
        className="w-7 h-7 rounded-lg border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-25 disabled:pointer-events-none transition-all flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
      >
        <ArrowUp size={13} />
      </button>

      {/* Move Down Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!downDisabled) onMoveDown();
        }}
        disabled={downDisabled}
        aria-disabled={downDisabled}
        title={
          disabled
            ? disabledReason
            : isLast
            ? "Already at bottom position"
            : `Move ${itemTitle || "item"} down to position ${globalIndex + 2}`
        }
        aria-label={
          disabled
            ? disabledReason
            : isLast
            ? "Already at bottom position"
            : `Move ${itemTitle || "item"} down to position ${globalIndex + 2}`
        }
        className="w-7 h-7 rounded-lg border border-border/60 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-25 disabled:pointer-events-none transition-all flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
      >
        <ArrowDown size={13} />
      </button>
    </div>
  );
}
