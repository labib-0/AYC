import { apiClient } from "@/services/api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { mockStore } from "@/lib/mock-data/mock-store";
import { AdminPermissionsProvenance } from "./rbac.service";

export interface AdminRoleItem {
  id: number;
  name: string;
  slug: string;
  is_system: boolean;
  is_active?: boolean;
}

export interface AdminUserRecord {
  id: number | string;
  name: string;
  email: string;
  role: "admin";
  status: "active" | "inactive";
  is_super_admin: boolean;
  access_level?: string;
  phone?: string;
  company_name?: string;
  avatar_url?: string;
  is_demo?: boolean;
  roles?: AdminRoleItem[];
  role_count?: number;
  effective_permissions_count?: number;
  effective_permissions?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateAdminUserInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  status?: "active" | "inactive";
  role_slugs?: string[];
  access_level?: string;
}

export interface UpdateAdminUserInput {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  status?: "active" | "inactive";
  role_slugs?: string[];
  access_level?: string;
}

export class AdminUserService {
  /**
   * GET /api/v1/admin/administrators
   * Fetch dedicated list of system administrators with RBAC roles and effective permissions.
   */
  async getAdminUsers(params?: { search?: string; status?: string; role?: string }): Promise<AdminUserRecord[]> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>("/admin/administrators", { params });
        const list = res?.data || res;
        if (Array.isArray(list)) {
          return list.map((a: any) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            role: "admin" as const,
            status: a.status || "active",
            is_super_admin: Boolean(a.is_super_admin),
            access_level: a.access_level || (a.is_super_admin ? "super_admin" : "admin"),
            phone: a.phone || "",
            company_name: a.company_name || "Ayaan Sourcing Ltd.",
            avatar_url: a.avatar_url,
            is_demo: Boolean(a.is_demo),
            roles: Array.isArray(a.roles) ? a.roles : [],
            role_count: a.role_count ?? (Array.isArray(a.roles) ? a.roles.length : 0),
            effective_permissions_count: a.effective_permissions_count ?? (a.effective_permissions ? a.effective_permissions.length : 0),
            effective_permissions: Array.isArray(a.effective_permissions) ? a.effective_permissions : [],
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
      role: "admin" as const,
      status: ((a as any).status as "active" | "inactive") || "active",
      is_super_admin: Boolean((a as any).is_super_admin),
      access_level: (a as any).access_level || "super_admin",
      phone: a.phone || "",
      company_name: a.company_name || "Ayaan Sourcing Ltd.",
      avatar_url: a.avatar_url,
      is_demo: Boolean((a as any).is_demo),
      roles: [],
      role_count: 0,
      effective_permissions_count: 0,
      effective_permissions: [],
      created_at: a.created_at || new Date().toISOString(),
      updated_at: (a as any).updated_at || new Date().toISOString(),
    }));
  }

  /**
   * Alias for getAdminUsers
   */
  async getAdministrators(params?: { search?: string; status?: string; role?: string }): Promise<AdminUserRecord[]> {
    return this.getAdminUsers(params);
  }

  /**
   * GET /api/v1/admin/administrators/{id}
   */
  async getAdminUserById(id: number | string): Promise<AdminUserRecord> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>(`/admin/administrators/${id}`);
        const data = res?.data || res;
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          role: "admin",
          status: data.status || "active",
          is_super_admin: Boolean(data.is_super_admin),
          access_level: data.access_level || (data.is_super_admin ? "super_admin" : "admin"),
          phone: data.phone || "",
          company_name: data.company_name,
          avatar_url: data.avatar_url,
          roles: Array.isArray(data.roles) ? data.roles : [],
          role_count: data.role_count ?? (Array.isArray(data.roles) ? data.roles.length : 0),
          effective_permissions_count: data.effective_permissions_count ?? (data.effective_permissions ? data.effective_permissions.length : 0),
          effective_permissions: Array.isArray(data.effective_permissions) ? data.effective_permissions : [],
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
      status: ((u as any).status as "active" | "inactive") || "active",
      is_super_admin: Boolean((u as any).is_super_admin),
      access_level: (u as any).access_level || "super_admin",
      phone: u.phone || "",
      company_name: u.company_name,
      avatar_url: u.avatar_url,
      roles: [],
      role_count: 0,
      effective_permissions_count: 0,
      effective_permissions: [],
      created_at: u.created_at,
    };
  }

  /**
   * POST /api/v1/admin/administrators
   */
  async createAdminUser(payload: CreateAdminUserInput): Promise<AdminUserRecord> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>("/admin/administrators", payload);
      const data = res?.data || res;
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        role: "admin",
        status: data.status || "active",
        is_super_admin: Boolean(data.is_super_admin),
        access_level: data.access_level || "admin",
        phone: data.phone || "",
        roles: Array.isArray(data.roles) ? data.roles : [],
        role_count: data.role_count ?? (Array.isArray(data.roles) ? data.roles.length : 0),
        effective_permissions_count: data.effective_permissions_count ?? 0,
        effective_permissions: Array.isArray(data.effective_permissions) ? data.effective_permissions : [],
        created_at: data.created_at,
      };
    }

    const newAdmin = mockStore.saveUser({
      name: payload.name,
      email: payload.email,
      role: "admin",
      phone: payload.phone,
      company_name: "Ayaan Sourcing Ltd.",
      status: payload.status || "active",
      is_super_admin: false,
    } as any);

    return {
      id: newAdmin.id,
      name: newAdmin.name,
      email: newAdmin.email,
      role: "admin",
      status: ((newAdmin as any).status as "active" | "inactive") || "active",
      is_super_admin: false,
      access_level: "admin",
      phone: newAdmin.phone,
      roles: [],
      role_count: 0,
      effective_permissions_count: 0,
      effective_permissions: [],
      created_at: newAdmin.created_at,
    };
  }

  /**
   * PUT /api/v1/admin/administrators/{id}
   */
  async updateAdminUser(id: number | string, payload: UpdateAdminUserInput): Promise<AdminUserRecord> {
    if (!isFrontendOnly()) {
      const res = await apiClient.put<any>(`/admin/administrators/${id}`, payload);
      const data = res?.data || res;
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        role: "admin",
        status: data.status,
        is_super_admin: Boolean(data.is_super_admin),
        access_level: data.access_level,
        phone: data.phone || "",
        roles: Array.isArray(data.roles) ? data.roles : [],
        role_count: data.role_count ?? (Array.isArray(data.roles) ? data.roles.length : 0),
        effective_permissions_count: data.effective_permissions_count ?? 0,
        effective_permissions: Array.isArray(data.effective_permissions) ? data.effective_permissions : [],
        updated_at: data.updated_at,
      };
    }

    const updated = mockStore.saveUser({
      id,
      ...(payload.name && { name: payload.name }),
      ...(payload.email && { email: payload.email }),
      ...(payload.phone !== undefined && { phone: payload.phone }),
      ...(payload.status && { status: payload.status }),
    } as any);

    if (!updated) {
      throw new Error("Failed to update administrator account in local store");
    }

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: "admin",
      status: ((updated as any).status as "active" | "inactive") || "active",
      is_super_admin: Boolean((updated as any).is_super_admin),
      access_level: "admin",
      phone: updated.phone,
      roles: [],
      role_count: 0,
      effective_permissions_count: 0,
      effective_permissions: [],
      updated_at: (updated as any).updated_at,
    };
  }

  /**
   * PATCH /api/v1/admin/administrators/{id}/status
   */
  async toggleStatus(id: number | string, status?: "active" | "inactive"): Promise<{ id: number | string; status: "active" | "inactive" }> {
    if (!isFrontendOnly()) {
      const res = await apiClient.patch<any>(`/admin/administrators/${id}/status`, { status });
      const data = res?.data || res;
      return {
        id: data.id,
        status: data.status,
      };
    }

    const user = mockStore.getUserById(id);
    if (!user) throw new Error("Administrator account not found");
    const newStatus = status || ((user as any).status === "active" ? "inactive" : "active");
    mockStore.saveUser({ id, status: newStatus } as any);
    return { id, status: newStatus };
  }

  /**
   * Alias for toggleStatus
   */
  async toggleAdminStatus(id: number | string, status?: "active" | "inactive"): Promise<{ id: number | string; status: "active" | "inactive" }> {
    return this.toggleStatus(id, status);
  }

  /**
   * POST /api/v1/admin/administrators/{id}/reset-password
   */
  async resetPassword(id: number | string, password: string): Promise<void> {
    if (!isFrontendOnly()) {
      await apiClient.post<any>(`/admin/administrators/${id}/reset-password`, { password });
      return;
    }
  }

  /**
   * GET /api/v1/admin/administrators/{id}/permissions
   */
  async getEffectivePermissions(id: number | string): Promise<AdminPermissionsProvenance> {
    const res = await apiClient.get<any>(`/admin/administrators/${id}/permissions`);
    return res?.data || res;
  }

  /**
   * DELETE /api/v1/admin/administrators/{id}
   */
  async deleteAdminUser(id: number | string): Promise<void> {
    if (!isFrontendOnly()) {
      await apiClient.delete<any>(`/admin/administrators/${id}`);
      return;
    }

    const success = mockStore.deleteUser(id);
    if (!success) {
      throw new Error("Failed to delete administrator in local store");
    }
  }
}

export const adminUserService = new AdminUserService();
