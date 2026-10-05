import { User } from "@/types/api";
import { mockStore } from "@/lib/mock-data/mock-store";
import { apiClient } from "@/services/api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";

export const ADMIN_STORAGE_KEYS = {
  ADMIN_SESSION: "ayaan_admin_session",
  ADMIN_TOKEN: "ayaan_admin_token",
};

export interface AdminLoginCredentials {
  email: string;
  password: string;
}

export interface AdminAuthResponse {
  user: User;
  token: string;
}

export class AdminAuthService {
  /**
   * Retrieves the currently authenticated admin user from the dedicated admin session storage.
   */
  getAdminUser(): User | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(ADMIN_STORAGE_KEYS.ADMIN_SESSION);
      if (!raw) return null;
      const user = JSON.parse(raw) as User;
      if (user && user.role === "admin") {
        return user;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves the raw admin token from localStorage.
   */
  getAdminToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN);
  }

  /**
   * Validates the active admin session with the Laravel backend.
   * If the token is expired or unauthorized, clears local session and returns null.
   */
  async verifyAdminSession(): Promise<User | null> {
    if (typeof window === "undefined") return null;

    const token = this.getAdminToken();
    if (!token) {
      return null;
    }

    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>("/auth/me", { token });
        const userData = "data" in res && res.data ? res.data : res;
        if (userData && userData.role === "admin") {
          localStorage.setItem(ADMIN_STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(userData));
          apiClient.setAdminToken(token);
          return userData;
        }
        // Account does not have admin privileges
        this.clearAdminSession();
        return null;
      } catch (err: any) {
        if (err?.status === 401 || err?.status === 403) {
          this.clearAdminSession();
          return null;
        }
        // Fallback to cached admin user if transient network error
        return this.getAdminUser();
      }
    }

    return this.getAdminUser();
  }

  /**
   * Clears all local admin session artifacts.
   */
  clearAdminSession(): void {
    if (typeof window !== "undefined") {
      const hadSession = Boolean(
        localStorage.getItem(ADMIN_STORAGE_KEYS.ADMIN_SESSION) ||
        localStorage.getItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN)
      );
      localStorage.removeItem(ADMIN_STORAGE_KEYS.ADMIN_SESSION);
      localStorage.removeItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN);
      if (hadSession) {
        window.dispatchEvent(new CustomEvent("ayaan:admin-auth-changed", { detail: { user: null } }));
      }
    }
  }

  /**
   * Authenticates an administrator against Laravel backend (or mockStore fallback in frontend-only mode)
   * and establishes an isolated admin session.
   */
  async loginAdmin(credentials: AdminLoginCredentials): Promise<AdminAuthResponse> {
    const email = (credentials.email || "").trim().toLowerCase();
    const password = credentials.password || "";

    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>("/auth/admin/login", { email, password });
      const authData = "data" in res && res.data ? res.data : res;
      const user = authData?.user;
      const token = authData?.token;

      if (!user) {
        throw new Error("Invalid response received from authentication server.");
      }

      if (user.role !== "admin") {
        throw new Error("Access Denied: This account does not possess administrator privileges.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(ADMIN_STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(user));
        localStorage.setItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN, token);
        window.dispatchEvent(new CustomEvent("ayaan:admin-auth-changed", { detail: { user, token } }));
      }
      apiClient.setAdminToken(token);

      return { user, token };
    }

    const user = mockStore.getUserByEmail(email);

    if (!user) {
      throw new Error("Administrator account not found with the provided email.");
    }

    if (user.password && user.password !== password) {
      throw new Error("Invalid administrator password provided.");
    }

    if (user.role !== "admin") {
      throw new Error("Access Denied: This account does not possess administrator privileges.");
    }

    const token = `admin_token_${user.id}_${Date.now()}`;

    if (typeof window !== "undefined") {
      localStorage.setItem(ADMIN_STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(user));
      localStorage.setItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN, token);
      window.dispatchEvent(new CustomEvent("ayaan:admin-auth-changed", { detail: { user, token } }));
    }

    return { user, token };
  }

  /**
   * Terminates ONLY the admin session without affecting customer storefront sessions.
   */
  async logoutAdmin(): Promise<void> {
    if (!isFrontendOnly()) {
      try {
        await apiClient.post("/auth/logout");
      } catch {}
    }
    this.clearAdminSession();
    apiClient.removeAdminToken();
  }

  /**
   * Prepares demo admin credentials matching Phase 7 specifications.
   */
  getDemoCredentials(): { email: string; password: string; name: string } {
    return {
      email: "admin@ayaanclothing.com",
      password: "password123",
      name: "Ayaan Admin",
    };
  }
}

export const adminAuthService = new AdminAuthService();
