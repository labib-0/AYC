"use client";

import React from "react";
import Link from "next/link";
import { UserProfile } from "@/types/api";
import { Building2, ShieldCheck, Calendar, ArrowUpRight } from "lucide-react";
import { getWhatsAppUrl } from "@/config/business-profile";

interface DashboardHeaderProps {
  user: UserProfile | null;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-2xl p-5 sm:p-7 shadow-sm mb-6 border border-slate-700/50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Customer Portal
            </span>
            <span className="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-emerald-400">
              <ShieldCheck size={12} />
              <span>Verified Account</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Welcome back, {user?.name || "Customer"}
          </h1>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300">
            {user?.company_name && (
              <div className="flex items-center gap-1.5">
                <Building2 size={13} className="text-amber-400" />
                <span className="font-medium text-slate-200">{user.company_name}</span>
              </div>
            )}
            {memberSince && (
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar size={13} />
                <span>Customer since {memberSince}</span>
              </div>
            )}
            <div className="text-slate-400">
              Billing Currency: <span className="font-semibold text-white">USD ($)</span>
            </div>
          </div>
        </div>

        {/* Support & Quick Contact */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          <a
            href={getWhatsAppUrl("Hello Ayaan team, I would like to inquire about bulk wholesale ordering.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-xs border border-white/15"
          >
            <span>Dedicated Account Rep</span>
            <ArrowUpRight size={13} className="text-amber-400" />
          </a>
          <Link
            href="/rfq"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-xs"
          >
            <span>Request Quote</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
