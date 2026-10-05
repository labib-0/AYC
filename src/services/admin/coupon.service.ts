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

export interface CouponAdminBindingRecord {
  id: number;
  coupon_id: number;
  admin_user_id: number;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  coupon?: {
    id: number;
    code: string;
    discount_type: string;
    discount_value: number;
    min_spend?: number;
    max_discount?: number;
    is_active: boolean;
    expires_at?: string;
    usage_count: number;
  };
  adminUser?: {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  admin_user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  creator?: {
    id: number;
    name: string;
    email: string;
  };
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

  // ── Coupon Admin Bindings (Prompt 1) ───────────────────────────────────

  async getBindings(params?: { search?: string; admin_id?: number; coupon_id?: number }): Promise<CouponAdminBindingRecord[]> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>("/admin/coupon-bindings", { params });
      const list = Array.isArray(res) ? res : res?.data;
      if (Array.isArray(list)) return list;
      return [];
    }
    return mockStore.getCouponBindings(params);
  }

  async bindAdmin(couponId: number, adminUserId: number): Promise<CouponAdminBindingRecord> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>("/admin/coupon-bindings", {
        coupon_id: couponId,
        admin_user_id: adminUserId,
      });
      return (res?.data || res) as CouponAdminBindingRecord;
    }
    return mockStore.createCouponBinding(couponId, adminUserId);
  }

  async unbindAdmin(bindingId: number): Promise<boolean> {
    if (!isFrontendOnly()) {
      await apiClient.delete(`/admin/coupon-bindings/${bindingId}`);
      return true;
    }
    return mockStore.deleteCouponBinding(bindingId);
  }

  async getEligibleAdmins(search?: string): Promise<Array<{ id: number; name: string; email: string; role: string; status: string }>> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>("/admin/administrators", { params: { search, status: "active" } });
      const list = Array.isArray(res) ? res : res?.data;
      if (Array.isArray(list)) return list;
      return [];
    }
    return mockStore.getActiveAdmins(search);
  }

  // ── Coupon Sales Reporting (Prompt 2) ─────────────────────────────────

  async getCouponSalesSummary(params?: {
    coupon_id?: number;
    date_filter?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  }): Promise<CouponSalesSummary> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>("/admin/coupon-sales/summary", { params });
      return (res?.data || res) as CouponSalesSummary;
    }
    return mockStore.getCouponSalesSummary(params);
  }

  async getCouponSalesOrders(params?: {
    coupon_id?: number;
    date_filter?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<CouponSalesOrdersResponse> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>("/admin/coupon-sales/orders", { params });
      return (res?.data || res) as CouponSalesOrdersResponse;
    }
    return mockStore.getCouponSalesOrders(params);
  }

  async getCouponSalesOrder(id: number | string): Promise<any> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>(`/admin/coupon-sales/orders/${id}`);
      return res?.data || res;
    }
    return mockStore.getCouponSalesOrder(id);
  }
}

export interface CouponSalesSummary {
  has_bindings: boolean;
  bound_coupons_count: number;
  bound_coupons: Array<{
    id: number;
    code: string;
    discount_type: string;
    discount_value: number;
    is_active: boolean;
  }>;
  total_orders: number;
  total_sales: number;
  total_discounts: number;
  currency: string;
}

export interface CouponSalesOrderRecord {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  currency: string;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  coupon_id?: string | null;
  coupon_code?: string | null;
  coupon?: {
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
    min_spend?: number | null;
  } | null;
  email?: string | null;
  shipping_name?: string | null;
  placed_at?: string;
  created_at: string;
}

export interface CouponSalesOrdersResponse {
  data: CouponSalesOrderRecord[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export const adminCouponService = new AdminCouponService();
