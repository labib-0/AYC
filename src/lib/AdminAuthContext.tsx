"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { adminAuthService } from "@/services/admin/admin-auth.service";
import { rbacService, MyRbacProfile } from "@/services/admin/rbac.service";
import { User } from "@/types/api";

interface AdminAuthContextType {
  adminUser: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  rbacProfile: MyRbacProfile | null;
  can: (permissionSlug: string) => boolean;
  canAny: (permissionSlugs: string[]) => boolean;
  canAll: (permissionSlugs: string[]) => boolean;
  signInAdmin: (email: string, password: string) => Promise<{ error?: string; user?: User }>;
  signOutAdmin: () => Promise<void>;
  refreshAdminSession: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [rbacProfile, setRbacProfile] = useState<MyRbacProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const user = await adminAuthService.verifyAdminSession();
      if (user && user.role === "admin") {
        setAdminUser(user);
        // Load effective permissions from PostgreSQL RBAC backend
        try {
          const profile = await rbacService.getMyPermissions();
          setRbacProfile(profile);
        } catch (rbacErr) {
          console.warn("Failed to resolve administrator RBAC profile:", rbacErr);
          setRbacProfile(null);
        }
      } else {
        setAdminUser(null);
        setRbacProfile(null);
      }
    } catch (err) {
      console.warn("Admin session resolution notice:", err);
      setAdminUser(null);
      setRbacProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();

    const handleAuthChange = () => {
      fetchSession();
    };

    window.addEventListener("ayaan:admin-auth-changed", handleAuthChange);
    return () => {
      window.removeEventListener("ayaan:admin-auth-changed", handleAuthChange);
    };
  }, [fetchSession]);

  const isSuperAdmin = useMemo(() => {
    return Boolean(
      (adminUser as any)?.is_super_admin ||
      rbacProfile?.is_super_admin
    );
  }, [adminUser, rbacProfile]);

  const effectiveSet = useMemo(() => {
    return new Set(rbacProfile?.effective_permissions || []);
  }, [rbacProfile]);

  const can = useCallback((permissionSlug: string): boolean => {
    if (!adminUser || adminUser.role !== "admin") return false;
    if (isSuperAdmin) return true;
    return effectiveSet.has(permissionSlug);
  }, [adminUser, isSuperAdmin, effectiveSet]);

  const canAny = useCallback((permissionSlugs: string[]): boolean => {
    if (!adminUser || adminUser.role !== "admin") return false;
    if (isSuperAdmin) return true;
    return permissionSlugs.some((slug) => effectiveSet.has(slug));
  }, [adminUser, isSuperAdmin, effectiveSet]);

  const canAll = useCallback((permissionSlugs: string[]): boolean => {
    if (!adminUser || adminUser.role !== "admin") return false;
    if (isSuperAdmin) return true;
    return permissionSlugs.every((slug) => effectiveSet.has(slug));
  }, [adminUser, isSuperAdmin, effectiveSet]);

  const signInAdmin = async (email: string, password: string) => {
    try {
      const res = await adminAuthService.loginAdmin({ email, password });
      if (res?.user) {
        setAdminUser(res.user);
        try {
          const profile = await rbacService.getMyPermissions();
          setRbacProfile(profile);
        } catch {
          setRbacProfile(null);
        }
        return { user: res.user };
      }
      return { error: "Failed to authenticate administrator." };
    } catch (err: any) {
      return { error: err?.message || "Invalid administrator credentials." };
    }
  };

  const signOutAdmin = async () => {
    try {
      await adminAuthService.logoutAdmin();
    } finally {
      setAdminUser(null);
      setRbacProfile(null);
    }
  };

  const refreshAdminSession = async () => {
    await fetchSession();
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        loading,
        isAdmin: Boolean(adminUser && adminUser.role === "admin"),
        isSuperAdmin,
        rbacProfile,
        can,
        canAny,
        canAll,
        signInAdmin,
        signOutAdmin,
        refreshAdminSession,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}

export function useOptionalAdminAuth() {
  return useContext(AdminAuthContext);
}

export { AdminAuthContext };
export type { AdminAuthContextType };
