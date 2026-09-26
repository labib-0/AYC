"use client";

import React from "react";
import { Search, Shield, Filter, X } from "lucide-react";
import { RbacRole } from "@/services/admin/rbac.service";

export interface AdminToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  roleFilter: string;
  onRoleFilterChange: (role: string) => void;
  availableRoles: RbacRole[];
  totalResults: number;
}

export default function AdminToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  roleFilter,
  onRoleFilterChange,
  availableRoles,
  totalResults,
}: AdminToolbarProps) {
  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "ALL" || roleFilter !== "ALL";

  const handleResetFilters = () => {
    onSearchChange("");
    onStatusFilterChange("ALL");
    onRoleFilterChange("ALL");
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search administrators by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary/40 border border-border/80 rounded-xl text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="px-2.5 py-1.5 bg-secondary/40 border border-border/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-foreground transition-all cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Role filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Role:
            </span>
            <select
              value={roleFilter}
              onChange={(e) => onRoleFilterChange(e.target.value)}
              className="px-2.5 py-1.5 bg-secondary/40 border border-border/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-foreground transition-all cursor-pointer max-w-[180px] truncate"
            >
              <option value="ALL">All Roles</option>
              {availableRoles.map((r) => (
                <option key={r.id} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-destructive/30 text-destructive text-[11px] font-bold uppercase tracking-wider hover:bg-destructive/10 transition-all cursor-pointer"
            >
              <X size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40 font-mono">
        <span>Showing {totalResults} administrator{totalResults === 1 ? "" : "s"}</span>
        {hasActiveFilters && <span className="text-amber-500 font-medium">Filters Applied</span>}
      </div>
    </div>
  );
}
