"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  MoreVertical, 
  Edit3, 
  KeyRound, 
  Power, 
  Trash2, 
  Shield, 
  Eye,
  CheckCircle2,
  XCircle,
  Layers,
  Crown
} from "lucide-react";
import { AdminUserRecord } from "@/services/admin/admin-user.service";

export interface AdminTableProps {
  admins: AdminUserRecord[];
  currentUserId?: string | number;
  isCurrentUserSuperAdmin: boolean;
  onEdit: (admin: AdminUserRecord) => void;
  onAssignRoles: (admin: AdminUserRecord) => void;
  onInspectPermissions: (admin: AdminUserRecord) => void;
  onResetPassword: (admin: AdminUserRecord) => void;
  onToggleStatus: (admin: AdminUserRecord) => void;
  onDelete: (admin: AdminUserRecord) => void;
  togglingId?: string | number | null;
}

export default function AdminTable({
  admins,
  currentUserId,
  isCurrentUserSuperAdmin,
  onEdit,
  onAssignRoles,
  onInspectPermissions,
  onResetPassword,
  onToggleStatus,
  onDelete,
  togglingId,
}: AdminTableProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | number | null>(null);

  const toggleMenu = (id: string | number) => {
    setActiveMenuId((prev) => (prev === id ? null : id));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/80 bg-secondary/30 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground font-mono">
              <th className="py-3 px-4">Administrator</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Assigned Roles</th>
              <th className="py-3 px-4 text-center">Effective Perms</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {admins.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Shield size={28} className="text-muted-foreground/60" />
                    <p className="font-semibold text-xs">No administrators found.</p>
                    <p className="text-[11px] text-muted-foreground/80">
                      Try adjusting your search criteria or create a new administrator account.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              admins.map((admin) => {
                const isSelf = currentUserId && String(admin.id) === String(currentUserId);
                const isSuper = Boolean(admin.is_super_admin);
                const isToggling = togglingId === admin.id;

                return (
                  <tr
                    key={admin.id}
                    className="hover:bg-secondary/20 transition-colors group"
                  >
                    {/* Administrator Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                            isSuper
                              ? "bg-amber-500/10 border border-amber-500/30 text-amber-500"
                              : "bg-secondary border border-border text-foreground"
                          }`}
                        >
                          {isSuper ? <Crown size={16} /> : getInitials(admin.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground truncate">{admin.name}</span>
                            {isSuper && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-extrabold uppercase tracking-widest font-mono">
                                Super Admin
                              </span>
                            )}
                            {isSelf && (
                              <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[9px] font-extrabold uppercase tracking-widest font-mono">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">{admin.email}</div>
                          {admin.phone && (
                            <div className="text-[10px] text-muted-foreground/70 font-mono truncate">{admin.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono ${
                          admin.status === "active"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            admin.status === "active" ? "bg-emerald-500" : "bg-muted-foreground"
                          }`}
                        />
                        {admin.status}
                      </span>
                    </td>

                    {/* Assigned Roles */}
                    <td className="py-3 px-4">
                      {isSuper ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-wider font-mono border border-primary/20">
                          <ShieldCheck size={12} />
                          <span>All Roles (Super Authority)</span>
                        </span>
                      ) : admin.roles && admin.roles.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1 max-w-[320px]">
                          {admin.roles.slice(0, 3).map((r) => (
                            <span
                              key={r.id}
                              className="px-2 py-0.5 rounded-md bg-secondary/80 text-foreground text-[10px] font-semibold border border-border/80 font-mono"
                            >
                              {r.name}
                            </span>
                          ))}
                          {admin.roles.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground text-[10px] font-bold font-mono">
                              +{admin.roles.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">No roles assigned</span>
                      )}
                    </td>

                    {/* Effective Permissions Count & Inspect */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onInspectPermissions(admin)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/80 bg-secondary/30 hover:bg-secondary text-foreground hover:border-primary/40 text-[11px] font-mono font-bold transition-all cursor-pointer group/btn"
                        title="Inspect effective permissions and dependency provenance"
                      >
                        <Eye size={12} className="text-muted-foreground group-hover/btn:text-primary transition-colors" />
                        <span>
                          {isSuper ? "All (139)" : admin.effective_permissions_count ?? 0}
                        </span>
                      </button>
                    </td>

                    {/* Created At */}
                    <td className="py-3 px-4 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                      {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : "—"}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 relative">
                        {/* Quick Inspect */}
                        <button
                          type="button"
                          onClick={() => onInspectPermissions(admin)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="View Effective Permissions"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Quick Edit */}
                        <button
                          type="button"
                          onClick={() => onEdit(admin)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="Edit Administrator"
                        >
                          <Edit3 size={14} />
                        </button>

                        {/* More Actions Dropdown Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => toggleMenu(admin.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            <MoreVertical size={14} />
                          </button>

                          {activeMenuId === admin.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setActiveMenuId(null)}
                              />
                              <div className="absolute right-0 mt-1 w-48 rounded-xl border border-border/80 bg-card p-1.5 shadow-xl z-50 text-left space-y-0.5">
                                {/* Assign Roles */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onAssignRoles(admin);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                                >
                                  <Layers size={13} className="text-muted-foreground" />
                                  <span>Assign RBAC Roles</span>
                                </button>

                                {/* Reset Password */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onResetPassword(admin);
                                  }}
                                  disabled={isSuper && !isCurrentUserSuperAdmin}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                >
                                  <KeyRound size={13} className="text-muted-foreground" />
                                  <span>Reset Password</span>
                                </button>

                                {/* Toggle Status */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onToggleStatus(admin);
                                  }}
                                  disabled={isSelf || (isSuper && !isCurrentUserSuperAdmin) || isToggling}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                >
                                  <Power size={13} className={admin.status === "active" ? "text-amber-500" : "text-emerald-500"} />
                                  <span>{admin.status === "active" ? "Deactivate Account" : "Activate Account"}</span>
                                </button>

                                <div className="border-t border-border/60 my-1" />

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onDelete(admin);
                                  }}
                                  disabled={isSelf || isSuper}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                >
                                  <Trash2 size={13} />
                                  <span>Delete Administrator</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
