"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  X, 
  SlidersHorizontal, 
  Search, 
  Check, 
  AlertCircle, 
  Info, 
  Layers, 
  ArrowRight, 
  CornerDownRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { RbacRole, RbacPermission, rbacService } from "@/services/admin/rbac.service";

export interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: RbacRole | null;
  onSavePermissions: (roleId: number | string, permissionSlugs: string[]) => Promise<void>;
}

export default function RolePermissionsModal({
  isOpen,
  onClose,
  role,
  onSavePermissions,
}: RolePermissionsModalProps) {
  const [catalog, setCatalog] = useState<RbacPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [dependencyWarning, setDependencyWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load catalog on open
  useEffect(() => {
    if (!isOpen) return;

    const loadCatalogAndRole = async () => {
      setLoading(true);
      setError(null);
      setDependencyWarning(null);
      try {
        const [perms, roleDetail] = await Promise.all([
          rbacService.getPermissions(false) as Promise<RbacPermission[]>,
          role ? rbacService.getRole(role.id) : null,
        ]);
        setCatalog(perms);

        const initialSlugs = new Set<string>();
        if (roleDetail?.permissions) {
          roleDetail.permissions.forEach((p) => initialSlugs.add(p.slug));
        } else if (role?.permissions) {
          role.permissions.forEach((p) => initialSlugs.add(p.slug));
        }
        setSelectedSlugs(initialSlugs);
      } catch (err: any) {
        setError(err?.message || "Failed to load permission catalog.");
      } finally {
        setLoading(false);
      }
    };

    loadCatalogAndRole();
  }, [isOpen, role]);

  // Index catalog by slug for fast lookups
  const catalogMap = useMemo(() => {
    const map = new Map<string, RbacPermission>();
    for (const p of catalog) {
      map.set(p.slug, p);
    }
    return map;
  }, [catalog]);

  // Modules list
  const modules = useMemo(() => {
    const set = new Set<string>();
    for (const p of catalog) {
      set.add(p.module);
    }
    return Array.from(set).sort();
  }, [catalog]);

  // Recursively collect all prerequisites for a given slug
  const getAllPrerequisites = useCallback(
    (slug: string, visited: Set<string> = new Set()): string[] => {
      const result: string[] = [];
      const perm = catalogMap.get(slug);
      if (!perm || !perm.requires) return result;

      for (const reqSlug of perm.requires) {
        if (!visited.has(reqSlug)) {
          visited.add(reqSlug);
          result.push(reqSlug);
          result.push(...getAllPrerequisites(reqSlug, visited));
        }
      }
      return Array.from(new Set(result));
    },
    [catalogMap]
  );

  // Find all currently-checked permissions that depend on a given slug
  const findDependents = useCallback(
    (targetSlug: string): string[] => {
      const dependents: string[] = [];
      for (const checkedSlug of selectedSlugs) {
        if (checkedSlug === targetSlug) continue;
        const prereqs = getAllPrerequisites(checkedSlug);
        if (prereqs.includes(targetSlug)) {
          const depPerm = catalogMap.get(checkedSlug);
          dependents.push(depPerm ? depPerm.name : checkedSlug);
        }
      }
      return dependents;
    },
    [selectedSlugs, getAllPrerequisites, catalogMap]
  );

  // Toggle permission check with automatic dependency handling
  const handleTogglePermission = (slug: string) => {
    setDependencyWarning(null);
    const next = new Set(selectedSlugs);

    if (next.has(slug)) {
      // User is attempting to UNCHECK
      const blockers = findDependents(slug);
      if (blockers.length > 0) {
        const permName = catalogMap.get(slug)?.name || slug;
        setDependencyWarning(
          `Cannot remove '${permName}' because the following assigned permission(s) depend on it: ${blockers.join(
            ", "
          )}. Uncheck them first.`
        );
        return;
      }
      next.delete(slug);
      setSelectedSlugs(next);
    } else {
      // User is CHECKING
      next.add(slug);
      // Auto-include all prerequisite dependencies
      const prereqs = getAllPrerequisites(slug);
      let autoAddedCount = 0;
      for (const req of prereqs) {
        if (!next.has(req)) {
          next.add(req);
          autoAddedCount++;
        }
      }
      setSelectedSlugs(next);
      if (autoAddedCount > 0) {
        const addedNames = prereqs.map((s) => catalogMap.get(s)?.name || s).join(", ");
        setDependencyWarning(
          `Automatically included required dependency permissions: ${addedNames}`
        );
      }
    }
  };

  // Select all in current module
  const handleSelectAllInModule = (moduleName: string) => {
    const next = new Set(selectedSlugs);
    const modulePerms = catalog.filter((p) => p.module === moduleName);
    for (const p of modulePerms) {
      next.add(p.slug);
      const prereqs = getAllPrerequisites(p.slug);
      prereqs.forEach((req) => next.add(req));
    }
    setSelectedSlugs(next);
    setDependencyWarning(`Selected all permissions in ${moduleName} with dependencies.`);
  };

  // Deselect all in current module (where safe)
  const handleDeselectAllInModule = (moduleName: string) => {
    const next = new Set(selectedSlugs);
    const modulePerms = catalog.filter((p) => p.module === moduleName);
    const blocked: string[] = [];

    for (const p of modulePerms) {
      const blockers = findDependents(p.slug);
      if (blockers.length === 0) {
        next.delete(p.slug);
      } else {
        blocked.push(p.name);
      }
    }

    setSelectedSlugs(next);
    if (blocked.length > 0) {
      setDependencyWarning(
        `Some permissions could not be removed because permissions in other modules depend on them: ${blocked.join(", ")}`
      );
    } else {
      setDependencyWarning(null);
    }
  };

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    return catalog.filter((p) => {
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
  }, [catalog, selectedModule, searchQuery]);

  // Group filtered catalog by module
  const groupedCatalog = useMemo(() => {
    const map: Record<string, RbacPermission[]> = {};
    for (const p of filteredCatalog) {
      if (!map[p.module]) map[p.module] = [];
      map[p.module].push(p);
    }
    return map;
  }, [filteredCatalog]);

  const handleSave = async () => {
    if (!role) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSavePermissions(role.id, Array.from(selectedSlugs));
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update role permissions.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !role) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4 my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
              <SlidersHorizontal size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                  Configure Permissions: {role.name}
                </h2>
                {role.is_system && (
                  <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 text-[9px] font-extrabold uppercase font-mono">
                    System Role
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Assign granular permissions with live prerequisite dependency validation.
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

        {/* Dependency Notice / Warning Alert */}
        {dependencyWarning && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs shrink-0 animate-in fade-in duration-200">
            <AlertTriangle size={15} className="shrink-0" />
            <span className="flex-1 text-[11px]">{dependencyWarning}</span>
            <button
              type="button"
              onClick={() => setDependencyWarning(null)}
              className="text-amber-500 hover:text-amber-400 p-0.5"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs shrink-0">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search, Domain Filter, and Stats Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
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
            <option value="ALL">All Domains ({catalog.length})</option>
            {modules.map((mod) => (
              <option key={mod} value={mod}>
                {mod}
              </option>
            ))}
          </select>

          <div className="px-3 py-1.5 rounded-xl bg-secondary/50 border border-border/60 text-[11px] font-mono shrink-0">
            Selected: <span className="font-bold text-foreground">{selectedSlugs.size}</span> / {catalog.length}
          </div>
        </div>

        {/* Permissions List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-[300px]">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-xs font-mono">Loading permission catalog...</span>
            </div>
          ) : Object.keys(groupedCatalog).length === 0 ? (
            <div className="py-20 text-center text-muted-foreground text-xs italic">
              No matching permissions found.
            </div>
          ) : (
            Object.entries(groupedCatalog).map(([moduleName, perms]) => {
              const selectedInModule = perms.filter((p) => selectedSlugs.has(p.slug)).length;
              return (
                <div key={moduleName} className="rounded-xl border border-border/80 bg-card overflow-hidden">
                  {/* Module Group Header */}
                  <div className="px-3.5 py-2.5 bg-secondary/40 border-b border-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-foreground font-mono">
                        {moduleName}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-secondary text-[10px] font-mono text-muted-foreground">
                        {selectedInModule} / {perms.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectAllInModule(moduleName)}
                        className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-mono"
                      >
                        Select All
                      </button>
                      <span className="text-muted-foreground/40">•</span>
                      <button
                        type="button"
                        onClick={() => handleDeselectAllInModule(moduleName)}
                        className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-mono"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Permissions in Module */}
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 gap-px bg-border/40">
                    {perms.map((perm) => {
                      const isChecked = selectedSlugs.has(perm.slug);
                      const hasPrereqs = perm.requires && perm.requires.length > 0;

                      return (
                        <div
                          key={perm.slug}
                          onClick={() => handleTogglePermission(perm.slug)}
                          className={`p-3 bg-card flex items-start gap-2.5 transition-colors cursor-pointer select-none ${
                            isChecked ? "bg-foreground/[0.02]" : "hover:bg-secondary/30"
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

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={`font-bold text-xs truncate ${isChecked ? "text-foreground" : "text-muted-foreground"}`}>
                                {perm.name}
                              </span>
                              <span className="text-[9px] font-mono text-muted-foreground/80 shrink-0">
                                {perm.action}
                              </span>
                            </div>

                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                              {perm.description || perm.slug}
                            </p>

                            {/* Dependencies preview */}
                            {hasPrereqs && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono pt-0.5">
                                <CornerDownRight size={10} className="shrink-0 text-amber-500" />
                                <span className="truncate">Requires: {perm.requires?.join(", ")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
            <Info size={13} />
            <span className="hidden sm:inline">Checking high-level actions automatically selects prerequisite dependencies.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-foreground text-background text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
            >
              {submitting ? "Saving..." : `Save Permissions (${selectedSlugs.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
