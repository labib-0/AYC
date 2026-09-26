"use client";

import React, { useState, useEffect } from "react";
import { X, User, Mail, Lock, Phone, Shield, ShieldCheck, Check, AlertCircle } from "lucide-react";
import { AdminUserRecord, CreateAdminUserInput, UpdateAdminUserInput } from "@/services/admin/admin-user.service";
import { RbacRole } from "@/services/admin/rbac.service";

export interface AdminFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin: AdminUserRecord | null;
  availableRoles: RbacRole[];
  currentUserId?: string | number;
  isCurrentUserSuperAdmin: boolean;
  onSave: (payload: CreateAdminUserInput | UpdateAdminUserInput) => Promise<void>;
}

export default function AdminFormModal({
  isOpen,
  onClose,
  admin,
  availableRoles,
  currentUserId,
  isCurrentUserSuperAdmin,
  onSave,
}: AdminFormModalProps) {
  const isEditing = Boolean(admin);
  const isSelf = Boolean(admin && currentUserId && String(admin.id) === String(currentUserId));
  const isTargetSuper = Boolean(admin?.is_super_admin);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [selectedRoleSlugs, setSelectedRoleSlugs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (admin) {
      setName(admin.name || "");
      setEmail(admin.email || "");
      setPassword("");
      setPhone(admin.phone || "");
      setStatus(admin.status || "active");
      const assigned = admin.roles ? admin.roles.map((r) => r.slug) : [];
      setSelectedRoleSlugs(assigned);
    } else {
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setStatus("active");
      setSelectedRoleSlugs([]);
    }
    setError(null);
  }, [admin, isOpen]);

  if (!isOpen) return null;

  const toggleRole = (slug: string) => {
    setSelectedRoleSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("A valid email address is required.");
      return;
    }

    if (!isEditing && (!password || password.length < 8)) {
      setError("Password must be at least 8 characters for a new administrator.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && admin) {
        const payload: UpdateAdminUserInput = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          status: isSelf ? "active" : status,
          role_slugs: isTargetSuper ? undefined : selectedRoleSlugs,
        };
        await onSave(payload);
      } else {
        const payload: CreateAdminUserInput = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim() || undefined,
          status,
          role_slugs: selectedRoleSlugs,
        };
        await onSave(payload);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save administrator.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-foreground text-background flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                {isEditing ? "Edit Administrator Account" : "Create New Administrator"}
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isEditing
                  ? "Update profile information and assign RBAC roles."
                  : "Create an administrator with users.role = 'admin' and initial RBAC roles."}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Name */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono block mb-1.5">
                Full Name *
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Sourcing Manager"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-secondary/40 border border-border/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono block mb-1.5">
                Email Address *
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="admin@ayaan.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-secondary/40 border border-border/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
                />
              </div>
            </div>

            {/* Password (Required for create, not shown for edit) */}
            {!isEditing && (
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono block mb-1.5">
                  Initial Password (min 8 chars) *
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-secondary/40 border border-border/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-foreground transition-all font-mono"
                  />
                </div>
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono block mb-1.5">
                Phone Number (optional)
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="+880 1700-000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-secondary/40 border border-border/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-foreground transition-all font-mono"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono block mb-1.5">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                disabled={isSelf}
                className="w-full px-3 py-2 bg-secondary/40 border border-border/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-foreground transition-all disabled:opacity-50"
              >
                <option value="active">Active (Full access)</option>
                <option value="inactive">Inactive (Suspended)</option>
              </select>
              {isSelf && (
                <p className="text-[10px] text-muted-foreground mt-1">You cannot deactivate your own account.</p>
              )}
            </div>
          </div>

          {/* RBAC Role Assignment Section */}
          <div className="pt-2 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono">
                Assigned RBAC Roles
              </label>
              <span className="text-[10px] text-muted-foreground font-mono">
                {selectedRoleSlugs.length} selected
              </span>
            </div>

            {isTargetSuper ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-500">
                Super Admin holds unrestricted authority intrinsically. Explicit role assignments are not required.
              </div>
            ) : availableRoles.length === 0 ? (
              <div className="p-3 text-center text-muted-foreground text-xs italic">
                No roles available. Create custom roles in the Roles tab first.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {availableRoles.map((role) => {
                  const isChecked = selectedRoleSlugs.includes(role.slug);
                  return (
                    <label
                      key={role.id}
                      onClick={() => toggleRole(role.slug)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
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
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs truncate">{role.name}</span>
                          {role.is_system && (
                            <span className="px-1 py-0.2 rounded text-[8px] bg-secondary text-muted-foreground uppercase font-mono">
                              System
                            </span>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
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
              {submitting ? "Saving..." : isEditing ? "Update Administrator" : "Create Administrator"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
