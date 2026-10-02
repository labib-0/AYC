import { apiClient } from "@/services/api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { mockStore } from "@/lib/mock-data/mock-store";

export interface DashboardMetrics {
  total_products: number;
  active_products: number;
  published_products?: number;
  draft_products?: number;
  total_customers: number;
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  delivered_orders: number;
  revenue: number;
  low_stock_items: number;
  low_stock_products?: number;
  sales?: number;
  gross_profit?: number;
  units_sold?: number;
  profit_margin?: number;
  chart?: any[];
  sales_profit?: any;
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
  async getMetrics(params?: { period?: string; date_from?: string; date_to?: string }): Promise<DashboardMetrics> {
    try {
      const res = await apiClient.get<any>("/admin/dashboard", { params });
      const data = res?.data || res;
      if (data && typeof data.total_products !== "undefined") {
        const activeProds = Number(data.active_products ?? data.published_products ?? 0);
        const lowStock = Number(data.low_stock_items ?? data.low_stock_products ?? 0);

        return {
          total_products: Number(data.total_products || 0),
          active_products: activeProds,
          published_products: activeProds,
          total_customers: Number(data.total_customers || 0),
          total_orders: Number(data.total_orders || 0),
          pending_orders: Number(data.pending_orders || 0),
          processing_orders: Number(data.processing_orders || 0),
          delivered_orders: Number(data.delivered_orders || 0),
          revenue: Number(data.revenue || 0),
          low_stock_items: lowStock,
          low_stock_products: lowStock,
          sales: typeof data.sales !== "undefined" ? Number(data.sales) : undefined,
          gross_profit: typeof data.gross_profit !== "undefined" ? Number(data.gross_profit) : undefined,
          units_sold: typeof data.units_sold !== "undefined" ? Number(data.units_sold) : undefined,
          profit_margin: typeof data.profit_margin !== "undefined" ? Number(data.profit_margin) : undefined,
          chart: Array.isArray(data.chart) ? data.chart : undefined,
          sales_profit: data.sales_profit,
          recent_orders: Array.isArray(data.recent_orders) ? data.recent_orders : [],
          recent_rfqs: Array.isArray(data.recent_rfqs) ? data.recent_rfqs : [],
        };
      }
      throw new Error("Unable to parse operational metrics from backend API response.");
    } catch (err) {
      if (isFrontendOnly()) {
        const products = mockStore.getProducts();
        const orders = mockStore.getOrders();
        const users = mockStore.getUsers();
        const rfqs = mockStore.getRfqs();

        const activeProds = products.filter((p: any) => p.status === "published" && !p.isHiddenFromStorefront);
        const draftProds = products.filter((p: any) => p.status === "draft");
        const customers = users.filter((u: any) => u.role === "customer");
        const pendingOrders = orders.filter((o: any) => o.status === "pending");
        const processingOrders = orders.filter((o: any) => o.status === "processing");
        const deliveredOrders = orders.filter((o: any) => o.status === "delivered");
        const paidOrders = orders.filter((o: any) => o.payment_status === "paid" || o.status === "delivered");
        const revenue = paidOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);

        const lowStock = products.filter((p: any) => {
          const avail = p.availableStock !== undefined ? Number(p.availableStock) : Number(p.stock || 0);
          const effectiveMoq = p.moq && Number(p.moq) > 1 ? Number(p.moq) : 1;
          return avail < effectiveMoq;
        }).length;

        return {
          total_products: products.length,
          active_products: activeProds.length,
          published_products: activeProds.length,
          draft_products: draftProds.length,
          total_customers: customers.length,
          total_orders: orders.length,
          pending_orders: pendingOrders.length,
          processing_orders: processingOrders.length,
          delivered_orders: deliveredOrders.length,
          revenue: Math.round(revenue * 100) / 100,
          low_stock_items: lowStock,
          low_stock_products: lowStock,
          recent_orders: orders.slice(0, 5) as any,
          recent_rfqs: rfqs.slice(0, 5) as any,
        };
      }
      throw err;
    }
  }
}

export const adminDashboardService = new AdminDashboardService();
