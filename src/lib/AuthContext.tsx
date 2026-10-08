"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authService } from "@/services/auth.service";
import { User, UserProfile } from "@/types/api";

export type { UserProfile };

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any; user?: any; errors?: Record<string, string[]>; status?: number }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    options?: { phone?: string; company_name?: string; role?: "customer" | "admin" }
  ) => Promise<{ error?: any; user?: any; errors?: Record<string, string[]>; status?: number }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ error?: any; user?: any }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        // Security isolation: Customer AuthContext strictly rejects non-customer roles
        if (currentUser.role !== "customer") {
          setUser(null);
          return;
        }
        const nextId = String(currentUser.id);
        setUser((prev) => {
          if (
            prev &&
            prev.id === nextId &&
            prev.email === currentUser.email &&
            prev.role === currentUser.role &&
            prev.name === currentUser.name
          ) {
            return prev;
          }
          return {
            ...currentUser,
            id: nextId,
          };
        });
      } else {
        setUser((prev) => (prev === null ? prev : null));
      }
    } catch (err: any) {
      if (err?.status === 401) {
        setUser(null);
      } else {
        console.warn("Session check non-auth error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();

    // Listen for confirmed session expiration from central API client
    const handleSessionExpired = () => {
      setUser(null);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("ayaan:session_expired", handleSessionExpired);
      return () => {
        window.removeEventListener("ayaan:session_expired", handleSessionExpired);
      };
    }
  }, [fetchSession]);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await authService.login({ email, password });
      if (res?.user) {
        if (res.user.role !== "customer") {
          setUser(null);
          return { error: "These credentials cannot be used for customer login." };
        }
        const u = { ...res.user, id: String(res.user.id) };
        setUser(u);
        return { user: u };
      }
      return { user: null };
    } catch (err: any) {
      const firstValidationMsg = err?.errors
        ? (Object.values(err.errors).flat()[0] as string | undefined)
        : null;
      return {
        error: firstValidationMsg || err?.message || "Sign in failed. Please check your credentials.",
        errors: err?.errors,
        status: err?.status,
      };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    options?: { phone?: string; company_name?: string; role?: "customer" | "admin" }
  ) => {
    try {
      const res = await authService.register({
        name: fullName,
        email,
        password,
        phone: options?.phone,
        company_name: options?.company_name,
        role: options?.role,
      });
      if (res?.user) {
        const u = { ...res.user, id: String(res.user.id) };
        setUser(u);
        return { user: u };
      }
      return { user: null };
    } catch (err: any) {
      const firstValidationMsg = err?.errors
        ? (Object.values(err.errors).flat()[0] as string | undefined)
        : null;
      return {
        error: firstValidationMsg || err?.message || "Registration failed. Please try again.",
        errors: err?.errors,
        status: err?.status,
      };
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      const updated = await authService.updateProfile(data);
      if (updated) {
        const u = { ...user, ...updated, id: String(updated.id) };
        setUser(u);
        return { user: u };
      }
      return { user: null };
    } catch (err: any) {
      return { error: err?.message || err };
    }
  };

  const signOut = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn("Sign out error:", err);
    } finally {
      setUser(null);
    }
  };

  const refreshSession = useCallback(async () => {
    await fetchSession();
  }, [fetchSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
