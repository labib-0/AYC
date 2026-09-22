"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { UserPlus, Search, Shield, ShieldCheck, UserCheck, Edit2, Trash2, CheckCircle2 } from "lucide-react";
import { mockStore } from "@/lib/mock-data/mock-store";
import { MockUserData } from "@/lib/mock-data/mock-users";
import { useAuth } from "@/lib/AuthContext";
import AdminUserModal from "./AdminUserModal";
import AdminUserDeleteDialog from "./AdminUserDeleteDialog";

export interface AdminUsersSettingsProps {
  onNotify: (message: string) => void;
}

export default function AdminUsersSettings({ onNotify }: AdminUsersSettingsProps) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<MockUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MockUserData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<MockUserData | null>(null);

  const loadUsers = useCallback(() => {
    setLoading(true);
    try {
      const all = mockStore.getUsers();
      // Filter for administrative and sales staff accounts only
      const adminPersonnel = all.filter((u) => u.role === "admin" || u.role === "sales");
      setUsers(adminPersonnel);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) {
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
  }, [users, roleFilter, searchQuery]);

  const handleCreateUser = () => {
    setSelectedUser(null);
    setModalOpen(true);
  };

  const handleEditUser = (user: MockUserData) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleDeleteUserPrompt = (user: MockUserData) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleSaveUser = async (data: Partial<MockUserData>) => {
    const isNew = !selectedUser;
    mockStore.saveUser(data);
    loadUsers();
    onNotify(isNew ? "New admin user created successfully." : "Admin user updated successfully.");
  };

  const handleConfirmDelete = async (user: MockUserData) => {
    const success = mockStore.deleteUser(user.id);
    if (success) {
      loadUsers();
      onNotify(`Admin user ${user.name} removed successfully.`);
    } else {
      throw new Error("Cannot delete active administrator session.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="p-4 bg-card border border-border/80 rounded-2xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search admin staff by name or email..."
              className="w-full pl-10 pr-4 py-2 bg-secondary/40 border border-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: "ALL", label: "All Staff" },
              { id: "admin", label: "Admins" },
              { id: "sales", label: "Sales Desk" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  roleFilter === tab.id
                    ? "bg-foreground text-background"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateUser}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer shadow-sm shrink-0 justify-center"
        >
          <UserPlus size={14} />
          <span>Add Admin User</span>
        </button>
      </div>

      {/* Admin Personnel Table */}
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
            <h3 className="text-sm font-bold text-foreground">No administrative staff found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || roleFilter !== "ALL"
                ? "No admin accounts match your search filter."
                : "No admin staff users registered."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4">Admin User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUsers.map((item) => {
                  const isSelf = currentUser && String(item.id) === String(currentUser.id);

                  return (
                    <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {item.avatar_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={item.avatar_url}
                              alt={item.name}
                              className="w-9 h-9 rounded-xl object-cover border border-border bg-secondary"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold text-sm flex items-center justify-center border border-primary/20">
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground block">
                                {item.name}
                              </span>
                              {isSelf && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground block font-mono">
                              {item.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.role === "admin" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                            <ShieldCheck size={11} />
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                            <UserCheck size={11} />
                            <span>Sales Staff</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground font-mono">
                        {item.phone || "—"}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={10} />
                          <span>Active</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Jan 2026"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditUser(item)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                            title="Edit User"
                          >
                            <Edit2 size={13} />
                          </button>
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUserPrompt(item)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              title="Deactivate User"
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
