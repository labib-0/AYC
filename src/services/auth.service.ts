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
  website_url_hp?: string;
  form_token?: string;
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
      const headers: Record<string, string> = {};
      if (data.form_token) {
        headers["X-Form-Token"] = data.form_token;
      }
      const res = await apiClient.post<any>("/auth/register", data, { headers });
      const authData = "data" in res && res.data ? res.data : (res as AuthResponse);
      if (authData?.token) {
        apiClient.setToken(authData.token);
      }
      if (authData?.user && !authData?.requires_verification) {
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
  async updateProfile(
    data: Partial<User> & {
      current_password?: string;
      password?: string;
      password_confirmation?: string;
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    }
  ): Promise<User> {
    if (!isFrontendOnly()) {
      const payload: Record<string, any> = { ...data };
      if (!payload.current_password && payload.currentPassword) {
        payload.current_password = payload.currentPassword;
      }
      if (!payload.password && payload.newPassword) {
        payload.password = payload.newPassword;
      }
      if (!payload.password_confirmation && payload.confirmPassword) {
        payload.password_confirmation = payload.confirmPassword;
      }
      const res = await apiClient.put<any>("/users/me", payload);
      const updated = res?.data || res;
      if (updated && updated.id) {
        mockStore.setActiveUser(updated);
        return updated;
      }
      return updated;
    }

    const current = mockStore.getActiveUser();
    if (current) {
      const dataAny = data as any;
      const newPassword = dataAny.password || dataAny.newPassword;

      if (newPassword !== undefined && newPassword !== "") {
        const currentPassword = dataAny.current_password || dataAny.currentPassword;
        if (!currentPassword) {
          throw new ApiError(422, "Please enter your current password.", {
            current_password: ["Please enter your current password."],
          });
        }

        const storedUser = mockStore.getUserById(current.id) || (current as any);
        const expectedPassword = storedUser?.password || (current as any)?.password || "password";
        if (expectedPassword !== currentPassword) {
          throw new ApiError(422, "The provided current password is incorrect.", {
            current_password: ["The provided current password is incorrect."],
          });
        }

        if (newPassword.length < 6) {
          throw new ApiError(422, "New password must be at least 6 characters in length.", {
            password: ["New password must be at least 6 characters in length."],
          });
        }

        const confirmation = dataAny.password_confirmation || dataAny.confirmPassword;
        if (confirmation !== undefined && confirmation !== newPassword) {
          throw new ApiError(422, "New passwords do not match. Please re-enter.", {
            password: ["New passwords do not match. Please re-enter."],
          });
        }
      }

      await new Promise((r) => setTimeout(r, 200));

      const cleanData = { ...data };
      // Security: Strictly enforce account isolation - do not allow id, user_id, email, or role to be overwritten
      delete (cleanData as any).id;
      delete (cleanData as any).user_id;
      delete (cleanData as any).email;
      delete (cleanData as any).role;
      delete (cleanData as any).current_password;
      delete (cleanData as any).currentPassword;
      delete (cleanData as any).password_confirmation;
      delete (cleanData as any).confirmPassword;
      if (newPassword) {
        (cleanData as any).password = newPassword;
      }

      const updated = mockStore.saveUser({
        ...current,
        ...cleanData,
        id: current.id,
        email: current.email,
        role: current.role,
      });
      mockStore.setActiveUser(updated);
      return updated;
    }

    return mockStore.saveUser(data);
  }

  /**
   * Request password reset link
   */
  async forgotPassword(
    email: string,
    security?: { formToken?: string | null; honeypot?: string }
  ): Promise<{ message: string }> {
    if (!isFrontendOnly()) {
      const headers: Record<string, string> = {};
      if (security?.formToken) {
        headers["X-Form-Token"] = security.formToken;
      }
      const payload: Record<string, any> = { email };
      if (security?.honeypot !== undefined) {
        payload.website_url_hp = security.honeypot;
      }
      const res = await apiClient.post<any>("/auth/forgot-password", payload, { headers });
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

  /**
   * Resend email verification notification (centralized on the verification-pending screen).
   */
  async resendVerificationEmail(email?: string): Promise<{
    message: string;
    already_verified?: boolean;
    seconds_remaining?: number;
  }> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>("/auth/email/verification-notification", email ? { email } : {});
      return res?.data || res || { message: "A new verification link has been sent to your email." };
    }
    return {
      message: "A new verification link has been sent to your email.",
    };
  }

  /**
   * Check email verification status.
   * This is a read-only query and NEVER triggers or dispatches any verification email.
   */
  async getVerificationStatus(email?: string): Promise<{
    is_verified: boolean;
    is_exempt?: boolean;
    email_verified_at?: string | null;
    email?: string;
  }> {
    if (!isFrontendOnly()) {
      const url = email
        ? `/auth/email/verification-status?email=${encodeURIComponent(email)}`
        : "/auth/email/verification-status";
      const res = await apiClient.get<any>(url);
      return res?.data || res || { is_verified: false };
    }
    const current = mockStore.getActiveUser();
    return {
      is_verified: !!current?.email_verified_at,
      email_verified_at: current?.email_verified_at,
      email: current?.email,
    };
  }
}

export const authService = new AuthService();

if (typeof window !== "undefined") {
  (window as any).__authService = authService;
}
