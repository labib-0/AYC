import { apiClient } from "@/services/api-client";

export interface DashboardMetrics {
  total_products: number;
  active_products: number;
  total_customers: number;
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  delivered_orders: number;
  revenue: number;
  low_stock_items: number;
  recent_orders: Array<{
    id: string | number;
    order_number: string;
    total_amount: number;
    status: string;
    payment_status: string;
    created_at: string;
    company?: string;
    user?: {
      id?: number | string;
      name?: string;
      email?: string;
    };
  }>;
  recent_rfqs: Array<{
    id: string | number;
    rfq_number: string;
    company_name: string;
    buyer_name: string;
    status: string;
    created_at: string;
  }>;
}

export class AdminDashboardService {
  async getMetrics(): Promise<DashboardMetrics> {
    try {
      const res = await apiClient.get<any>("/admin/dashboard");
      const data = res?.data || res;
      if (data && typeof data.total_products !== "undefined") {
        return {
          total_products: Number(data.total_products || 0),
          active_products: Number(data.active_products || 0),
          total_customers: Number(data.total_customers || 0),
          total_orders: Number(data.total_orders || 0),
          pending_orders: Number(data.pending_orders || 0),
          processing_orders: Number(data.processing_orders || 0),
          delivered_orders: Number(data.delivered_orders || 0),
          revenue: Number(data.revenue || 0),
          low_stock_items: Number(data.low_stock_items || 0),
          recent_orders: Array.isArray(data.recent_orders) ? data.recent_orders : [],
          recent_rfqs: Array.isArray(data.recent_rfqs) ? data.recent_rfqs : [],
        };
      }
    } catch (err) {
      console.warn("Failed to fetch admin dashboard metrics from API, returning zero state:", err);
    }

    return {
      total_products: 0,
      active_products: 0,
      total_customers: 0,
      total_orders: 0,
      pending_orders: 0,
      processing_orders: 0,
      delivered_orders: 0,
      revenue: 0,
      low_stock_items: 0,
      recent_orders: [],
      recent_rfqs: [],
    };
  }
}

export const adminDashboardService = new AdminDashboardService();
