"use client";

import React, { useState, useEffect } from "react";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { mockStore } from "@/lib/mock-data/mock-store";
import { useAuth } from "@/lib/AuthContext";
import { 
  Wrench, 
  RotateCcw, 
  UserCheck, 
  ShieldCheck, 
  LogOut, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Check,
  AlertCircle
} from "lucide-react";

export default function DevToolbar() {
  const { user, refreshSession } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [activeRole, setActiveRole] = useState<string>("guest");

  useEffect(() => {
    if (!user) {
      setActiveRole("guest");
    } else {
      setActiveRole(user.role || "customer");
    }
  }, [user]);

  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  useEffect(() => {
    if (isConfirmingReset) {
      const timer = setTimeout(() => {
        setIsConfirmingReset(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingReset]);

  const handleResetData = () => {
    if (!isConfirmingReset) {
      setIsConfirmingReset(true);
      return;
    }
    mockStore.resetAllMockData();
    refreshSession();
    setResetSuccess(true);
    setIsConfirmingReset(false);
    setTimeout(() => {
      setResetSuccess(false);
      window.location.reload();
    }, 800);
  };

  const handleSwitchUser = (role: "guest" | "customer" | "b2b_buyer" | "admin") => {
    if (role === "guest") {
      mockStore.setActiveUser(null);
    } else if (role === "customer") {
      const u = mockStore.getUserByEmail("testuser@example.com");
      mockStore.setActiveUser(u);
    } else if (role === "b2b_buyer") {
      const u = mockStore.getUserByEmail("buyer@ayaanclothing.com");
      mockStore.setActiveUser(u);
    } else if (role === "admin") {
      const u = mockStore.getUserByEmail("admin@ayaanclothing.com");
      mockStore.setActiveUser(u);
    }
    refreshSession();
  };

  if (!isFrontendOnly()) {
    return null;
  }

  return (
    <aside aria-label="Development Tools" className="fixed bottom-4 left-4 z-50 font-sans text-xs print:hidden">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 bg-slate-900/75 hover:bg-slate-900 backdrop-blur-md text-slate-200 border border-slate-700/50 shadow-md px-3 py-1.5 rounded-full opacity-70 hover:opacity-100 transition-all cursor-pointer font-medium text-[11px]"
          title="Open Frontend-Only Dev Tools & Quick Roles"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <Wrench className="w-3 h-3 text-amber-400" />
          <span>Frontend Mode</span>
          <ChevronUp className="w-3 h-3 text-slate-400" />
        </button>
      ) : (
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 text-slate-200 rounded-2xl shadow-2xl p-4 w-72 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-white tracking-wide">Frontend-Only Mode</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Active Simulation */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
              Active User Simulation
            </div>
            <div className="font-medium text-white flex items-center justify-between">
              <span>{user ? user.name : "Public Guest (Logged Out)"}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {activeRole}
              </span>
            </div>
          </div>

          {/* Quick Role Switcher */}
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
              Quick Role Switch
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleSwitchUser("guest")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                  activeRole === "guest"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold"
                    : "bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700/50"
                }`}
              >
                <LogOut className="w-3 h-3 text-slate-400" />
                <span>Logged Out</span>
              </button>

              <button
                onClick={() => handleSwitchUser("customer")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                  activeRole === "customer"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold"
                    : "bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700/50"
                }`}
              >
                <UserCheck className="w-3 h-3 text-blue-400" />
                <span>Customer</span>
              </button>

              <button
                onClick={() => handleSwitchUser("b2b_buyer")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                  activeRole === "b2b_buyer"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold"
                    : "bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700/50"
                }`}
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>B2B Buyer</span>
              </button>

              <button
                onClick={() => handleSwitchUser("admin")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                  activeRole === "admin"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold"
                    : "bg-slate-800/50 hover:bg-slate-800 text-slate-300 border-slate-700/50"
                }`}
              >
                <ShieldCheck className="w-3 h-3 text-rose-400" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Reset Demo Data Button */}
          <div className="pt-1 border-t border-slate-800 flex flex-col gap-1.5">
            <button
              onClick={handleResetData}
              className={`flex items-center justify-center gap-2 w-full font-medium py-2 rounded-xl transition-all cursor-pointer ${
                isConfirmingReset
                  ? "bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 border border-amber-500/50 animate-pulse"
                  : "bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40"
              }`}
            >
              {resetSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Data Restored! Reloading...</span>
                </>
              ) : isConfirmingReset ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Confirm Reset? (Click again)</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo Data</span>
                </>
              )}
            </button>
            <div className="text-[10px] text-slate-500 text-center">
              {isConfirmingReset ? "Click button again to wipe mutations & restore fresh demo data." : "Restores products, brands, categories & orders."}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
