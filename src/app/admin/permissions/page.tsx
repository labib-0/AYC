"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Key, 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  Layers, 
  Lock, 
  CornerDownRight, 
  CornerUpRight,
  Info,
  Filter,
  CheckCircle2
} from "lucide-react";
import { rbacService, RbacPermission, RbacRole } from "@/services/admin/rbac.service";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<RbacPermission[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [permList, roleList] = await Promise.all([
        rbacService.getPermissions(false) as Promise<RbacPermission[]>,
        rbacService.getRoles(true),
      ]);
      setPermissions(permList);
      setRoles(roleList);
    } catch (err: any) {
      showToast(err?.message || "Failed to load permission catalog.", "error");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(true);
    showToast("Permission catalog refreshed.", "success");
  };

  // Map which roles use which permission slug
  const rolesByPermSlug = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const role of roles) {
      if (role.permissions) {
        for (const p of role.permissions) {
          const arr = map.get(p.slug) || [];
          arr.push(role.name);
          map.set(p.slug, arr);
        }
      }
    }
    return map;
  }, [roles]);

  // Compute inverse dependencies: which permissions REQUIRE this permission
  const dependentsBySlug = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of permissions) {
      if (p.requires) {
        for (const reqSlug of p.requires) {
          const arr = map.get(reqSlug) || [];
          arr.push(p.name);
          map.set(reqSlug, arr);
        }
      }
    }
    return map;
  }, [permissions]);

  // Modules list
  const modules = useMemo(() => {
    const set = new Set<string>();
    for (const p of permissions) {
      set.add(p.module);
    }
    return Array.from(set).sort();
  }, [permissions]);

  // Total dependencies link count
  const totalDependencyLinks = useMemo(() => {
    let count = 0;
    for (const p of permissions) {
      if (p.requires) {
        count += p.requires.length;
      }
    }
    return count;
  }, [permissions]);

  // Filtered permissions
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      if (selectedModule !== "ALL" && p.module !== selectedModule) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSlug = p.slug.toLowerCase().includes(q);
        const matchesDesc = Boolean(p.description && p.description.toLowerCase().includes(q));
        const matchesAction = p.action.toLowerCase().includes(q);
        return matchesName || matchesSlug || matchesDesc || matchesAction;
      }
      return true;
    });
  }, [permissions, selectedModule, searchQuery]);

  // Group filtered by module
  const groupedPermissions = useMemo(() => {
    const map: Record<string, RbacPermission[]> = {};
    for (const p of filteredPermissions) {
      if (!map[p.module]) map[p.module] = [];
      map[p.module].push(p);
    }
    return map;
  }, [filteredPermissions]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Key size={20} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold uppercase tracking-wider text-foreground">
                Permission Catalog & Matrix
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Authoritative register of atomic administrative permissions, prerequisite dependencies, and active role mappings.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-secondary/70 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          <span>Refresh Catalog</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground font-mono">
              Total Permissions
            </span>
            <div className="text-xl font-extrabold text-foreground mt-0.5 font-mono">
              {permissions.length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
            <Key size={16} />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground font-mono">
              Domain Modules
            </span>
            <div className="text-xl font-extrabold text-foreground mt-0.5 font-mono">
              {modules.length}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
            <Layers size={16} />
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500 font-mono">
              Dependency Links
            </span>
            <div className="text-xl font-extrabold text-amber-500 mt-0.5 font-mono">
              {totalDependencyLinks}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <CornerDownRight size={16} />
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary font-mono">
              System Protected
            </span>
            <div className="text-xl font-extrabold text-primary mt-0.5 font-mono">
              100%
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Lock size={16} />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-border/80 bg-card p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search permissions by name, slug, action, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary/40 border border-border/80 rounded-xl text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
            Domain:
          </span>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-3 py-1.5 bg-secondary/40 border border-border/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-foreground transition-all cursor-pointer"
          >
            <option value="ALL">All Domains ({permissions.length})</option>
            {modules.map((mod) => (
              <option key={mod} value={mod}>
                {mod}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Catalog Grouped by Domain */}
      {loading ? (
        <div className="rounded-xl border border-border/80 bg-card p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-mono">Loading permissions catalog...</span>
        </div>
      ) : Object.keys(groupedPermissions).length === 0 ? (
        <div className="rounded-xl border border-border/80 bg-card p-12 text-center text-muted-foreground text-xs italic">
          No matching permissions found.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedPermissions).map(([moduleName, perms]) => (
            <div key={moduleName} className="rounded-xl border border-border/80 bg-card overflow-hidden">
              {/* Group Header */}
              <div className="px-4 py-3 bg-secondary/40 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-foreground font-mono">
                    {moduleName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-mono text-muted-foreground">
                    {perms.length} permissions
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-border/50">
                {perms.map((p) => {
                  const assignedRoles = rolesByPermSlug.get(p.slug) || [];
                  const requiredSlugs = p.requires || [];
                  const dependentNames = dependentsBySlug.get(p.slug) || [];

                  return (
                    <div key={p.slug} className="p-4 hover:bg-secondary/20 transition-colors space-y-2">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        {/* Name & Slug */}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground">{p.name}</span>
                            <span className="px-1.5 py-0.2 rounded bg-secondary text-muted-foreground text-[10px] font-mono">
                              {p.slug}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[9px] font-mono font-bold uppercase">
                              {p.action}
                            </span>
                          </div>
                          {p.description && (
                            <p className="text-[11px] text-muted-foreground">{p.description}</p>
                          )}
                        </div>

                        {/* System Lock Badge */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary text-muted-foreground text-[9px] font-mono font-semibold">
                            <Lock size={10} />
                            <span>Immutable Slug</span>
                          </span>
                        </div>
                      </div>

                      {/* Dependencies and Used-by section */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-border/30 text-[11px] font-mono">
                        {/* Required Prerequisites */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <CornerDownRight size={11} className="text-amber-500" />
                            <span>Requires ({requiredSlugs.length}):</span>
                          </span>
                          {requiredSlugs.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {requiredSlugs.map((req) => (
                                <span
                                  key={req}
                                  className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px]"
                                >
                                  {req}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60 italic text-[10px]">None (Atomic base)</span>
                          )}
                        </div>

                        {/* Dependents */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <CornerUpRight size={11} className="text-primary" />
                            <span>Required By ({dependentNames.length}):</span>
                          </span>
                          {dependentNames.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {dependentNames.map((dep) => (
                                <span
                                  key={dep}
                                  className="px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 text-[10px]"
                                >
                                  {dep}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60 italic text-[10px]">None (Terminal leaf)</span>
                          )}
                        </div>

                        {/* Used By Roles */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Layers size={11} className="text-foreground" />
                            <span>Used By Roles ({assignedRoles.length}):</span>
                          </span>
                          {assignedRoles.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {assignedRoles.map((roleName) => (
                                <span
                                  key={roleName}
                                  className="px-1.5 py-0.2 rounded bg-secondary text-foreground border border-border text-[10px]"
                                >
                                  {roleName}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60 italic text-[10px]">Not currently assigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info notice */}
      <div className="p-4 rounded-xl border border-border/80 bg-secondary/20 text-xs text-muted-foreground flex items-center gap-2.5 font-mono">
        <Info size={16} className="text-primary shrink-0" />
        <span>
          Permission slugs are stable contract keys referenced across frontend navigation, middleware, and domain policies. Modification of slugs is prohibited after deployment to maintain system integrity.
        </span>
      </div>

      {/* Toast notifications */}
      <ProductToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
