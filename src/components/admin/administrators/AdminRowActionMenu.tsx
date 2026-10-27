"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Layers, KeyRound, Power, Trash2 } from "lucide-react";
import { AdminUserRecord } from "@/services/admin/admin-user.service";

export interface AdminRowActionMenuProps {
  admin: AdminUserRecord;
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  isSelf: boolean;
  isSuper: boolean;
  isCurrentUserSuperAdmin: boolean;
  isToggling?: boolean;
  onAssignRoles: (admin: AdminUserRecord) => void;
  onResetPassword: (admin: AdminUserRecord) => void;
  onToggleStatus: (admin: AdminUserRecord) => void;
  onDelete: (admin: AdminUserRecord) => void;
  initialOpen?: boolean;
}

export default function AdminRowActionMenu({
  admin,
  isOpen: controlledIsOpen,
  onToggle: controlledOnToggle,
  onClose: controlledOnClose,
  isSelf,
  isSuper,
  isCurrentUserSuperAdmin,
  isToggling = false,
  onAssignRoles,
  onResetPassword,
  onToggleStatus,
  onDelete,
  initialOpen = false,
}: AdminRowActionMenuProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(initialOpen);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    if (isControlled) {
      controlledOnToggle?.();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  const handleClose = useCallback(() => {
    if (isControlled) {
      controlledOnClose?.();
    } else {
      setInternalIsOpen(false);
    }
  }, [isControlled, controlledOnClose]);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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

    // Check if trigger button has scrolled offscreen vertically
    if (triggerRect.bottom < -40 || triggerRect.top > viewportHeight + 40) {
      handleClose();
      return;
    }

    const GAP = 4;
    const PADDING = 8;
    const MENU_WIDTH = 200; // 200px width for administrator actions menu
    const menuEl = menuRef.current;
    const estimatedHeight = menuEl && menuEl.offsetHeight > 0 ? menuEl.offsetHeight : 165;

    const spaceBelow = viewportHeight - triggerRect.bottom - GAP - PADDING;
    const spaceAbove = triggerRect.top - GAP - PADDING;

    // Flip to top if space below is insufficient and space above is greater
    const shouldOpenUp = spaceBelow < Math.min(estimatedHeight, 170) && spaceAbove > spaceBelow;
    const chosenPlacement = shouldOpenUp ? "top" : "bottom";
    setPlacement(chosenPlacement);

    let top: number | undefined;
    let bottom: number | undefined;
    let maxHeight: number;

    if (shouldOpenUp) {
      bottom = Math.round(viewportHeight - triggerRect.top + GAP);
      maxHeight = Math.min(estimatedHeight, Math.max(100, Math.floor(spaceAbove)));
    } else {
      top = Math.round(triggerRect.bottom + GAP);
      maxHeight = Math.min(estimatedHeight, Math.max(100, Math.floor(spaceBelow)));
    }

    // Horizontal positioning: align to right edge of trigger, or clamp if near viewport edges
    const effectiveWidth = Math.min(MENU_WIDTH, viewportWidth - 2 * PADDING);
    let right: number | undefined = Math.round(viewportWidth - triggerRect.right);
    let left: number | undefined;

    if (triggerRect.right > viewportWidth - PADDING) {
      // Trigger is near or past right viewport boundary: clamp to right
      right = PADDING;
      left = undefined;
    } else if (triggerRect.left < PADDING || triggerRect.right - effectiveWidth < PADDING) {
      // Align left to trigger or clamp to left edge if right-aligning would push offscreen
      left = Math.max(PADDING, Math.min(Math.round(triggerRect.left), viewportWidth - effectiveWidth - PADDING));
      right = undefined;
    } else if (right < PADDING) {
      right = PADDING;
    }

    const style: React.CSSProperties = {
      position: "fixed",
      width: `${effectiveWidth}px`,
      maxHeight: `${maxHeight}px`,
      zIndex: 9999,
      overflowY: "auto",
    };

    if (top !== undefined) style.top = `${top}px`;
    if (bottom !== undefined) style.bottom = `${bottom}px`;
    if (right !== undefined) style.right = `${right}px`;
    if (left !== undefined) style.left = `${left}px`;

    setMenuStyle(style);
  }, [handleClose]);

  // Recalculate position on open, scroll, or resize
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, updatePosition]);

  // Outside click and Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      handleClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  const menuElement = (
    <div
      ref={menuRef}
      id={`admin-actions-menu-${admin.id}`}
      role="menu"
      aria-label={`Actions for ${admin.name}`}
      style={mounted && typeof document !== "undefined" ? menuStyle : undefined}
      data-placement={placement}
      data-testid={`admin-actions-menu-${admin.id}`}
      className={`rounded-xl border border-border/80 bg-card p-1.5 shadow-xl text-left space-y-0.5 subtle-scrollbar ${
        mounted && typeof document !== "undefined"
          ? "animate-in fade-in zoom-in-95 duration-100"
          : "absolute right-0 mt-1 w-48 z-50"
      }`}
    >
      {/* Assign RBAC Roles */}
      <button
        type="button"
        role="menuitem"
        data-testid={`admin-action-assign-roles-${admin.id}`}
        onClick={() => {
          handleClose();
          onAssignRoles(admin);
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
      >
        <Layers size={13} className="text-muted-foreground shrink-0" />
        <span>Assign RBAC Roles</span>
      </button>

      {/* Reset Password */}
      <button
        type="button"
        role="menuitem"
        data-testid={`admin-action-reset-password-${admin.id}`}
        onClick={() => {
          handleClose();
          onResetPassword(admin);
        }}
        disabled={isSuper && !isCurrentUserSuperAdmin}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
      >
        <KeyRound size={13} className="text-muted-foreground shrink-0" />
        <span>Reset Password</span>
      </button>

      {/* Toggle Status */}
      <button
        type="button"
        role="menuitem"
        data-testid={`admin-action-toggle-status-${admin.id}`}
        onClick={() => {
          handleClose();
          onToggleStatus(admin);
        }}
        disabled={isSelf || (isSuper && !isCurrentUserSuperAdmin) || isToggling}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
      >
        <Power
          size={13}
          className={`shrink-0 ${admin.status === "active" ? "text-amber-500" : "text-emerald-500"}`}
        />
        <span>{admin.status === "active" ? "Deactivate Account" : "Activate Account"}</span>
      </button>

      <div className="border-t border-border/60 my-1" />

      {/* Delete Administrator */}
      <button
        type="button"
        role="menuitem"
        data-testid={`admin-action-delete-${admin.id}`}
        onClick={() => {
          handleClose();
          onDelete(admin);
        }}
        disabled={isSelf || isSuper}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
      >
        <Trash2 size={13} className="shrink-0" />
        <span>Delete Administrator</span>
      </button>
    </div>
  );

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        id={`admin-actions-trigger-${admin.id}`}
        data-testid={`admin-actions-trigger-${admin.id}`}
        onClick={handleToggle}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Actions for ${admin.name}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? `admin-actions-menu-${admin.id}` : undefined}
        title="More actions"
      >
        <MoreVertical size={14} />
      </button>

      {isOpen &&
        (mounted && typeof document !== "undefined"
          ? createPortal(menuElement, document.body)
          : menuElement)}
    </div>
  );
}
