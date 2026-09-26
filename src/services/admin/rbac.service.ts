import { apiClient } from "@/services/api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";

export interface RbacPermission {
  id: number;
  slug: string;
  name: string;
  module: string;
  action: string;
  description?: string | null;
  is_system?: boolean;
  requires?: string[];
  is_direct?: boolean;
  is_inherited?: boolean;
  direct_roles?: string[];
  inherited_from?: string[];
}

export interface RbacRole {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  is_system: boolean;
  is_active: boolean;
  permissions?: RbacPermission[];
  permission_count?: number;
  admin_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RbacRoleDetail extends RbacRole {
  effective_permissions?: RbacPermission[];
  effective_permissions_count?: number;
  admins?: { id: number; name: string; email: string }[];
}

export interface CreateRoleInput {
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
  permission_slugs?: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface MyRbacProfile {
  is_super_admin: boolean;
  assigned_roles: string[];
  effective_permissions: string[];
}

export interface AdminRolesResponse {
  admin: {
    id: number;
    name: string;
    email: string;
    is_super_admin: boolean;
  };
  assigned_roles: RbacRole[];
  effective_permissions: string[];
}

export interface AdminPermissionsProvenance {
  admin: {
    id: number;
    name: string;
    email: string;
    is_super_admin: boolean;
    status: string;
  };
  assigned_roles: {
    id: number;
    name: string;
    slug: string;
    is_system: boolean;
  }[];
  total_effective: number;
  permissions_by_module: Record<string, RbacPermission[]>;
  permissions_flat: RbacPermission[];
}

class RbacService {
  /**
   * GET /api/v1/admin/rbac/roles
   */
  async getRoles(includeInactive = true): Promise<RbacRole[]> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>("/admin/rbac/roles", {
          params: { include_inactive: includeInactive ? 1 : 0 },
        });
        const list = res?.data || res;
        if (Array.isArray(list)) {
          return list;
        }
      } catch (err) {
        console.warn("Failed to fetch RBAC roles from API:", err);
        throw err;
      }
    }
    return [];
  }

  /**
   * GET /api/v1/admin/rbac/roles/{id}
   */
  async getRole(id: number | string): Promise<RbacRoleDetail> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>(`/admin/rbac/roles/${id}`);
      return res?.data || res;
    }
    throw new Error("API not available in frontend-only mode");
  }

  /**
   * POST /api/v1/admin/rbac/roles
   */
  async createRole(data: CreateRoleInput): Promise<RbacRole> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>("/admin/rbac/roles", data);
      return res?.data || res;
    }
    throw new Error("API not available in frontend-only mode");
  }

  /**
   * PUT /api/v1/admin/rbac/roles/{id}
   */
  async updateRole(id: number | string, data: UpdateRoleInput): Promise<RbacRole> {
    if (!isFrontendOnly()) {
      const res = await apiClient.put<any>(`/admin/rbac/roles/${id}`, data);
      return res?.data || res;
    }
    throw new Error("API not available in frontend-only mode");
  }

  /**
   * DELETE /api/v1/admin/rbac/roles/{id}
   */
  async deleteRole(id: number | string): Promise<void> {
    if (!isFrontendOnly()) {
      await apiClient.delete<any>(`/admin/rbac/roles/${id}`);
      return;
    }
    throw new Error("API not available in frontend-only mode");
  }

  /**
   * PUT /api/v1/admin/rbac/roles/{id}/permissions
   */
  async syncRolePermissions(id: number | string, permissionSlugs: string[]): Promise<RbacRole> {
    if (!isFrontendOnly()) {
      const res = await apiClient.put<any>(`/admin/rbac/roles/${id}/permissions`, {
        permission_slugs: permissionSlugs,
      });
      return res?.data || res;
    }
    throw new Error("API not available in frontend-only mode");
  }

  /**
   * GET /api/v1/admin/rbac/permissions
   */
  async getPermissions(groupByModule = false): Promise<RbacPermission[] | Record<string, RbacPermission[]>> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>("/admin/rbac/permissions", {
          params: { group_by_module: groupByModule ? 1 : 0 },
        });
        return res?.data || res;
      } catch (err) {
        console.warn("Failed to fetch permissions catalog:", err);
        throw err;
      }
    }
    return [];
  }

  /**
   * GET /api/v1/admin/rbac/me
   */
  async getMyPermissions(): Promise<MyRbacProfile> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>("/admin/rbac/me");
        return res?.data || res;
      } catch (err) {
        console.warn("Failed to fetch admin RBAC profile:", err);
      }
    }
    return {
      is_super_admin: false,
      assigned_roles: [],
      effective_permissions: [],
    };
  }

  /**
   * GET /api/v1/admin/rbac/admins/{adminId}/roles
   */
  async getAdminRoles(adminId: number | string): Promise<AdminRolesResponse> {
    const res = await apiClient.get<any>(`/admin/rbac/admins/${adminId}/roles`);
    return res?.data || res;
  }

  /**
   * POST /api/v1/admin/rbac/admins/{adminId}/roles
   */
  async assignAdminRole(adminId: number | string, roleSlug: string): Promise<void> {
    await apiClient.post<any>(`/admin/rbac/admins/${adminId}/roles`, {
      role_slug: roleSlug,
    });
  }

  /**
   * DELETE /api/v1/admin/rbac/admins/{adminId}/roles/{roleId}
   */
  async removeAdminRole(adminId: number | string, roleId: number | string): Promise<void> {
    await apiClient.delete<any>(`/admin/rbac/admins/${adminId}/roles/${roleId}`);
  }
}

export const rbacService = new RbacService();
