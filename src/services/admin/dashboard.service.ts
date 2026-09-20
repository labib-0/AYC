import { apiClient } from "@/services/api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { mockStore } from "@/lib/mock-data/mock-store";

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
      id: number | string;
      name: string;
      email: string;
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
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<{ data: DashboardMetrics }>("/admin/dashboard");
        const data = res?.data || (res as unknown as DashboardMetrics);
        if (data && data.total_products !== undefined) {
          return data;
        }
      } catch {
        // Fallback
      }
    }

    const products = mockStore.getProducts();
    const orders = mockStore.getOrders();
    const users = mockStore.getUsers();
    const rfqs = mockStore.getRfqs();

    const activeProducts = products.filter((p) => p.status === "published").length;
    const customers = users.filter((u) => u.role === "customer" || u.role === "b2b_buyer").length;
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const processingOrders = orders.filter((o) => o.status === "processing" || o.fulfillment_status === "processing").length;
    const deliveredOrders = orders.filter((o) => o.status === "delivered" || o.status === "fulfilled" || o.fulfillment_status === "delivered").length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.payment_status === "paid" ? o.total_amount : 0), 0);
    const lowStock = products.filter((p) => p.stock < 100).length;

    const recentOrders = orders.slice(0, 5).map((o, idx) => ({
      id: o.id || idx + 1,
      order_number: o.order_number,
      total_amount: o.total_amount,
      status: o.status,
      payment_status: o.payment_status,
      created_at: o.created_at,
      company: o.shipping_company,
      user: {
        id: Number(o.user_id) || 101,
        name: o.shipping_name || o.shipping_company || "Valued Buyer",
        email: o.email,
      },
    }));

    const recentRfqs = rfqs.slice(0, 5).map((r, idx) => ({
      id: r.id || idx + 1,
      rfq_number: r.rfqNumber,
      company_name: r.companyName || "Buyer Enterprise",
      buyer_name: r.buyerName || "Buyer",
      status: r.status,
      created_at: r.createdAt,
    }));

    return {
      total_products: products.length,
      active_products: activeProducts,
      total_customers: customers,
      total_orders: orders.length,
      pending_orders: pendingOrders,
      processing_orders: processingOrders,
      delivered_orders: deliveredOrders,
      revenue: Math.round(totalRevenue * 100) / 100,
      low_stock_items: lowStock,
      recent_orders: recentOrders,
      recent_rfqs: recentRfqs,
    };
  }
}

export const adminDashboardService = new AdminDashboardService();
