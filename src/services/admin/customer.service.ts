import { mockStore } from "@/lib/mock-data/mock-store";
import { addressService } from "@/lib/services/address.service";
import { apiClient } from "@/services/api-client";
import { isFrontendOnly } from "@/lib/frontend-mode";

export interface CustomerRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  company_name?: string;
  tax_id?: string;
  avatar_url?: string;
  orders_count: number;
  quotes_count: number;
  total_spent: number;
  created_at: string;
}

export interface CustomerAddressItem {
  id: string | number;
  name: string;
  contact_name?: string;
  company_name?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country_code: string;
  country?: string;
  phone?: string;
  is_default: boolean;
  destination_port?: string;
  transport_method?: string;
  special_instructions?: string;
}

export interface CustomerRecentOrder {
  id: string | number;
  order_number: string;
  total_amount: number;
  items_count: number;
  status: string;
  payment_status: string;
  created_at: string;
}

export interface CustomerRecentQuote {
  id: string | number;
  rfq_number: string;
  request_title?: string;
  status: string;
  created_at: string;
}

export interface CustomerPurchasedProduct {
  product_name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  order_number: string;
  order_date: string;
}

export interface CustomerDetail extends CustomerRecord {
  addresses?: CustomerAddressItem[];
  recent_orders?: CustomerRecentOrder[];
  recent_quotes?: CustomerRecentQuote[];
  purchased_products?: CustomerPurchasedProduct[];
}

export interface CustomerQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
  direction?: "asc" | "desc";
}

export interface CustomerSummaryMetrics {
  totalCustomers: number;
  totalOrders: number;
  totalSpent: number;
}

export class AdminCustomerService {
  async getCustomerSummary(): Promise<CustomerSummaryMetrics> {
    try {
      const res = await apiClient.get<any>("/admin/customers/summary");
      const data = res?.data || res;
      if (data && typeof data.totalCustomers === "number") {
        return {
          totalCustomers: Number(data.totalCustomers || 0),
          totalOrders: Number(data.totalOrders || 0),
          totalSpent: Number(data.totalSpent || 0),
        };
      }
    } catch (err) {
      console.warn("Failed to fetch customer summary from API, falling back:", err);
    }

    if (isFrontendOnly()) {
      const customers = mockStore.getUsers().filter((u) => u.role !== "admin");
      const orders = mockStore.getOrders();
      const customerUserIds = new Set(customers.map((c) => String(c.id)));
      const customerOrders = orders.filter((o) => customerUserIds.has(String(o.user_id)));
      const totalSpent = customerOrders.reduce(
        (sum, o) => sum + (o.payment_status === "paid" ? Number(o.total_amount || 0) : 0),
        0
      );
      return {
        totalCustomers: customers.length,
        totalOrders: customerOrders.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
      };
    }

    return {
      totalCustomers: 0,
      totalOrders: 0,
      totalSpent: 0,
    };
  }

  async getCustomers(params?: CustomerQueryParams): Promise<{
    data: CustomerRecord[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  }> {
    try {
      const res = await apiClient.get<any>("/admin/customers", { params: params as any });
      const data = res?.data || res;
      const rawItems = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      // Guarantee administrators are strictly excluded from the customer table and count
      const items = rawItems.filter((u: any) => u.role !== "admin");
      return {
        data: items,
        current_page: data?.current_page || 1,
        last_page: data?.last_page || 1,
        total: data?.total !== undefined ? Number(data.total) : items.length,
        per_page: data?.per_page || (params?.per_page ?? 20),
      };
    } catch (err) {
      console.warn("Failed to fetch customers from API, returning empty state:", err);
      return {
        data: [],
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: params?.per_page ?? 20,
      };
    }
  }

  async getCustomerById(id: number | string): Promise<CustomerDetail> {
    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.get<any>(`/admin/customers/${id}`);
        const customer = (res?.data || res) as CustomerDetail;
        if (customer && customer.role === "admin") {
          throw new Error("Administrator accounts cannot be viewed or managed in Customer Accounts.");
        }
        return customer;
      } catch (err) {
        throw err;
      }
    }

    const user = mockStore.getUserById(id);
    if (!user || user.role === "admin") {
      throw new Error("Customer account not found.");
    }

    const orders = mockStore
      .getOrders()
      .filter((o) => String(o.user_id) === String(id) || o.email.toLowerCase() === user.email.toLowerCase());
    const rfqs = mockStore.getRfqs().filter((r) => r.buyerEmail?.toLowerCase() === user.email.toLowerCase());
    const totalSpent = orders.reduce(
      (sum, o) => sum + (o.payment_status === "paid" ? Number(o.total_amount || 0) : 0),
      0
    );

    // Resolve customer saved addresses from AddressService
    let savedAddresses: CustomerAddressItem[] = [];
    try {
      const addrList = await addressService.getAddresses(user.id);
      if (Array.isArray(addrList) && addrList.length > 0) {
        savedAddresses = addrList.map((a) => ({
          id: a.id,
          name: a.name || a.contact_name || user.name,
          contact_name: a.contact_name,
          company_name: a.company_name || user.company_name,
          address1: a.address_line_1 || "",
          address2: a.address_line_2,
          city: a.city || "",
          state: a.state,
          postal_code: a.postal_code || "",
          country_code: a.country_code || "US",
          country: a.country,
          phone: a.phone || user.phone,
          is_default: Boolean(a.is_default),
          destination_port: (a as any).destination_port,
          transport_method: (a as any).transport_method,
          special_instructions: (a as any).special_instructions,
        }));
      }
    } catch {
      // Fallback
    }

    // If no addresses saved in address book, derive historical address snapshot from orders if present
    if (savedAddresses.length === 0 && orders.length > 0) {
      const latestOrder = orders[0];
      savedAddresses = [
        {
          id: `addr_snapshot_${user.id}`,
          name: latestOrder.shipping_name || user.name,
          company_name: latestOrder.shipping_company || user.company_name,
          address1: latestOrder.shipping_address1,
          address2: latestOrder.shipping_address2,
          city: latestOrder.shipping_city,
          state: latestOrder.shipping_region,
          postal_code: latestOrder.shipping_postal_code,
          country_code: latestOrder.shipping_country_code,
          phone: latestOrder.shipping_phone || user.phone,
          is_default: true,
          destination_port: latestOrder.destination_port,
          transport_method: latestOrder.transport_method,
        },
      ];
    }

    // Expose products purchased from orders
    const purchasedProducts: CustomerPurchasedProduct[] = [];
    orders.forEach((o) => {
      (o.items || []).forEach((item: any) => {
        purchasedProducts.push({
          product_name: item.product_name || item.name || "Commercial Garment Item",
          sku: item.sku || "—",
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unit_price || item.price || 0),
          line_total: Number(
            item.total_price ||
              item.line_total ||
              Number(item.quantity || 1) * Number(item.unit_price || item.price || 0)
          ),
          order_number: o.order_number,
          order_date: o.placed_at || o.created_at || new Date().toISOString(),
        });
      });
    });

    return {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: "customer",
      phone: user.phone,
      company_name: user.company_name,
      tax_id: user.tax_id,
      avatar_url: user.avatar_url,
      orders_count: orders.length,
      quotes_count: rfqs.length,
      total_spent: Math.round(totalSpent * 100) / 100,
      created_at: user.created_at || "2026-01-01T00:00:00Z",
      addresses: savedAddresses,
      recent_orders: orders.slice(0, 10).map((o) => ({
        id: o.id,
        order_number: o.order_number,
        total_amount: Number(o.total_amount || 0),
        items_count: o.items?.length || 1,
        status: o.status,
        payment_status: o.payment_status,
        created_at: o.placed_at || o.created_at,
      })),
      recent_quotes: rfqs.slice(0, 5).map((r) => ({
        id: r.id,
        rfq_number: r.rfqNumber,
        request_title: r.requestTitle,
        status: r.status,
        created_at: r.createdAt,
      })),
      purchased_products: purchasedProducts,
    };
  }

  async updateCustomer(id: number | string, data: Partial<CustomerRecord>): Promise<CustomerRecord> {
    const payload: Partial<CustomerRecord> = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      company_name: data.company_name,
      tax_id: data.tax_id,
    };

    if (!isFrontendOnly()) {
      try {
        const res = await apiClient.put<any>(`/admin/customers/${id}`, payload);
        return (res?.data || res) as CustomerRecord;
      } catch (err) {
        throw err;
      }
    }

    const targetUser = mockStore.getUserById(id);
    if (!targetUser || targetUser.role === "admin") {
      throw new Error("Cannot edit administrator account in Customer Accounts.");
    }

    const updated = mockStore.saveUser({
      ...payload,
      id: Number(id),
      role: "customer",
    });

    const userOrders = mockStore
      .getOrders()
      .filter((o) => String(o.user_id) === String(id) || o.email.toLowerCase() === updated.email.toLowerCase());
    const totalSpent = userOrders.reduce(
      (sum, o) => sum + (o.payment_status === "paid" ? Number(o.total_amount || 0) : 0),
      0
    );
    const userRfqs = mockStore
      .getRfqs()
      .filter((r) => r.buyerEmail?.toLowerCase() === updated.email.toLowerCase());

    return {
      id: Number(updated.id),
      name: updated.name,
      email: updated.email,
      role: "customer",
      phone: updated.phone,
      company_name: updated.company_name,
      tax_id: updated.tax_id,
      avatar_url: updated.avatar_url,
      orders_count: userOrders.length,
      quotes_count: userRfqs.length,
      total_spent: Math.round(totalSpent * 100) / 100,
      created_at: updated.created_at || new Date().toISOString(),
    };
  }

  async deleteCustomer(id: number | string): Promise<boolean> {
    if (!isFrontendOnly()) {
      try {
        await apiClient.delete(`/admin/customers/${id}`);
        return true;
      } catch (err) {
        console.error("Failed to delete customer:", err);
        throw err;
      }
    }
    const user = mockStore.getUserById(id);
    if (!user || user.role === "admin") {
      throw new Error("Cannot delete administrator via customer service.");
    }
    return mockStore.deleteUser(id);
  }
}

export const adminCustomerService = new AdminCustomerService();
