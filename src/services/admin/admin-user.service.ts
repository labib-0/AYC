import { apiClient } from "@/services/api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { mockStore } from "@/lib/mock-data/mock-store";

export interface AdminUserRecord {
  id: number | string;
  name: string;
  email: string;
  role: "admin";
  status: "active" | "inactive";
  access_level: "super_admin" | "admin" | "manager" | "editor" | string;
  permissions?: string[];
  phone?: string;
  company_name?: string;
  avatar_url?: string;
  is_demo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAdminUserInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  status?: "active" | "inactive";
  access_level?: "super_admin" | "admin" | "manager" | "editor" | string;
  permissions?: string[];
}

export interface UpdateAdminUserInput {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  status?: "active" | "inactive";
  access_level?: "super_admin" | "admin" | "manager" | "editor" | string;
  permissions?: string[];
}

export class AdminUserService {
  /**
   * GET /api/v1/admin/users
   * Fetch dedicated list of system administrators only.
   */
  async getAdminUsers(params?: { search?: string; status?: string; access_level?: string }): Promise<AdminUserRecord[]> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>("/admin/users", { params });
        const list = res?.data || res;
        if (Array.isArray(list)) {
          return list.map((a: any) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            role: "admin",
            status: a.status || "active",
            access_level: a.access_level || "super_admin",
            permissions: Array.isArray(a.permissions) ? a.permissions : ["all"],
            phone: a.phone || "",
            company_name: a.company_name || "Ayaan Sourcing Ltd.",
            avatar_url: a.avatar_url,
            is_demo: Boolean(a.is_demo),
            created_at: a.created_at,
            updated_at: a.updated_at,
          }));
        }
      } catch (err) {
        console.warn("Failed to fetch admin users from backend API, falling back to local store:", err);
      }
    }

    // Local / Mock fallback: filter strictly to admin accounts only
    let admins = mockStore.getUsers().filter((u) => u.role === "admin");

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      admins = admins.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          (a.phone && a.phone.toLowerCase().includes(q))
      );
    }

    return admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      role: "admin",
      status: (a as any).status || "active",
      access_level: (a as any).access_level || "super_admin",
      permissions: (a as any).permissions || ["all"],
      phone: a.phone || "",
      company_name: a.company_name || "Ayaan Sourcing Ltd.",
      avatar_url: a.avatar_url,
      is_demo: Boolean((a as any).is_demo),
      created_at: a.created_at || new Date().toISOString(),
      updated_at: (a as any).updated_at || new Date().toISOString(),
    }));
  }

  /**
   * GET /api/v1/admin/users/{id}
   */
  async getAdminUserById(id: number | string): Promise<AdminUserRecord> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>(`/admin/users/${id}`);
        const data = res?.data || res;
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          role: "admin",
          status: data.status || "active",
          access_level: data.access_level || "super_admin",
          permissions: Array.isArray(data.permissions) ? data.permissions : ["all"],
          phone: data.phone || "",
          company_name: data.company_name,
          avatar_url: data.avatar_url,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      } catch (err) {
        console.warn("Failed to fetch admin user by ID from API:", err);
      }
    }

    const u = mockStore.getUserById(id);
    if (!u || u.role !== "admin") {
      throw new Error("Administrator account not found");
    }

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: "admin",
      status: (u as any).status || "active",
      access_level: (u as any).access_level || "super_admin",
      permissions: (u as any).permissions || ["all"],
      phone: u.phone || "",
      company_name: u.company_name,
      avatar_url: u.avatar_url,
      created_at: u.created_at,
    };
  }

  /**
   * POST /api/v1/admin/users
   * Create a new administrator account.
   */
  async createAdminUser(data: CreateAdminUserInput): Promise<AdminUserRecord> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.post<any>("/admin/users", data);
        const created = res?.data || res;
        return {
          id: created.id,
          name: created.name,
          email: created.email,
          role: "admin",
          status: created.status || "active",
          access_level: created.access_level || "super_admin",
          permissions: Array.isArray(created.permissions) ? created.permissions : ["all"],
          phone: created.phone || "",
          created_at: created.created_at,
        };
      } catch (err) {
        throw err;
      }
    }

    const saved = mockStore.saveUser({
      name: data.name,
      email: data.email,
      role: "admin",
      phone: data.phone,
      company_name: "Ayaan Sourcing Ltd.",
      status: data.status || "active",
      access_level: data.access_level || "super_admin",
      permissions: data.permissions || ["all"],
    } as any);

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: "admin",
      status: (saved as any).status || "active",
      access_level: (saved as any).access_level || "super_admin",
      permissions: (saved as any).permissions || ["all"],
      phone: saved.phone || "",
      created_at: saved.created_at,
    };
  }

  /**
   * PUT /api/v1/admin/users/{id}
   * Update existing administrator.
   */
  async updateAdminUser(id: number | string, data: UpdateAdminUserInput): Promise<AdminUserRecord> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.put<any>(`/admin/users/${id}`, data);
        const updated = res?.data || res;
        return {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: "admin",
          status: updated.status || "active",
          access_level: updated.access_level || "super_admin",
          permissions: Array.isArray(updated.permissions) ? updated.permissions : ["all"],
          phone: updated.phone || "",
          updated_at: updated.updated_at,
        };
      } catch (err) {
        throw err;
      }
    }

    const saved = mockStore.saveUser({
      id: String(id),
      ...data,
      role: "admin",
    } as any);

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: "admin",
      status: (saved as any).status || "active",
      access_level: (saved as any).access_level || "super_admin",
      permissions: (saved as any).permissions || ["all"],
      phone: saved.phone || "",
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * PATCH /api/v1/admin/users/{id}/status
   * Activate or deactivate administrator account.
   */
  async toggleAdminStatus(id: number | string, status?: "active" | "inactive"): Promise<{ id: number | string; status: string }> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.patch<any>(`/admin/users/${id}/status`, { status });
        return (res?.data || res) as { id: number | string; status: string };
      } catch (err) {
        throw err;
      }
    }

    const user = mockStore.getUserById(id);
    if (!user) throw new Error("Administrator not found");
    const nextStatus = status || ((user as any).status === "active" ? "inactive" : "active");
    mockStore.saveUser({ ...user, status: nextStatus } as any);
    return { id, status: nextStatus };
  }

  /**
   * DELETE /api/v1/admin/users/{id}
   * Remove administrator account where permitted.
   */
  async deleteAdminUser(id: number | string): Promise<boolean> {
    if (!isFrontendOnly()) {
      try {
        await apiClient.delete(`/admin/users/${id}`);
        return true;
      } catch (err) {
        throw err;
      }
    }

    const allAdmins = mockStore.getUsers().filter((u) => u.role === "admin");
    if (allAdmins.length <= 1) {
      throw new Error("Cannot delete the only remaining administrator account.");
    }

    return mockStore.deleteUser(id);
  }
}

export const adminUserService = new AdminUserService();
