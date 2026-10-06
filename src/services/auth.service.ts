import { apiClient, ApiError } from "./api-client";
import { AuthResponse, User } from "@/types/api";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { mockStore } from "@/lib/mock-data/mock-store";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation?: string;
  phone?: string;
  company_name?: string;
  role?: "customer" | "admin";
}

// Explicit known mock admin emails for test / mock environments only. Substring matching is forbidden.
const EXPLICIT_MOCK_ADMIN_EMAILS = new Set([
  "admin@ayaan-demo.local",
  "admin@ayaanclothing.com",
]);

export class AuthService {
  /**
   * Log in user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>("/auth/login", credentials);
      const authData = "data" in res && res.data ? res.data : (res as AuthResponse);
      if (authData?.token) {
        apiClient.setToken(authData.token);
      }
      if (authData?.user) {
        mockStore.setActiveUser(authData.user);
      }
      return authData;
    }

    const email = credentials.email.trim().toLowerCase();
    const existing = mockStore.getUserByEmail(email);

    if (existing) {
      if (existing.password && existing.password !== credentials.password) {
        throw new ApiError(422, "Invalid email or password provided.");
      }
      const token = `auth_token_${existing.role || "customer"}_${existing.id}`;
      apiClient.setToken(token);
      mockStore.setActiveUser(existing);
      return {
        user: existing,
        token,
      };
    }

    // In mock mode, if logging in with an email not yet in the store, automatically create profile.
    // Explicit mock admin check replaces unsafe substring matching (STF-008 remediation).
    const role: User["role"] = EXPLICIT_MOCK_ADMIN_EMAILS.has(email) ? "admin" : "customer";
    const newUser = mockStore.saveUser({
      name: email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      email,
      password: credentials.password,
      role,
    });

    const token = `auth_token_${newUser.role || "customer"}_${newUser.id}`;
    apiClient.setToken(token);
    mockStore.setActiveUser(newUser);

    return {
      user: newUser,
      token,
    };
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>("/auth/register", data);
      const authData = "data" in res && res.data ? res.data : (res as AuthResponse);
      if (authData?.token) {
        apiClient.setToken(authData.token);
      }
      if (authData?.user) {
        mockStore.setActiveUser(authData.user);
      }
      return authData;
    }

    // Storefront public registration is strictly customer only
    const newUser = mockStore.saveUser({
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone,
      company_name: data.company_name,
      role: "customer",
    });

    const token = `auth_token_${newUser.role || "customer"}_${newUser.id}`;
    apiClient.setToken(token);
    mockStore.setActiveUser(newUser);

    return {
      user: newUser,
      token,
    };
  }

  /**
   * Log out user
   */
  async logout(): Promise<void> {
    if (!isFrontendOnly()) {
      try {
        await apiClient.post("/auth/logout");
      } catch {}
    }
    apiClient.removeToken();
    mockStore.setActiveUser(null);
  }

  /**
   * Get authenticated user profile
   */
  async getCurrentUser(): Promise<User | null> {
    if (!isFrontendOnly()) {
      const token = apiClient.getToken();
      if (!token) return null;
      try {
        const res = await apiClient.get<any>("/auth/me");
        const user = res?.data || res;
        if (user && user.id) {
          mockStore.setActiveUser(user);
          return user;
        }
      } catch (err: any) {
        // HARD RULE (Prompt 7): Only drop auth session if the server genuinely returned 401 Unauthenticated!
        // 500, 502, 503, 504, 429, or network errors (status 0) MUST NOT log out the user!
        if (err?.status === 401) {
          apiClient.removeToken();
          mockStore.setActiveUser(null);
          return null;
        }

        // For temporary server blips or offline transitions, retain the cached active user session
        const cached = mockStore.getActiveUser();
        if (cached) {
          return cached;
        }
        return null;
      }
    }
    return mockStore.getActiveUser();
  }

  /**
   * Update authenticated user profile
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    if (!isFrontendOnly()) {
      const res = await apiClient.put<any>("/users/me", data);
      const updated = res?.data || res;
      if (updated && updated.id) {
        mockStore.setActiveUser(updated);
        return updated;
      }
      return updated;
    }

    const current = mockStore.getActiveUser();
    if (current) {
      const updated = mockStore.saveUser({ ...current, ...data });
      mockStore.setActiveUser(updated);
      return updated;
    }

    return mockStore.saveUser(data);
  }

  /**
   * Request password reset link
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>("/auth/forgot-password", { email });
      return res?.data || res || { message: `Password reset instructions dispatched to ${email}.` };
    }
    return {
      message: `Password reset instructions dispatched to ${email}.`,
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ message: string }> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>("/auth/reset-password", data);
      return res?.data || res || { message: "Your password has been successfully reset. You may now sign in." };
    }
    const user = mockStore.getUserByEmail(data.email);
    if (user) {
      mockStore.saveUser({ ...user, password: data.password });
    }

    return {
      message: "Your password has been successfully reset. You may now sign in.",
    };
  }
}

export const authService = new AuthService();
