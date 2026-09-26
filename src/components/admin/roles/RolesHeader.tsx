"use client";

import React from "react";
import { ShieldCheck, Plus, RefreshCw, Key, Lock, Layers } from "lucide-react";

export interface RoleStats {
  total: number;
  system: number;
  custom: number;
  active: number;
}

export interface RolesHeaderProps {
  stats: RoleStats;
  onCreateRole: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export default function RolesHeader({
  stats,
  onCreateRole,
  onRefresh,
  isRefreshing = false,
}: RolesHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Layers size={20} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold uppercase tracking-wider text-foreground">
                RBAC Role Management
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define role bundles, enforce permission dependency chains, and govern administrative scopes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-secondary/70 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
            title="Refresh roles list"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onCreateRole}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background hover:opacity-90 text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Custom Role</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground font-mono">
              Total Roles
            </span>
            <div className="text-xl font-extrabold text-foreground mt-0.5 font-mono">
              {stats.total}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
            <Layers size={16} />
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary font-mono">
              System Roles
            </span>
            <div className="text-xl font-extrabold text-primary mt-0.5 font-mono">
              {stats.system}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Lock size={16} />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground font-mono">
              Custom Roles
            </span>
            <div className="text-xl font-extrabold text-foreground mt-0.5 font-mono">
              {stats.custom}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
            <Key size={16} />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 font-mono">
              Active Roles
            </span>
            <div className="text-xl font-extrabold text-emerald-500 mt-0.5 font-mono">
              {stats.active}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <ShieldCheck size={16} />
          </div>
        </div>
      </div>
    </div>
  );
}
