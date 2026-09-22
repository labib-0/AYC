import { apiClient } from "@/services/api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { mockStore } from "@/lib/mock-data/mock-store";

export interface PromotionRecord {
  id: number;
  title: string;
  subtitle?: string;
  type: string;
  image_url?: string;
  discount_percentage?: number;
  button_text?: string;
  button_action?: string;
  button_target?: string;
  starts_at?: string;
  ends_at?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CouponRecord {
  id: number;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_spend?: number;
  max_discount?: number;
  usage_limit?: number;
  usage_count: number;
  starts_at?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export class AdminPromotionService {
  async getPromotions(params?: { type?: string; search?: string; status?: string }): Promise<PromotionRecord[]> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>("/admin/promotions", params as any);
        const data = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(data) && data.length > 0) return data;
      } catch {
        // Fallback
      }
    }

    let list = mockStore.getPromotions();
    if (params?.type && params.type !== "all") {
      list = list.filter((p) => p.type === params.type);
    }
    if (params?.status === "active") {
      list = list.filter((p) => p.is_active);
    } else if (params?.status === "inactive") {
      list = list.filter((p) => !p.is_active);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.subtitle?.toLowerCase().includes(q));
    }
    return list;
  }

  async createPromotion(data: Partial<PromotionRecord>): Promise<PromotionRecord> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.post<any>("/admin/promotions", data);
        const item = res?.data || res;
        if (item && item.id) return item;
      } catch {
        // Fallback
      }
    }

    return mockStore.savePromotion(data);
  }

  async updatePromotion(id: number, data: Partial<PromotionRecord>): Promise<PromotionRecord> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.put<any>(`/admin/promotions/${id}`, data);
        const item = res?.data || res;
        if (item && item.id) return item;
      } catch {
        // Fallback
      }
    }

    return mockStore.savePromotion({ ...data, id });
  }

  async deletePromotion(id: number): Promise<boolean> {
    if (!isFrontendOnly()) {
      try {
        await apiClient.delete<any>(`/admin/promotions/${id}`);
      } catch {
        // Fallback
      }
    }

    return mockStore.deletePromotion(id);
  }

  async getCoupons(params?: { status?: string; search?: string; type?: string }): Promise<CouponRecord[]> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>("/admin/coupons", params as any);
        const data = res?.data || (Array.isArray(res) ? res : []);
        if (Array.isArray(data) && data.length > 0) return data;
      } catch {
        // Fallback
      }
    }

    let list = mockStore.getCoupons();
    if (params?.type && params.type !== "all") {
      list = list.filter((c) => c.discount_type === params.type);
    }
    if (params?.status === "active") {
      list = list.filter((c) => c.is_active);
    } else if (params?.status === "inactive") {
      list = list.filter((c) => !c.is_active);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter((c) => c.code.toLowerCase().includes(q));
    }
    return list;
  }

  async createCoupon(data: Partial<CouponRecord>): Promise<CouponRecord> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.post<any>("/admin/coupons", data);
        const item = res?.data || res;
        if (item && item.id) return item;
      } catch {
        // Fallback
      }
    }

    return mockStore.saveCoupon(data);
  }

  async updateCoupon(id: number, data: Partial<CouponRecord>): Promise<CouponRecord> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.put<any>(`/admin/coupons/${id}`, data);
        const item = res?.data || res;
        if (item && item.id) return item;
      } catch {
        // Fallback
      }
    }

    return mockStore.saveCoupon({ ...data, id });
  }

  async deleteCoupon(id: number): Promise<boolean> {
    if (!isFrontendOnly()) {
      try {
        await apiClient.delete<any>(`/admin/coupons/${id}`);
      } catch {
        // Fallback
      }
    }

    return mockStore.deleteCoupon(id);
  }
}

export const adminPromotionService = new AdminPromotionService();
