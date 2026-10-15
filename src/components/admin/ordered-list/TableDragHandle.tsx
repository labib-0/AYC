"use client";

import React from "react";
import { GripVertical } from "lucide-react";

export interface TableDragHandleProps {
  globalIndex: number;
  localIndex: number;
  itemTitle?: string;
  disabled?: boolean;
  disabledReason?: string;
  onPointerDown: (e: React.PointerEvent, globalIndex: number, localIndex: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  className?: string;
}

export function TableDragHandle({
  globalIndex,
  localIndex,
  itemTitle,
  disabled = false,
  disabledReason = "Reordering is disabled while search or filters are active.",
  onPointerDown,
  onMoveUp,
  onMoveDown,
  className = "",
}: TableDragHandleProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (onMoveUp) onMoveUp();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (onMoveDown) onMoveDown();
    }
  };

  const label = disabled
    ? disabledReason
    : `Drag handle for ${itemTitle || "item"}. Current position ${globalIndex + 1}. Press Up or Down arrow key to reorder.`;

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        if (!disabled) {
          onPointerDown(e, globalIndex, localIndex);
        }
      }}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={label}
      title={disabled ? disabledReason : "Drag to reorder (or use Up/Down arrow keys)"}
      tabIndex={disabled ? -1 : 0}
      className={`inline-flex items-center justify-center w-7.5 h-7.5 rounded-lg transition-colors touch-none ${
        disabled
          ? "opacity-25 cursor-not-allowed text-muted-foreground"
          : "cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-secondary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      } ${className}`}
    >
      <GripVertical size={16} />
    </button>
  );
}
