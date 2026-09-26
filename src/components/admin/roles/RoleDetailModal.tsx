"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Layers, 
  Lock, 
  Key, 
  Users, 
  CheckCircle2, 
  CornerDownRight, 
  SlidersHorizontal,
  Mail
} from "lucide-react";
import { RbacRole, RbacRoleDetail, rbacService } from "@/services/admin/rbac.service";

export interface RoleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: RbacRole | null;
  onManagePermissions: (role: RbacRole) => void;
}

export default function RoleDetailModal({
  isOpen,
  onClose,
  role,
  onManagePermissions,
}: RoleDetailModalProps) {
  const [detail, setDetail] = useState<RbacRoleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"permissions" | "admins">("permissions");

  useEffect(() => {
    if (!isOpen || !role) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const data = await rbacService.getRole(role.id);
        setDetail(data);
      } catch (err) {
        console.error("Failed to load role details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, role]);

  if (!isOpen || !role) return null;

  const isSystem = Boolean(role.is_system);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                isSystem
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "bg-secondary border-border text-foreground"
              }`}
            >
              {isSystem ? <Lock size={16} /> : <Key size={16} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground">
                  {role.name}
                </h2>
                {isSystem ? (
                  <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 text-[9px] font-extrabold uppercase font-mono">
                    System Role
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded bg-secondary text-foreground border border-border text-[9px] font-extrabold uppercase font-mono">
                    Custom Role
                  </span>
                )}
              </div>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{role.slug}</p>
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

        {/* Description Banner */}
        {role.description && (
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/60 text-xs text-muted-foreground shrink-0">
            {role.description}
          </div>
        )}

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("permissions")}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "permissions"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            Effective Permissions ({detail?.effective_permissions_count ?? detail?.effective_permissions?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("admins")}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === "admins"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            Assigned Admins ({detail?.admins?.length ?? 0})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-[220px]">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span className="text-xs font-mono">Loading role details...</span>
            </div>
          ) : activeTab === "permissions" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono pb-1">
                <span>
                  Direct: <strong className="text-foreground">{detail?.permission_count ?? 0}</strong> • Effective (with dependencies): <strong className="text-foreground">{detail?.effective_permissions_count ?? 0}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onManagePermissions(role);
                  }}
                  className="text-primary hover:underline font-bold"
                >
                  Configure Permissions
                </button>
              </div>

              {detail?.effective_permissions && detail.effective_permissions.length > 0 ? (
                <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden">
                  {detail.effective_permissions.map((p) => (
                    <div key={p.slug} className="p-2.5 flex items-center justify-between gap-2 hover:bg-secondary/20">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-foreground">{p.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{p.slug}</span>
                        </div>
                        {p.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{p.description}</p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {p.is_direct ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[9px] font-bold font-mono">
                            <CheckCircle2 size={10} />
                            <span>Direct</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-bold font-mono">
                            <CornerDownRight size={10} />
                            <span>Dependency</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-xs italic">
                  No permissions assigned to this role yet.
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {detail?.admins && detail.admins.length > 0 ? (
                <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden">
                  {detail.admins.map((admin) => (
                    <div key={admin.id} className="p-3 flex items-center justify-between gap-2 hover:bg-secondary/20">
                      <div>
                        <div className="font-bold text-xs text-foreground">{admin.name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail size={12} />
                          <span>{admin.email}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-xs italic">
                  No administrators are currently assigned this role.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-border/60 shrink-0">
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
