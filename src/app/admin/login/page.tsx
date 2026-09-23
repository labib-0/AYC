"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  Store, 
  Loader2, 
  AlertCircle,
  KeyRound,
  CheckCircle2
} from "lucide-react";
import { adminAuthService } from "@/services/admin/admin-auth.service";
import { getCustomerAppUrl } from "@/config/site-urls";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@ayaanclothing.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoNotice, setDemoNotice] = useState(false);

  const storefrontUrl = getCustomerAppUrl();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await adminAuthService.loginAdmin({ email, password });
      router.push("/admin");
    } catch (err: any) {
      setError(err?.message || "Failed to authenticate administrator.");
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    const creds = adminAuthService.getDemoCredentials();
    setEmail(creds.email);
    setPassword(creds.password);
    setDemoNotice(true);
    setError("");
    setTimeout(() => setDemoNotice(false), 3000);
  };

  return (
    <div className="min-h-screen bg-secondary/30 text-foreground flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold font-mono text-sm tracking-tighter shadow-xs">
            AC
          </div>
          <span className="font-extrabold text-sm sm:text-base tracking-wider text-foreground uppercase font-display">
            AYAAN CLOTHING ADMIN
          </span>
        </div>

        <a
          href={storefrontUrl}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-card hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Store size={13} />
          <span>Customer Store</span>
        </a>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-8">
        <div className="bg-card border border-border/90 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-2xs">
              <KeyRound size={24} />
            </div>
            <h1 className="text-lg sm:text-xl font-bold font-display text-foreground uppercase tracking-wide">
              Admin Portal Access
            </h1>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Wholesale catalog management, inventory control, and export orders.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Demo Credentials Notice */}
          {demoNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>Demo credentials loaded! Click Sign In to continue.</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ayaanclothing.com"
                  required
                  disabled={loading}
                  className="w-full pl-9.5 pr-4 py-2.5 text-xs rounded-xl border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full pl-9.5 pr-4 py-2.5 text-xs rounded-xl border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-foreground text-background hover:opacity-90 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin Workspace</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Demo One-Click Access Button */}
          <div className="pt-2 border-t border-border/80 text-center space-y-2.5">
            <button
              type="button"
              onClick={handleFillDemo}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-border hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Fill Demo Admin Credentials (admin@ayaanclothing.com)
            </button>

            <p className="text-[11px] text-muted-foreground">
              Internal authorized personnel only. Client-side authentication active.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-5xl mx-auto text-center text-[11px] text-muted-foreground">
        AYAAN CLOTHING ADMIN · © 2026 Internal Management System
      </div>
    </div>
  );
}
