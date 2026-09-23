import { User } from "@/types/api";
import { mockStore } from "@/lib/mock-data/mock-store";

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
   * Authenticates an administrator against mockStore user records and establishes an isolated admin session.
   */
  async loginAdmin(credentials: AdminLoginCredentials): Promise<AdminAuthResponse> {
    const email = (credentials.email || "").trim().toLowerCase();
    const password = credentials.password || "";

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
    }

    return { user, token };
  }

  /**
   * Terminates ONLY the admin session without affecting customer storefront sessions.
   */
  async logoutAdmin(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem(ADMIN_STORAGE_KEYS.ADMIN_SESSION);
      localStorage.removeItem(ADMIN_STORAGE_KEYS.ADMIN_TOKEN);
    }
  }

  /**
   * Prepares or updates demo admin credentials.
   */
  getDemoCredentials(): { email: string; password: string; name: string } {
    return {
      email: "admin@ayaanclothing.com",
      password: "admin123",
      name: "Ayaan Operations Admin",
    };
  }
}

export const adminAuthService = new AdminAuthService();
