"use client";

import React, { useState, useEffect } from "react";
import { X, Layers, Check, AlertCircle, ShieldCheck } from "lucide-react";
import { AdminUserRecord } from "@/services/admin/admin-user.service";
import { RbacRole } from "@/services/admin/rbac.service";

export interface AdminRoleAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin: AdminUserRecord | null;
  availableRoles: RbacRole[];
  onSaveRoles: (adminId: number | string, roleSlugs: string[]) => Promise<void>;
}

export default function AdminRoleAssignModal({
  isOpen,
  onClose,
  admin,
  availableRoles,
  onSaveRoles,
}: AdminRoleAssignModalProps) {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (admin) {
      const assigned = admin.roles ? admin.roles.map((r) => r.slug) : [];
      setSelectedSlugs(assigned);
    } else {
      setSelectedSlugs([]);
    }
    setError(null);
  }, [admin, isOpen]);

  if (!isOpen || !admin) return null;

  const isSuper = Boolean(admin.is_super_admin);

  const toggleRole = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSuper) {
      onClose();
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSaveRoles(admin.id, selectedSlugs);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update role assignments.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-foreground text-background flex items-center justify-center">
              <Layers size={16} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                Assign RBAC Roles
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Target: <strong className="text-foreground">{admin.name}</strong> ({admin.email})
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

        {isSuper ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 space-y-1">
            <p className="font-bold">Super Admin Authority</p>
            <p className="text-[11px]">
              This administrator has unrestricted administrative authority. All RBAC roles and permissions are active automatically without manual assignment.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span>Select one or more roles to assign:</span>
              <span className="font-bold text-foreground">{selectedSlugs.length} selected</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {availableRoles.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-xs italic">
                  No roles found.
                </div>
              ) : (
                availableRoles.map((role) => {
                  const isChecked = selectedSlugs.includes(role.slug);
                  return (
                    <div
                      key={role.id}
                      onClick={() => toggleRole(role.slug)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? "bg-foreground/5 border-foreground/30 text-foreground"
                          : "bg-secondary/20 border-border/70 text-muted-foreground hover:bg-secondary/40"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                          isChecked
                            ? "bg-foreground border-foreground text-background"
                            : "border-border bg-card"
                        }`}
                      >
                        {isChecked && <Check size={11} strokeWidth={3} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs truncate">{role.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                            {role.permission_count ?? 0} perms
                          </span>
                        </div>
                        {role.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

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
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-foreground text-background text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Role Assignments"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
