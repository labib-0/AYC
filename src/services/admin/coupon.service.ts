import { mockStore } from "@/lib/mock-data/mock-store";
import { apiClient } from "@/services/api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";

export type CouponDiscountType = "percentage" | "flat";
export type PromoDiscountType = CouponDiscountType;

export interface CouponRecord {
  id: number;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  min_spend: number; // Minimum Order Amount (USD) - mandatory, must be > 0
  max_discount?: number;
  usage_limit?: number;
  usage_count: number;
  starts_at?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export class AdminCouponService {
  async getCoupons(params?: { status?: string; search?: string; type?: string }): Promise<CouponRecord[]> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>("/admin/coupons", { params });
      const list = Array.isArray(res) ? res : res?.data;
      if (Array.isArray(list)) return list;
      return [];
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
      const res = await apiClient.post<any>("/admin/coupons", data);
      return (res?.data || res) as CouponRecord;
    }
    return mockStore.saveCoupon(data);
  }

  async updateCoupon(id: number, data: Partial<CouponRecord>): Promise<CouponRecord> {
    if (!isFrontendOnly()) {
      const res = await apiClient.put<any>(`/admin/coupons/${id}`, data);
      return (res?.data || res) as CouponRecord;
    }
    return mockStore.saveCoupon({ ...data, id });
  }

  async deleteCoupon(id: number): Promise<boolean> {
    if (!isFrontendOnly()) {
      await apiClient.delete(`/admin/coupons/${id}`);
      return true;
    }
    return mockStore.deleteCoupon(id);
  }
}

export const adminCouponService = new AdminCouponService();
