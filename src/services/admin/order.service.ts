import { OrderRecord } from "@/services/order.service";
import { mockStore } from "@/lib/mock-data/mock-store";
import { apiClient } from "@/services/api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";

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
  date_preset?: string;
  date_from?: string;
  date_to?: string;
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
    try {
      const res = await this.getOrders({ per_page: 500 });
      const list = res.data || [];
      return {
        totalOrders: res.total !== undefined ? res.total : list.length,
        pending: list.filter((o) => o.status === "pending").length,
        confirmed: list.filter((o) => o.status === "confirmed").length,
        processing: list.filter((o) => o.status === "processing").length,
        shipped: list.filter((o) => o.status === "shipped").length,
        delivered: list.filter((o) => o.status === "delivered").length,
        cancelled: list.filter((o) => o.status === "cancelled").length,
        paid: list.filter((o) => o.payment_status === "paid").length,
        pendingPayment: list.filter((o) => o.payment_status === "pending").length,
      };
    } catch {
      return {
        totalOrders: 0,
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        paid: 0,
        pendingPayment: 0,
      };
    }
  }

  async getOrders(params?: AdminOrderQueryParams): Promise<{
    data: OrderRecord[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  }> {
    try {
      const res = await apiClient.get<any>("/admin/orders", { params: params as any });
      const data = res?.data || res;
      const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      return {
        data: items,
        current_page: data?.current_page || 1,
        last_page: data?.last_page || 1,
        total: data?.total !== undefined ? Number(data.total) : items.length,
        per_page: data?.per_page || (params?.per_page ?? 20),
      };
    } catch (err) {
      console.warn("Failed to fetch orders from API, returning empty database state:", err);
      return {
        data: [],
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: params?.per_page ?? 20,
      };
    }
  }

  async getOrderById(id: number | string): Promise<OrderRecord> {
    if (!isFrontendOnly()) {
      const res = await apiClient.get<any>(`/admin/orders/${id}`);
      return (res?.data || res) as OrderRecord;
    }

    const order = mockStore.getOrderById(String(id));
    if (!order) throw new Error("Order not found");
    return order;
  }

  async updateOrderStatus(id: number | string, status: string, note?: string): Promise<OrderRecord> {
    if (!isFrontendOnly()) {
      const res = await apiClient.patch<any>(`/admin/orders/${id}/status`, { status, note });
      return (res?.data || res) as OrderRecord;
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
      const res = await apiClient.patch<any>(`/admin/orders/${id}/fulfillment`, {
        fulfillment_status,
        tracking_number,
        carrier,
        note,
      });
      return (res?.data || res) as OrderRecord;
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
    note?: string,
    paymentDetails?: {
      payment_method?: string;
      transaction_id?: string;
      payer_name?: string;
      bank_name?: string;
      account_number?: string;
      payment_amount?: number;
      payment_date?: string;
    }
  ): Promise<OrderRecord> {
    if (!isFrontendOnly()) {
      const res = await apiClient.post<any>(`/admin/orders/${id}/payment-proof/review`, {
        action,
        note,
        ...paymentDetails,
      });
      return (res?.data || res) as OrderRecord;
    }

    const order = mockStore.getOrderById(String(id));
    if (!order) throw new Error("Order not found");

    if (action === "approve") {
      order.payment_status = "paid";
      order.status = "processing";
      order.payment_confirmed_at = new Date().toISOString();
      order.payment_details = {
        payment_status: "PAID",
        payment_method: paymentDetails?.payment_method || order.payment_method || "Bank Transfer",
        transaction_id: paymentDetails?.transaction_id || `TXN_${Date.now()}`,
        payer_name: paymentDetails?.payer_name || order.shipping_name || "Customer",
        bank_name: paymentDetails?.bank_name || "Pubali Bank Limited",
        account_number: paymentDetails?.account_number || "M/S AYAAN CLOTHING",
        payment_amount: paymentDetails?.payment_amount ?? order.total_amount,
        currency: order.currency || "USD",
        payment_date: paymentDetails?.payment_date || new Date().toISOString().split("T")[0],
        notes: note || "Payment verified by accounts team.",
        receipt_url: order.payment_proof_url,
        confirmed_at: new Date().toISOString(),
        confirmed_by_name: "Admin",
      };
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
