"use client";

import React, { useState, useEffect } from "react";
import { User, Mail, Phone, Building, ShieldCheck, KeyRound, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import ChangePasswordModal from "./ChangePasswordModal";

export interface ProfileSettingsProps {
  onNotify: (message: string) => void;
}

export default function ProfileSettings({ onNotify }: ProfileSettingsProps) {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setCompanyName(user.company_name || "Ayaan Clothing Export Division");
      setAvatarUrl(user.avatar_url || "");
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
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

    setSaving(true);
    try {
      const res = await updateProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        company_name: companyName.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
      });

      if (res?.error) {
        throw new Error(typeof res.error === "string" ? res.error : "Failed to update profile.");
      }

      onNotify("Admin profile updated successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="p-6 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="relative">
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={avatarUrl}
                alt={name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-border/80 shadow-xs bg-secondary"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary font-bold text-2xl flex items-center justify-center border-2 border-primary/20">
                {name ? name.charAt(0).toUpperCase() : "A"}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center text-white" title="Active">
              <CheckCircle2 size={12} />
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">{name || "Administrator"}</h2>
            <p className="text-xs text-muted-foreground">{email || "admin@ayaanclothing.com"}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                <ShieldCheck size={12} />
                <span>Super Admin</span>
              </span>
              <span className="text-xs text-muted-foreground">
                • Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : "Jan 2026"}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPasswordModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0"
        >
          <KeyRound size={14} />
          <span>Change Password</span>
        </button>
      </div>

      {/* Edit Profile Form */}
      <form onSubmit={handleSaveProfile} className="p-6 bg-card border border-border/80 rounded-2xl shadow-xs space-y-5">
        <div className="border-b border-border/60 pb-3">
          <h3 className="text-sm font-bold text-foreground">Personal &amp; Contact Details</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Update your administrative contact details and identity avatar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                placeholder="Admin Name"
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ayaanclothing.com"
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Direct Phone / Mobile
            </label>
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1620-853502"
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Operating Department / Division
            </label>
            <div className="relative">
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ayaan Clothing Export Division"
                className="w-full pl-9 pr-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-foreground">
              Avatar Image URL
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... or /images/..."
              className="w-full px-3.5 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            <span className="text-[11px] text-muted-foreground block">
              Provide a publicly accessible image URL or secure CDN asset path for your avatar.
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-border/60 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Role: <strong className="text-foreground uppercase">{user?.role || "ADMIN"}</strong> (Role modifications must be made via Admin User Management)
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            <span>{saving ? "Saving..." : "Save Profile"}</span>
          </button>
        </div>
      </form>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        user={user}
        onSuccess={() => onNotify("Password updated successfully.")}
      />
    </div>
  );
}
