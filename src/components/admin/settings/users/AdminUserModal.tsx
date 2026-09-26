"use client";

import React, { useState, useEffect } from "react";
import { X, User, Mail, Phone, Shield, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { AdminUserRecord, CreateAdminUserInput, UpdateAdminUserInput } from "@/services/admin/admin-user.service";
import { UserProfile } from "@/types/api";

export interface AdminUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUserRecord | null;
  currentUser: UserProfile | null;
  onSave: (data: CreateAdminUserInput | UpdateAdminUserInput) => Promise<void>;
}

export default function AdminUserModal({
  isOpen,
  onClose,
  user,
  currentUser,
  onSave,
}: AdminUserModalProps) {
  const isEditing = Boolean(user);
  const isSelf = user && currentUser && String(user.id) === String(currentUser.id);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [accessLevel, setAccessLevel] = useState<string>("super_admin");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setStatus(user.status || "active");
      setAccessLevel(user.access_level || "super_admin");
      setPassword("");
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setStatus("active");
      setAccessLevel("super_admin");
      setPassword("");
    }
    setError(null);
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("A valid email address is required.");
      return;
    }

    if (!isEditing && (!password || password.length < 6)) {
      setError("Password must be at least 6 characters for a new administrator.");
      return;
    }

    setSaving(true);
    try {
      if (isEditing && user) {
        const updatePayload: UpdateAdminUserInput = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          status: isSelf ? "active" : status,
          access_level: accessLevel,
        };
        if (password) {
          updatePayload.password = password;
        }
        await onSave(updatePayload);
      } else {
        const createPayload: CreateAdminUserInput = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          phone: phone.trim() || undefined,
          status,
          access_level: accessLevel,
        };
        await onSave(createPayload);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save administrator account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-modal-title"
      >
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Shield size={16} />
            </div>
            <h2 id="admin-user-modal-title" className="text-base font-bold text-foreground">
              {isEditing ? "Edit Administrator Account" : "Add Administrator Account"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Full Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ayaan Admin"
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Email Address <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                disabled={Boolean(isSelf)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ayaanclothing.com"
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-60 transition-all"
              />
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            {isSelf && (
              <span className="text-[10px] text-muted-foreground">
                Email of your current active session cannot be modified.
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Phone Number</label>
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 18..."
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Permissions / Access Level <span className="text-destructive">*</span>
              </label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
                className="w-full px-3 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all cursor-pointer"
              >
                <option value="super_admin">Super Administrator (Full System)</option>
                <option value="admin">Operations Admin (Orders, Stock, RFQs)</option>
                <option value="manager">Operations Manager (Catalog &amp; Merchandising)</option>
                <option value="editor">Content Editor (Homepage &amp; Banners)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Account Status <span className="text-destructive">*</span>
              </label>
              <select
                value={status}
                disabled={Boolean(isSelf)}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                className="w-full px-3 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-60 transition-all cursor-pointer"
              >
                <option value="active">Active (Access Granted)</option>
                <option value="inactive">Inactive (Access Suspended)</option>
              </select>
              {isSelf && (
                <span className="text-[10px] text-muted-foreground">
                  You cannot deactivate your own active session.
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {isEditing ? "Reset Password (leave blank to keep current)" : "Initial Password"}{" "}
              {!isEditing && <span className="text-destructive">*</span>}
            </label>
            <div className="relative">
              <input
                type="password"
                required={!isEditing}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing ? "••••••••" : "Minimum 6 characters"}
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-secondary/30 border border-border/70 text-[11px] text-muted-foreground flex items-center gap-2">
            <Shield size={14} className="text-primary shrink-0" />
            <span>
              Administrator accounts are system-management credentials. They do not appear in customer lists or customer statistics.
            </span>
          </div>

          <div className="pt-3 border-t border-border/70 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span>{saving ? "Saving..." : isEditing ? "Update Admin" : "Create Admin"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
