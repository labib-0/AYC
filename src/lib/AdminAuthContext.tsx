"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { adminAuthService } from "@/services/admin/admin-auth.service";
import { User } from "@/types/api";

interface AdminAuthContextType {
  adminUser: User | null;
  loading: boolean;
  isAdmin: boolean;
  signInAdmin: (email: string, password: string) => Promise<{ error?: string; user?: User }>;
  signOutAdmin: () => Promise<void>;
  refreshAdminSession: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const user = await adminAuthService.verifyAdminSession();
      if (user && user.role === "admin") {
        setAdminUser(user);
      } else {
        setAdminUser(null);
      }
    } catch (err) {
      console.warn("Admin session resolution notice:", err);
      setAdminUser(null);
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

  const signInAdmin = async (email: string, password: string) => {
    try {
      const res = await adminAuthService.loginAdmin({ email, password });
      if (res?.user) {
        setAdminUser(res.user);
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
