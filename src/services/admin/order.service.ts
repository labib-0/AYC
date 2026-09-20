import { apiClient } from "@/services/api-client";
import { OrderRecord } from "@/services/order.service";
import { isFrontendOnly } from "@/lib/frontend-mode";
import { mockStore } from "@/lib/mock-data/mock-store";

export interface AdminOrderQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  payment_status?: string;
  fulfillment_status?: string;
  payment_method?: string;
  start_date?: string;
  end_date?: string;
  sort?: string;
  direction?: "asc" | "desc";
}

export interface OrderSummaryMetrics {
  totalOrders: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  paid: number;
  pendingPayment: number;
}

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

export class AdminOrderService {
  getAllowedNextStatuses(currentStatus: string): string[] {
    const normalized = (currentStatus || "").toLowerCase();
    return ORDER_STATUS_TRANSITIONS[normalized] || ["processing", "shipped", "delivered", "cancelled"];
  }

  async getOrderSummary(): Promise<OrderSummaryMetrics> {
    const list = mockStore.getOrders();
    return {
      totalOrders: list.length,
      pending: list.filter((o) => o.status === "pending").length,
      confirmed: list.filter((o) => o.status === "confirmed").length,
      processing: list.filter((o) => o.status === "processing").length,
      shipped: list.filter((o) => o.status === "shipped").length,
      delivered: list.filter((o) => o.status === "delivered").length,
      cancelled: list.filter((o) => o.status === "cancelled").length,
      paid: list.filter((o) => o.payment_status === "paid").length,
      pendingPayment: list.filter((o) => o.payment_status === "pending").length,
    };
  }

  async getOrders(params?: AdminOrderQueryParams): Promise<{
    data: OrderRecord[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  }> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>("/admin/orders", params as any);
        const paginated = res?.data || res;
        if (paginated && Array.isArray(paginated.data)) {
          return paginated;
        }
      } catch {
        // Fallback
      }
    }

    let list = mockStore.getOrders();
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter((o) => 
        o.order_number.toLowerCase().includes(q) || 
        o.shipping_name.toLowerCase().includes(q) || 
        (o.shipping_company && o.shipping_company.toLowerCase().includes(q)) ||
        (o.user?.company_name && o.user.company_name.toLowerCase().includes(q)) ||
        o.email.toLowerCase().includes(q)
      );
    }
    if (params?.status && params.status !== "all") {
      list = list.filter((o) => o.status === params.status);
    }
    if (params?.payment_status && params.payment_status !== "all") {
      list = list.filter((o) => o.payment_status === params.payment_status);
    }
    if (params?.fulfillment_status && params.fulfillment_status !== "all") {
      list = list.filter((o) => o.fulfillment_status === params.fulfillment_status);
    }

    const page = params?.page ?? 1;
    const perPage = params?.per_page ?? 20;
    const start = (page - 1) * perPage;
    const sliced = list.slice(start, start + perPage);

    return {
      data: sliced,
      current_page: page,
      last_page: Math.max(1, Math.ceil(list.length / perPage)),
      total: list.length,
      per_page: perPage,
    };
  }

  async getOrderById(id: number | string): Promise<OrderRecord> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>(`/admin/orders/${id}`);
        const data = res?.data || res;
        if (data && data.id) return data;
      } catch {
        // Fallback
      }
    }

    const order = mockStore.getOrderById(String(id));
    if (!order) throw new Error("Order not found");
    return order;
  }

  async updateOrderStatus(id: number | string, status: string, note?: string): Promise<OrderRecord> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.patch<any>(`/admin/orders/${id}/status`, { status, note });
        const item = res?.data || res;
        if (item && item.id) return item;
      } catch {
        // Fallback
      }
    }

    const order = mockStore.getOrderById(String(id));
    if (!order) throw new Error("Order not found");

    order.status = status as any;
    order.updated_at = new Date().toISOString();
    if (!order.status_events) order.status_events = [];
    order.status_events.push({
      id: `ev_${Date.now()}`,
      order_id: order.id,
      event_type: `status_${status}`,
      message: note || `Order status updated to ${status} by admin.`,
      created_at: new Date().toISOString(),
    });

    mockStore.saveOrder(order);
    return order;
  }

  async updateFulfillment(
    id: number | string,
    fulfillment_status: string,
    tracking_number?: string,
    carrier?: string,
    note?: string
  ): Promise<OrderRecord> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.patch<any>(`/admin/orders/${id}/fulfillment`, {
          fulfillment_status,
          tracking_number,
          carrier,
          note,
        });
        const item = res?.data || res;
        if (item && item.id) return item;
      } catch {
        // Fallback
      }
    }

    const order = mockStore.getOrderById(String(id));
    if (!order) throw new Error("Order not found");

    order.fulfillment_status = fulfillment_status as any;
    if (tracking_number) order.tracking_number = tracking_number;
    if (carrier) order.carrier = carrier;
    order.updated_at = new Date().toISOString();

    if (!order.status_events) order.status_events = [];
    order.status_events.push({
      id: `ev_${Date.now()}`,
      order_id: order.id,
      event_type: `fulfillment_${fulfillment_status}`,
      message: note || `Fulfillment updated to ${fulfillment_status} (Carrier: ${carrier || order.carrier || "Aramex"}, Tracking: ${tracking_number || order.tracking_number || "N/A"}).`,
      created_at: new Date().toISOString(),
    });

    mockStore.saveOrder(order);
    return order;
  }

  async reviewPaymentProof(
    id: number | string,
    action: "approve" | "reject",
    note?: string
  ): Promise<OrderRecord> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.post<any>(`/admin/orders/${id}/payment-proof/review`, {
          action,
          note,
        });
        const item = res?.data || res;
        if (item && item.id) return item;
      } catch {
        // Fallback
      }
    }

    const order = mockStore.getOrderById(String(id));
    if (!order) throw new Error("Order not found");

    if (action === "approve") {
      order.payment_status = "paid";
      order.status = "processing";
    } else {
      order.payment_status = "failed";
    }
    order.updated_at = new Date().toISOString();

    if (!order.status_events) order.status_events = [];
    order.status_events.push({
      id: `ev_${Date.now()}`,
      order_id: order.id,
      event_type: action === "approve" ? "payment_succeeded" : "payment_failed",
      message: note || (action === "approve" ? "Payment proof verified and approved by accounts team." : "Payment proof rejected."),
      created_at: new Date().toISOString(),
    });

    mockStore.saveOrder(order);
    return order;
  }

  async createAramexShipment(id: number | string): Promise<{
    order: OrderRecord;
    tracking_number: string;
    shipment_id: string;
    label_url?: string;
    is_duplicate_prevented?: boolean;
    message?: string;
  }> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.post<any>(`/admin/orders/${id}/shipment/aramex`);
        const item = res?.data || res;
        if (item && item.order) return item;
      } catch {
        // Fallback
      }
    }

    const order = mockStore.getOrderById(String(id));
    if (!order) throw new Error("Order not found");

    const tracking_number = `AWB-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const shipment_id = `SHP-ARX-${Math.floor(10000 + Math.random() * 90000)}`;

    order.tracking_number = tracking_number;
    order.shipment_id = shipment_id;
    order.fulfillment_status = "shipped";
    order.carrier = "Aramex Express Air";
    order.carrier_status = "Shipment created at Dhaka (DAC) Hub";
    order.last_carrier_update = "Label generated, pickup dispatched.";

    if (!order.status_events) order.status_events = [];
    order.status_events.push({
      id: `ev_${Date.now()}`,
      order_id: order.id,
      event_type: "fulfillment_shipped",
      message: `Aramex shipment created with AWB tracking ${tracking_number}.`,
      created_at: new Date().toISOString(),
    });

    mockStore.saveOrder(order);

    return {
      order,
      tracking_number,
      shipment_id,
      label_url: `/api/v1/orders/${id}/documents/shipping-label`,
      message: "Aramex shipment created successfully in development mode.",
    };
  }

  async refreshTracking(id: number | string): Promise<{
    order: OrderRecord;
    tracking: any;
  }> {
    const order = mockStore.getOrderById(String(id));
    if (!order) throw new Error("Order not found");

    return {
      order,
      tracking: {
        status: order.carrier_status || "In Transit",
        last_update: order.last_carrier_update || "En route to port of destination",
        timestamp: new Date().toISOString(),
      },
    };
  }

  async updateShippingQuote(
    id: number | string,
    data: {
      amount: number;
      quote_reference?: string;
      carrier?: string;
      valid_until?: string;
      notes?: string;
    }
  ): Promise<{
    order: OrderRecord;
    shipping_snapshot: any;
    message?: string;
  }> {
    const order = mockStore.getOrderById(String(id));
    if (!order) throw new Error("Order not found");

    order.shipping_cost = data.amount;
    order.shipping_cents = Math.round(data.amount * 100);
    order.total_amount = order.subtotal + data.amount;
    order.total_cents = Math.round(order.total_amount * 100);
    if (data.carrier) order.carrier = data.carrier;

    mockStore.saveOrder(order);

    return {
      order,
      shipping_snapshot: {
        cost: data.amount,
        carrier: data.carrier || order.carrier,
        quote_reference: data.quote_reference,
      },
      message: "Shipping quote updated successfully.",
    };
  }
}

export const adminOrderService = new AdminOrderService();
