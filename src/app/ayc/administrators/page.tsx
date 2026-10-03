"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { 
  adminUserService, 
  AdminUserRecord, 
  CreateAdminUserInput, 
  UpdateAdminUserInput 
} from "@/services/admin/admin-user.service";
import { rbacService, RbacRole } from "@/services/admin/rbac.service";
import {
  AdminHeader,
  AdminToolbar,
  AdminTable,
  AdminFormModal,
  AdminPermissionsModal,
  AdminResetPasswordModal,
  AdminDeleteDialog,
  AdminRoleAssignModal,
} from "@/components/admin/administrators";
import ProductToast, { ToastMessage } from "@/components/admin/products/ProductToast";
import { AdminPageGate } from "@/components/admin/auth/AdminPageGate";

export default function AdministratorsPage() {
  const { user: currentUser } = useAuth();

  const [admins, setAdmins] = useState<AdminUserRecord[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RbacRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [togglingId, setTogglingId] = useState<string | number | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUserRecord | null>(null);

  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [inspectingAdmin, setInspectingAdmin] = useState<AdminUserRecord | null>(null);

  const [isRoleAssignModalOpen, setIsRoleAssignModalOpen] = useState(false);
  const [roleAssignAdmin, setRoleAssignAdmin] = useState<AdminUserRecord | null>(null);

  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetPasswordAdmin, setResetPasswordAdmin] = useState<AdminUserRecord | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUserRecord | null>(null);

  // My RBAC state
  const isCurrentUserSuperAdmin = Boolean(
    currentUser && ((currentUser as any).is_super_admin || (currentUser as any).access_level === "super_admin")
  );

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [adminList, rolesList] = await Promise.all([
        adminUserService.getAdministrators(),
        rbacService.getRoles(true),
      ]);
      setAdmins(adminList);
      setAvailableRoles(rolesList);
    } catch (err: any) {
      showToast(err?.message || "Failed to load administrators directory.", "error");
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
    showToast("Administrator accounts refreshed.", "success");
  };

  // Filtered List
  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) {
        return false;
      }
      if (roleFilter !== "ALL") {
        if (!a.roles || !a.roles.some((r) => r.slug === roleFilter)) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = a.name.toLowerCase().includes(q);
        const matchesEmail = a.email.toLowerCase().includes(q);
        const matchesPhone = Boolean(a.phone && a.phone.toLowerCase().includes(q));
        return matchesName || matchesEmail || matchesPhone;
      }
      return true;
    });
  }, [admins, statusFilter, roleFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = admins.length;
    const active = admins.filter((a) => a.status === "active").length;
    const inactive = admins.filter((a) => a.status === "inactive").length;
    const superAdmins = admins.filter((a) => a.is_super_admin).length;
    return { total, active, inactive, superAdmins };
  }, [admins]);

  // Actions
  const handleOpenCreate = () => {
    setEditingAdmin(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (admin: AdminUserRecord) => {
    setEditingAdmin(admin);
    setIsFormModalOpen(true);
  };

  const handleOpenAssignRoles = (admin: AdminUserRecord) => {
    setRoleAssignAdmin(admin);
    setIsRoleAssignModalOpen(true);
  };

  const handleOpenInspectPermissions = (admin: AdminUserRecord) => {
    setInspectingAdmin(admin);
    setIsPermissionsModalOpen(true);
  };

  const handleOpenResetPassword = (admin: AdminUserRecord) => {
    setResetPasswordAdmin(admin);
    setIsResetPasswordModalOpen(true);
  };

  const handleOpenDelete = (admin: AdminUserRecord) => {
    setDeletingAdmin(admin);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveAdmin = async (payload: CreateAdminUserInput | UpdateAdminUserInput) => {
    if (editingAdmin) {
      await adminUserService.updateAdminUser(editingAdmin.id, payload);
      showToast(`Administrator '${payload.name || editingAdmin.name}' updated successfully.`, "success");
    } else {
      await adminUserService.createAdminUser(payload as CreateAdminUserInput);
      showToast(`Administrator '${payload.name}' created successfully.`, "success");
    }
    await loadData(true);
  };

  const handleSaveRoleAssignments = async (adminId: number | string, roleSlugs: string[]) => {
    await adminUserService.updateAdminUser(adminId, { role_slugs: roleSlugs });
    showToast("Role assignments updated successfully.", "success");
    await loadData(true);
  };

  const handleToggleStatus = async (admin: AdminUserRecord) => {
    setTogglingId(admin.id);
    const nextStatus = admin.status === "active" ? "inactive" : "active";
    try {
      await adminUserService.toggleStatus(admin.id, nextStatus);
      showToast(`Administrator '${admin.name}' ${nextStatus} successfully.`, "success");
      await loadData(true);
    } catch (err: any) {
      showToast(err?.message || "Failed to update account status.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmResetPassword = async (adminId: number | string, password: string) => {
    await adminUserService.resetPassword(adminId, password);
    showToast("Password reset successfully. Active sessions revoked.", "success");
  };

  const handleConfirmDelete = async (adminId: number | string) => {
    await adminUserService.deleteAdminUser(adminId);
    showToast("Administrator account removed successfully.", "success");
    await loadData(true);
  };

  return (
    <AdminPageGate permission="admin.view" moduleName="Administrator Accounts">
      <div className="space-y-6 w-full max-w-full pb-16">
      {/* Header with stats */}
      <AdminHeader
        stats={stats}
        onAddAdmin={handleOpenCreate}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Toolbar / Search / Filter */}
      <AdminToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        availableRoles={availableRoles}
        totalResults={filteredAdmins.length}
      />

      {/* Administrators Table */}
      {loading ? (
        <div className="rounded-xl border border-border/80 bg-card p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-mono">Loading administrator accounts...</span>
        </div>
      ) : (
        <AdminTable
          admins={filteredAdmins}
          currentUserId={currentUser?.id}
          isCurrentUserSuperAdmin={isCurrentUserSuperAdmin}
          onEdit={handleOpenEdit}
          onAssignRoles={handleOpenAssignRoles}
          onInspectPermissions={handleOpenInspectPermissions}
          onResetPassword={handleOpenResetPassword}
          onToggleStatus={handleToggleStatus}
          onDelete={handleOpenDelete}
          togglingId={togglingId}
        />
      )}

      {/* Modals */}
      <AdminFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        admin={editingAdmin}
        availableRoles={availableRoles}
        currentUserId={currentUser?.id}
        isCurrentUserSuperAdmin={isCurrentUserSuperAdmin}
        onSave={handleSaveAdmin}
      />

      <AdminRoleAssignModal
        isOpen={isRoleAssignModalOpen}
        onClose={() => setIsRoleAssignModalOpen(false)}
        admin={roleAssignAdmin}
        availableRoles={availableRoles}
        onSaveRoles={handleSaveRoleAssignments}
      />

      <AdminPermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        admin={inspectingAdmin}
      />

      <AdminResetPasswordModal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        admin={resetPasswordAdmin}
        onReset={handleConfirmResetPassword}
      />

      <AdminDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        admin={deletingAdmin}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Toast notifications */}
      <ProductToast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </AdminPageGate>
  );
}
