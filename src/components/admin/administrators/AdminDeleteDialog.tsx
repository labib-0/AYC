"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Trash2, ShieldAlert } from "lucide-react";
import { AdminUserRecord } from "@/services/admin/admin-user.service";

export interface AdminDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  admin: AdminUserRecord | null;
  onConfirmDelete: (adminId: number | string) => Promise<void>;
}

export default function AdminDeleteDialog({
  isOpen,
  onClose,
  admin,
  onConfirmDelete,
}: AdminDeleteDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !admin) return null;

  const isSuper = Boolean(admin.is_super_admin);

  const handleDelete = async () => {
    if (isSuper) {
      setError("Super Admin accounts cannot be deleted.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirmDelete(admin.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to delete administrator.");
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
                Delete Administrator Account
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                Confirm account removal
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

        <div className="space-y-3 text-xs text-muted-foreground">
          <p>
            Are you sure you want to delete administrator <strong className="text-foreground">{admin.name}</strong> ({admin.email})?
          </p>

          <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span>Account Status:</span>
              <span className="font-bold text-foreground">{admin.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Assigned Roles:</span>
              <span className="font-bold text-foreground">{admin.roles?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Effective Permissions:</span>
              <span className="font-bold text-foreground">{admin.effective_permissions_count || 0}</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            This action will soft-delete the administrator account, detach all RBAC roles, and revoke all active authentication tokens. Historical audit and order records will be preserved for compliance.
          </p>
        </div>

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
            disabled={submitting || isSuper}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-90 transition-all disabled:opacity-40"
          >
            <Trash2 size={13} />
            <span>{submitting ? "Deleting..." : "Delete Account"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
