"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  ShieldCheck, 
  Layers, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  CornerDownRight,
  Info,
  Crown,
  Lock
} from "lucide-react";
import { AdminUserRecord, adminUserService } from "@/services/admin/admin-user.service";
import { AdminPermissionsProvenance, RbacPermission } from "@/services/admin/rbac.service";

export interface AdminPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin: AdminUserRecord | null;
}

export default function AdminPermissionsModal({
  isOpen,
  onClose,
  admin,
}: AdminPermissionsModalProps) {
  const [loading, setLoading] = useState(true);
  const [provenanceData, setProvenanceData] = useState<AdminPermissionsProvenance | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !admin) return;

    const fetchPermissions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await adminUserService.getEffectivePermissions(admin.id);
        setProvenanceData(data);
      } catch (err: any) {
        console.error("Failed to load permissions provenance:", err);
        setError(err?.message || "Failed to load effective permissions.");
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [isOpen, admin]);

  const modules = useMemo(() => {
    if (!provenanceData?.permissions_by_module) return [];
    return Object.keys(provenanceData.permissions_by_module).sort();
  }, [provenanceData]);

  const filteredPermissions = useMemo(() => {
    if (!provenanceData?.permissions_flat) return [];

    return provenanceData.permissions_flat.filter((p) => {
      if (selectedModule !== "ALL" && p.module !== selectedModule) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [provenanceData, selectedModule, searchQuery]);

  // Group filtered results by module
  const groupedFiltered = useMemo(() => {
    const map: Record<string, RbacPermission[]> = {};
    for (const p of filteredPermissions) {
      if (!map[p.module]) map[p.module] = [];
      map[p.module].push(p);
    }
    return map;
  }, [filteredPermissions]);

  if (!isOpen || !admin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              {admin.is_super_admin ? <Crown size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                  Effective Permissions Provenance
                </h2>
                {admin.is_super_admin && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-extrabold uppercase font-mono">
                    Super Authority
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Inspecting effective authorization and dependency provenance for <strong className="text-foreground">{admin.name}</strong> ({admin.email}).
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

        {/* Assigned Roles Banner */}
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-muted-foreground shrink-0" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono">
              Assigned Roles:
            </span>
            <div className="flex flex-wrap gap-1">
              {admin.is_super_admin ? (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold font-mono">
                  All Roles (Super Admin)
                </span>
              ) : admin.roles && admin.roles.length > 0 ? (
                admin.roles.map((r) => (
                  <span
                    key={r.id}
                    className="px-2 py-0.5 rounded-md bg-foreground/10 text-foreground border border-border/80 text-[10px] font-semibold font-mono"
                  >
                    {r.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">None (User has 0 effective permissions)</span>
              )}
            </div>
          </div>

          <div className="text-[11px] font-mono font-bold text-foreground">
            Total Effective: <span className="text-primary">{provenanceData?.total_effective ?? 0}</span>
          </div>
        </div>

        {/* Search & Module filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
          <div className="relative flex-1 w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search permissions by name, slug, or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-secondary/40 border border-border/80 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
            />
          </div>

          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 bg-secondary/40 border border-border/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
          >
            <option value="ALL">All Domains ({provenanceData?.total_effective ?? 0})</option>
            {modules.map((mod) => (
              <option key={mod} value={mod}>
                {mod} ({provenanceData?.permissions_by_module[mod]?.length || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Permissions Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-[250px]">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-xs font-mono">Resolving permission hierarchy & dependencies...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          ) : Object.keys(groupedFiltered).length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-xs italic">
              No matching permissions found.
            </div>
          ) : (
            Object.entries(groupedFiltered).map(([moduleName, perms]) => (
              <div key={moduleName} className="rounded-xl border border-border/70 bg-card overflow-hidden">
                <div className="px-3.5 py-2 bg-secondary/40 border-b border-border/60 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-foreground font-mono">
                    {moduleName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-mono text-muted-foreground">
                    {perms.length}
                  </span>
                </div>

                <div className="divide-y divide-border/40">
                  {perms.map((p) => {
                    return (
                      <div key={p.slug} className="p-3 hover:bg-secondary/20 transition-colors space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground">{p.name}</span>
                            <span className="px-1.5 py-0.2 rounded bg-secondary text-muted-foreground text-[10px] font-mono">
                              {p.slug}
                            </span>
                          </div>

                          {/* Provenance Badge */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {p.is_direct && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold font-mono">
                                <CheckCircle2 size={11} />
                                <span>Direct: {p.direct_roles?.join(", ") || "Role"}</span>
                              </span>
                            )}
                            {p.is_inherited && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold font-mono">
                                <CornerDownRight size={11} />
                                <span>Prerequisite of: {p.inherited_from?.join(", ") || "Dependency"}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {p.description && (
                          <p className="text-[11px] text-muted-foreground">
                            {p.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60 shrink-0 text-[11px] text-muted-foreground font-mono">
          <div className="flex items-center gap-1.5">
            <Info size={13} />
            <span>Effective permissions include both directly granted role permissions and their dependencies.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-border text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
