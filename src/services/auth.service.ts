import { apiClient, ApiError } from "./api-client";
import { AuthResponse, User } from "@/types/api";
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

export class AuthService {
  /**
   * Log in user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
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

    // If logging in with an email not yet in the store, automatically create customer profile
    const role: User["role"] = email.includes("admin") ? "admin" : "customer";
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
    const newUser = mockStore.saveUser({
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone,
      company_name: data.company_name,
      role: data.role || "customer",
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
    apiClient.removeToken();
    mockStore.setActiveUser(null);
  }

  /**
   * Get authenticated user profile
   */
  async getCurrentUser(): Promise<User | null> {
    return mockStore.getActiveUser();
  }

  /**
   * Update authenticated user profile
   */
  async updateProfile(data: Partial<User>): Promise<User> {
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
