"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Trash2, Lock } from "lucide-react";
import { RbacRole } from "@/services/admin/rbac.service";

export interface RoleDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  role: RbacRole | null;
  onConfirmDelete: (roleId: number | string) => Promise<void>;
}

export default function RoleDeleteDialog({
  isOpen,
  onClose,
  role,
  onConfirmDelete,
}: RoleDeleteDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !role) return null;

  const isSystem = Boolean(role.is_system);
  const adminCount = role.admin_count ?? 0;
  const canDelete = !isSystem && adminCount === 0;

  const handleDelete = async () => {
    if (!canDelete) return;

    setSubmitting(true);
    setError(null);
    try {
      await onConfirmDelete(role.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to delete role.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                Delete Role
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                {role.name} ({role.slug})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {error}
          </div>
        )}

        {isSystem ? (
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Lock size={14} />
              <span>System Role Protected</span>
            </div>
            <p className="text-[11px]">
              System roles are foundational RBAC bundles and cannot be deleted. You can modify their permission mappings or deactivate the role instead.
            </p>
          </div>
        ) : adminCount > 0 ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle size={14} />
              <span>Role is Currently Assigned</span>
            </div>
            <p className="text-[11px]">
              This role cannot be deleted because it is currently assigned to <strong>{adminCount}</strong> administrator(s). Remove this role from all administrators first before deleting it.
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-muted-foreground">
            <p>
              Are you sure you want to permanently delete custom role <strong className="text-foreground">{role.name}</strong>?
            </p>
            <p className="text-[11px]">
              All assigned permission associations for this role will be detached. This action cannot be undone.
            </p>
          </div>
        )}

        {/* Dialog Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-border text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting || !canDelete}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-90 transition-all disabled:opacity-40"
          >
            <Trash2 size={13} />
            <span>{submitting ? "Deleting..." : "Delete Role"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
