"use client";

import React, { useState, useEffect } from "react";
import { X, Key, AlertCircle, Lock } from "lucide-react";
import { RbacRole, CreateRoleInput, UpdateRoleInput } from "@/services/admin/rbac.service";

export interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: RbacRole | null;
  onSave: (data: CreateRoleInput | UpdateRoleInput) => Promise<void>;
}

export default function RoleFormModal({
  isOpen,
  onClose,
  role,
  onSave,
}: RoleFormModalProps) {
  const isEditing = Boolean(role);
  const isSystem = Boolean(role?.is_system);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role) {
      setName(role.name || "");
      setSlug(role.slug || "");
      setDescription(role.description || "");
      setIsActive(role.is_active ?? true);
    } else {
      setName("");
      setSlug("");
      setDescription("");
      setIsActive(true);
    }
    setError(null);
  }, [role, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      // Auto-generate slug from name
      const generatedSlug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      setSlug(generatedSlug);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Role name is required.");
      return;
    }

    if (!isEditing && (!slug.trim() || !/^[a-z0-9_]+$/.test(slug))) {
      setError("Slug must contain only lowercase alphanumeric characters and underscores (e.g. inventory_reviewer).");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && role) {
        await onSave({
          name: name.trim(),
          description: description.trim() || undefined,
          is_active: isActive,
        });
      } else {
        await onSave({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          is_active: isActive,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save role.");
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
            <div className="w-8 h-8 rounded-xl bg-foreground text-background flex items-center justify-center">
              {isSystem ? <Lock size={16} /> : <Key size={16} />}
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                {isEditing ? "Edit Role" : "Create Custom Role"}
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isEditing
                  ? `Editing role metadata for '${role?.name}'`
                  : "Define a new RBAC role bundle."}
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
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Name */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono block mb-1.5">
              Role Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Warehouse Inventory Lead"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 bg-secondary/40 border border-border/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
            />
          </div>

          {/* Slug (locked in edit mode or for system roles) */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono block mb-1.5">
              Role Slug * {isEditing && "(Immutable after creation)"}
            </label>
            <input
              type="text"
              required
              disabled={isEditing}
              placeholder="e.g. warehouse_inventory_lead"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
              className="w-full px-3 py-2 bg-secondary/40 border border-border/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-foreground transition-all font-mono disabled:opacity-50"
            />
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">
              Stable system key used for code checks and API references.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono block mb-1.5">
              Description (optional)
            </label>
            <textarea
              rows={2}
              placeholder="Summarize the administrative scope of this role..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-secondary/40 border border-border/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-foreground transition-all resize-none"
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="role_is_active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-border text-foreground focus:ring-foreground"
            />
            <label htmlFor="role_is_active" className="text-xs font-semibold text-foreground cursor-pointer select-none">
              Role is Active
            </label>
          </div>

          {/* Form Actions */}
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
              {submitting ? "Saving..." : isEditing ? "Update Role" : "Create Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
