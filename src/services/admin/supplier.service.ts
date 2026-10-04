import { apiClient } from "@/services/api-client";
import { SupplierModel } from "@/types/b2b";

export class AdminSupplierService {
  /**
   * Search suppliers by name, code (ID), or contact person.
   */
  async searchSuppliers(query: string = "", limit: number = 30): Promise<SupplierModel[]> {
    try {
      const trimmed = query.trim();
      const params: Record<string, string | number> = { limit };
      if (trimmed) {
        params.q = trimmed;
      }

      const res = await apiClient.get<any>("/admin/suppliers", { params });
      const raw = res?.data || res;
      if (Array.isArray(raw)) {
        return raw;
      }
      if (raw && Array.isArray(raw.data)) {
        return raw.data;
      }
      return [];
    } catch (err) {
      console.error("Failed to search suppliers:", err);
      return [];
    }
  }

  /**
   * Get single supplier by ID or code.
   */
  async getSupplierById(idOrCode: string | number): Promise<SupplierModel | null> {
    try {
      if (!idOrCode) return null;
      const res = await apiClient.get<any>(`/admin/suppliers/${idOrCode}`);
      const data = res?.data || res;
      if (data && data.id) {
        return data;
      }
      return null;
    } catch (err) {
      console.error(`Failed to get supplier ${idOrCode}:`, err);
      return null;
    }
  }

  /**
   * Create a new supplier.
   */
  async createSupplier(data: {
    code: string;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    notes?: string;
  }): Promise<SupplierModel | null> {
    try {
      const res = await apiClient.post<any>("/admin/suppliers", data);
      const item = res?.data || res;
      return item && item.id ? item : null;
    } catch (err) {
      console.error("Failed to create supplier:", err);
      throw err;
    }
  }
}

export const adminSupplierService = new AdminSupplierService();
