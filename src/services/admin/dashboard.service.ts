import { mockStore } from "@/lib/mock-data/mock-store";
import { LOW_STOCK_THRESHOLD } from "./inventory.service";

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
    const products = mockStore.getProducts();
    const orders = mockStore.getOrders();
    const users = mockStore.getUsers();
    const rfqs = mockStore.getRfqs();

    const activeProducts = products.filter((p) => p.status === "published").length;
    const customers = users.filter((u) => u.role === "customer" || u.role === "b2b_buyer").length;
    const pendingOrders = orders.filter((o) => o.status === "pending").length;
    const processingOrders = orders.filter((o) => o.status === "processing").length;
    const deliveredOrders = orders.filter((o) => o.status === "delivered").length;

    const revenue = orders
      .filter((o) => o.payment_status === "paid" || o.status === "delivered" || o.status === "shipped")
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    const lowStock = products.filter((p) => {
      const stock = Number(p.stock ?? 0);
      return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
    }).length;

    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((o) => ({
        id: o.id,
        order_number: o.order_number,
        total_amount: Number(o.total_amount),
        status: o.status,
        payment_status: o.payment_status,
        created_at: o.created_at,
        company: o.shipping_company || o.user?.company_name,
        user: o.user
          ? {
              id: o.user.id,
              name: o.user.name,
              email: o.user.email,
            }
          : undefined,
      }));

    const recentRfqs = [...rfqs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        rfq_number: r.rfqNumber,
        company_name: r.companyName,
        buyer_name: r.buyerName,
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
      revenue,
      low_stock_items: lowStock,
      recent_orders: recentOrders,
      recent_rfqs: recentRfqs,
    };
  }
}

export const adminDashboardService = new AdminDashboardService();
