"use client";

import React from "react";
import { 
  Lock, 
  Key, 
  Shield, 
  Edit3, 
  Trash2, 
  Users, 
  CheckCircle2, 
  Layers, 
  Eye,
  SlidersHorizontal 
} from "lucide-react";
import { RbacRole } from "@/services/admin/rbac.service";

export interface RolesTableProps {
  roles: RbacRole[];
  onEdit: (role: RbacRole) => void;
  onManagePermissions: (role: RbacRole) => void;
  onViewDetails: (role: RbacRole) => void;
  onDelete: (role: RbacRole) => void;
}

export default function RolesTable({
  roles,
  onEdit,
  onManagePermissions,
  onViewDetails,
  onDelete,
}: RolesTableProps) {
  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/80 bg-secondary/30 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground font-mono">
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4 text-center">Assigned Admins</th>
              <th className="py-3 px-4 text-center">Permissions</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {roles.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Layers size={28} className="text-muted-foreground/60" />
                    <p className="font-semibold text-xs">No roles found.</p>
                    <p className="text-[11px] text-muted-foreground/80">
                      Try adjusting your filters or create a new custom role.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              roles.map((role) => {
                const isSystem = Boolean(role.is_system);
                const adminCount = role.admin_count ?? 0;
                const canDelete = !isSystem && adminCount === 0;

                return (
                  <tr
                    key={role.id}
                    className="hover:bg-secondary/20 transition-colors group"
                  >
                    {/* Role Name & Slug */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            isSystem
                              ? "bg-primary/10 border-primary/20 text-primary"
                              : "bg-secondary border-border text-foreground"
                          }`}
                        >
                          {isSystem ? <Lock size={15} /> : <Key size={15} />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground text-xs truncate">
                            {role.name}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground truncate">
                            {role.slug}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 text-muted-foreground max-w-xs truncate text-[11px]">
                      {role.description || <span className="italic text-muted-foreground/60">No description provided</span>}
                    </td>

                    {/* Type Badge */}
                    <td className="py-3 px-4">
                      {isSystem ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-extrabold uppercase tracking-wider font-mono">
                          <Lock size={10} />
                          <span>System Role</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-foreground border border-border text-[10px] font-extrabold uppercase tracking-wider font-mono">
                          <Key size={10} />
                          <span>Custom Role</span>
                        </span>
                      )}
                    </td>

                    {/* Assigned Admins */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onViewDetails(role)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/80 bg-secondary/30 hover:bg-secondary text-foreground text-[11px] font-mono font-bold transition-all cursor-pointer"
                        title="View administrators holding this role"
                      >
                        <Users size={12} className="text-muted-foreground" />
                        <span>{adminCount}</span>
                      </button>
                    </td>

                    {/* Permission Count */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onManagePermissions(role)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/80 bg-secondary/30 hover:bg-secondary text-foreground hover:border-primary/40 text-[11px] font-mono font-bold transition-all cursor-pointer group/btn"
                        title="Manage role permissions"
                      >
                        <SlidersHorizontal size={12} className="text-muted-foreground group-hover/btn:text-primary transition-colors" />
                        <span>{role.permission_count ?? role.permissions?.length ?? 0}</span>
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono ${
                          role.is_active
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            role.is_active ? "bg-emerald-500" : "bg-muted-foreground"
                          }`}
                        />
                        {role.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Manage Permissions */}
                        <button
                          type="button"
                          onClick={() => onManagePermissions(role)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-foreground bg-secondary/70 hover:bg-secondary border border-border/80 transition-colors"
                          title="Configure Permissions"
                        >
                          <SlidersHorizontal size={12} />
                          <span className="hidden sm:inline text-[11px]">Permissions</span>
                        </button>

                        {/* View Details */}
                        <button
                          type="button"
                          onClick={() => onViewDetails(role)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="View Role Details"
                        >
                          <Eye size={14} />
                        </button>

                        {/* Edit Role */}
                        <button
                          type="button"
                          onClick={() => onEdit(role)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="Edit Role"
                        >
                          <Edit3 size={14} />
                        </button>

                        {/* Delete Role */}
                        <button
                          type="button"
                          onClick={() => onDelete(role)}
                          disabled={!canDelete}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          title={
                            isSystem
                              ? "System roles cannot be deleted"
                              : adminCount > 0
                              ? "Cannot delete role while administrators are assigned"
                              : "Delete Role"
                          }
                        >
                          <Trash2 size={14} />
                        </button>
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
