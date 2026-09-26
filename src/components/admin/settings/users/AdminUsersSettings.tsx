"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  UserPlus, 
  Search, 
  Shield, 
  ShieldCheck, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Power, 
  RefreshCw,
  Info,
  Users2
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { 
  adminUserService, 
  AdminUserRecord, 
  CreateAdminUserInput, 
  UpdateAdminUserInput 
} from "@/services/admin/admin-user.service";
import AdminUserModal from "./AdminUserModal";
import AdminUserDeleteDialog from "./AdminUserDeleteDialog";

export interface AdminUsersSettingsProps {
  onNotify: (message: string) => void;
}

export default function AdminUsersSettings({ onNotify }: AdminUsersSettingsProps) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [accessLevelFilter, setAccessLevelFilter] = useState<string>("ALL");
  const [togglingId, setTogglingId] = useState<string | number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUserRecord | null>(null);

  const loadUsers = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await adminUserService.getAdminUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load admin users:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUsers(true);
    onNotify("Administrator directory refreshed.");
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter !== "ALL" && u.status !== statusFilter) {
        return false;
      }
      if (accessLevelFilter !== "ALL" && u.access_level !== accessLevelFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesPhone = (u.phone || "").toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesPhone;
      }
      return true;
    });
  }, [users, statusFilter, accessLevelFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const inactive = users.filter((u) => u.status === "inactive").length;
    const superAdmins = users.filter((u) => u.access_level === "super_admin").length;
    return { total, active, inactive, superAdmins };
  }, [users]);

  const handleCreateUser = () => {
    setSelectedUser(null);
    setModalOpen(true);
  };

  const handleEditUser = (user: AdminUserRecord) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleDeleteUserPrompt = (user: AdminUserRecord) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleToggleStatus = async (user: AdminUserRecord) => {
    if (currentUser && String(user.id) === String(currentUser.id)) {
      onNotify("You cannot deactivate your own administrative account session.");
      return;
    }

    setTogglingId(user.id);
    try {
      const nextStatus = user.status === "active" ? "inactive" : "active";
      await adminUserService.toggleAdminStatus(user.id, nextStatus);
      await loadUsers(true);
      onNotify(`Administrator ${user.name} is now ${nextStatus}.`);
    } catch (err: unknown) {
      onNotify(err instanceof Error ? err.message : "Failed to toggle status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveUser = async (data: CreateAdminUserInput | UpdateAdminUserInput) => {
    const isNew = !selectedUser;
    if (isNew) {
      await adminUserService.createAdminUser(data as CreateAdminUserInput);
      onNotify("New administrator account created successfully.");
    } else if (selectedUser) {
      await adminUserService.updateAdminUser(selectedUser.id, data as UpdateAdminUserInput);
      onNotify("Administrator account updated successfully.");
    }
    await loadUsers(true);
  };

  const handleConfirmDelete = async (user: AdminUserRecord) => {
    try {
      await adminUserService.deleteAdminUser(user.id);
      await loadUsers(true);
      onNotify(`Administrator account ${user.name} removed successfully.`);
    } catch (err: unknown) {
      throw err;
    }
  };

  const getAccessLevelBadge = (level: string) => {
    switch (level) {
      case "super_admin":
        return { label: "Super Admin", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
      case "admin":
        return { label: "Operations Admin", color: "bg-primary/10 text-primary border-primary/20" };
      case "manager":
        return { label: "Manager", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
      case "editor":
        return { label: "Editor", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
      default:
        return { label: level, color: "bg-secondary text-muted-foreground border-border" };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Information & Separation Policy Banner */}
      <div className="p-4 rounded-2xl bg-secondary/30 border border-border/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <span>Admin Management</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase">
                System Staff
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage system administrator accounts and staff access credentials.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh administrators"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={handleCreateUser}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer shadow-sm flex-1 sm:flex-none justify-center"
            id="btn-add-admin-user"
          >
            <UserPlus size={14} />
            <span>Add Administrator</span>
          </button>
        </div>
      </div>

      {/* 2. Isolation Business Rule Notice */}
      <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs flex items-start gap-2.5 text-muted-foreground">
        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong className="text-foreground">Strict Account Isolation Policy:</strong> Administrator accounts are internal system-management credentials. They are strictly excluded from the customer directory, total customer count, customer search/filter results, and B2B commercial metrics.
        </span>
      </div>

      {/* 3. Admin Overview KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-border/80 bg-card/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Administrators</span>
            <Users2 size={15} className="text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">{stats.total}</div>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-card/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active Accounts</span>
            <CheckCircle2 size={15} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">{stats.active}</div>
        </div>

        <div className="p-4 rounded-2xl border border-amber-500/20 bg-card/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Inactive / Suspended</span>
            <XCircle size={15} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">{stats.inactive}</div>
        </div>

        <div className="p-4 rounded-2xl border border-purple-500/20 bg-card/70 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Super Admins</span>
            <Shield size={15} className="text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">{stats.superAdmins}</div>
        </div>
      </div>

      {/* 4. Toolbar: Search & Filters */}
      <div className="p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search admin staff by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            id="input-search-admins"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground font-semibold cursor-pointer outline-none focus:ring-1 focus:ring-primary"
            id="select-admin-status-filter"
            aria-label="Filter by Status"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Access Level Filter */}
          <select
            value={accessLevelFilter}
            onChange={(e) => setAccessLevelFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-border bg-secondary/30 text-foreground font-semibold cursor-pointer outline-none focus:ring-1 focus:ring-primary"
            id="select-admin-access-filter"
            aria-label="Filter by Access Level"
          >
            <option value="ALL">All Access Levels</option>
            <option value="super_admin">Super Administrator</option>
            <option value="admin">Operations Admin</option>
            <option value="manager">Operations Manager</option>
            <option value="editor">Content Editor</option>
          </select>

          <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap pl-1">
            {filteredUsers.length} {filteredUsers.length === 1 ? "admin" : "admins"}
          </span>
        </div>
      </div>

      {/* 5. Administrator Accounts Table */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-secondary/50 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Shield size={36} className="mx-auto text-muted-foreground/40" />
            <h3 className="text-sm font-bold text-foreground">No administrator accounts found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || statusFilter !== "ALL" || accessLevelFilter !== "ALL"
                ? "No administrators match your current filter query."
                : "No administrator accounts registered in system."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Role &amp; Permissions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUsers.map((item) => {
                  const isSelf = currentUser && String(item.id) === String(currentUser.id);
                  const accessBadge = getAccessLevelBadge(item.access_level || "super_admin");
                  const isActive = item.status === "active";
                  const isToggling = togglingId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {item.avatar_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={item.avatar_url}
                              alt={item.name}
                              className="w-9 h-9 rounded-xl object-cover border border-border bg-secondary shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold text-sm flex items-center justify-center border border-primary/20 shrink-0">
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground truncate block">
                                {item.name}
                              </span>
                              {isSelf && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase shrink-0">
                                  You
                                </span>
                              )}
                              {item.is_demo && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-secondary text-muted-foreground border border-border uppercase shrink-0">
                                  Demo
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground block font-mono truncate">
                              {item.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role & Permissions Level */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${accessBadge.color}`}>
                            <ShieldCheck size={11} />
                            <span>{accessBadge.label}</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            Role: {item.role}
                          </span>
                        </div>
                      </td>

                      {/* Account Status & Toggle */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 size={10} />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <XCircle size={10} />
                              <span>Inactive</span>
                            </span>
                          )}

                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item)}
                              disabled={isToggling}
                              className={`p-1 rounded-lg border text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                                isActive
                                  ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                                  : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                              }`}
                              title={isActive ? "Deactivate administrator" : "Activate administrator"}
                            >
                              <Power size={11} className={isToggling ? "animate-spin" : ""} />
                              <span>{isActive ? "Disable" : "Activate"}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Contact Phone */}
                      <td className="py-3.5 px-4 text-muted-foreground font-mono whitespace-nowrap">
                        {item.phone || "—"}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditUser(item)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                            title="Edit Administrator"
                          >
                            <Edit2 size={13} />
                          </button>
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUserPrompt(item)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              title="Remove Administrator"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Admin User Modal */}
      <AdminUserModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        user={selectedUser}
        currentUser={currentUser}
        onSave={handleSaveUser}
      />

      {/* Delete / Deactivate Confirmation Dialog */}
      <AdminUserDeleteDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        user={userToDelete}
        currentUser={currentUser}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
