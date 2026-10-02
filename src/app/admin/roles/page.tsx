"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  rbacService, 
  RbacRole, 
  CreateRoleInput, 
  UpdateRoleInput 
} from "@/services/admin/rbac.service";
import {
  RolesHeader,
  RolesToolbar,
  RolesTable,
  RoleFormModal,
  RolePermissionsModal,
  RoleDetailModal,
  RoleDeleteDialog,
} from "@/components/admin/roles";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

export default function RolesPage() {
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RbacRole | null>(null);

  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [configuringRole, setConfiguringRole] = useState<RbacRole | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailRole, setDetailRole] = useState<RbacRole | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RbacRole | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadRoles = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await rbacService.getRoles(true);
      setRoles(data);
    } catch (err: any) {
      showToast(err?.message || "Failed to load roles.", "error");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRoles(true);
    showToast("RBAC roles refreshed.", "success");
  };

  // Filtered roles
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      if (typeFilter === "system" && !role.is_system) return false;
      if (typeFilter === "custom" && role.is_system) return false;
      if (statusFilter === "active" && !role.is_active) return false;
      if (statusFilter === "inactive" && role.is_active) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = role.name.toLowerCase().includes(q);
        const matchesSlug = role.slug.toLowerCase().includes(q);
        const matchesDesc = Boolean(role.description && role.description.toLowerCase().includes(q));
        return matchesName || matchesSlug || matchesDesc;
      }
      return true;
    });
  }, [roles, typeFilter, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = roles.length;
    const system = roles.filter((r) => r.is_system).length;
    const custom = roles.filter((r) => !r.is_system).length;
    const active = roles.filter((r) => r.is_active).length;
    return { total, system, custom, active };
  }, [roles]);

  // Actions
  const handleOpenCreate = () => {
    setEditingRole(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (role: RbacRole) => {
    setEditingRole(role);
    setIsFormModalOpen(true);
  };

  const handleOpenManagePermissions = (role: RbacRole) => {
    setConfiguringRole(role);
    setIsPermissionsModalOpen(true);
  };

  const handleOpenViewDetails = (role: RbacRole) => {
    setDetailRole(role);
    setIsDetailModalOpen(true);
  };

  const handleOpenDelete = (role: RbacRole) => {
    setDeletingRole(role);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveRole = async (data: CreateRoleInput | UpdateRoleInput) => {
    if (editingRole) {
      await rbacService.updateRole(editingRole.id, data as UpdateRoleInput);
      showToast(`Role '${data.name || editingRole.name}' updated successfully.`, "success");
    } else {
      await rbacService.createRole(data as CreateRoleInput);
      showToast(`Custom role '${data.name}' created successfully.`, "success");
    }
    await loadRoles(true);
  };

  const handleSavePermissions = async (roleId: number | string, permissionSlugs: string[]) => {
    await rbacService.syncRolePermissions(roleId, permissionSlugs);
    showToast(`Role permissions updated successfully (${permissionSlugs.length} permissions).`, "success");
    await loadRoles(true);
  };

  const handleConfirmDelete = async (roleId: number | string) => {
    await rbacService.deleteRole(roleId);
    showToast("Role deleted successfully.", "success");
    await loadRoles(true);
  };

  return (
    <AdminPageGate permission="role.view" moduleName="Roles & Permissions">
      <div className="space-y-6 w-full max-w-full pb-16">
      {/* Header */}
      <RolesHeader
        stats={stats}
        onCreateRole={handleOpenCreate}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Toolbar */}
      <RolesToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        totalResults={filteredRoles.length}
      />

      {/* Roles Table */}
      {loading ? (
        <div className="rounded-xl border border-border/80 bg-card p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-mono">Loading RBAC roles...</span>
        </div>
      ) : (
        <RolesTable
          roles={filteredRoles}
          onEdit={handleOpenEdit}
          onManagePermissions={handleOpenManagePermissions}
          onViewDetails={handleOpenViewDetails}
          onDelete={handleOpenDelete}
        />
      )}

      {/* Modals */}
      <RoleFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        role={editingRole}
        onSave={handleSaveRole}
      />

      <RolePermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        role={configuringRole}
        onSavePermissions={handleSavePermissions}
      />

      <RoleDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        role={detailRole}
        onManagePermissions={handleOpenManagePermissions}
      />

      <RoleDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        role={deletingRole}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Toast notifications */}
      <ProductToast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AdminPageGate>
  );
}
