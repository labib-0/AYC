import { mockStore } from "@/lib/mock-data/mock-store";
import { addressService } from "@/lib/services/address.service";

export interface CustomerRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  company_name?: string;
  tax_id?: string;
  b2b_approval_status?: "pending" | "approved" | "rejected" | string;
  b2b_payment_terms?: "none" | "net_30" | "net_60" | "terms" | string;
  b2b_credit_limit?: number;
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

export interface CustomerDetail extends CustomerRecord {
  addresses?: CustomerAddressItem[];
  recent_orders?: CustomerRecentOrder[];
  recent_quotes?: CustomerRecentQuote[];
}

export interface CustomerQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  role?: string;
  b2b_approval_status?: string;
  sort?: string;
  direction?: "asc" | "desc";
}

export interface CustomerSummaryMetrics {
  totalCustomers: number;
  corporateAccounts: number;
  b2bAccounts: number;
  approvedB2b: number;
  pendingB2b: number;
}

export class AdminCustomerService {
  async getCustomerSummary(): Promise<CustomerSummaryMetrics> {
    const users = mockStore.getUsers().filter((u) => u.role !== "admin");
    const corporate = users.filter((u) => Boolean(u.company_name)).length;
    return {
      totalCustomers: users.length,
      corporateAccounts: corporate,
      b2bAccounts: corporate,
      approvedB2b: users.filter((u) => u.b2b_approval_status === "approved").length,
      pendingB2b: users.filter((u) => u.b2b_approval_status === "pending").length,
    };
  }

  async getCustomers(params?: CustomerQueryParams): Promise<{
    data: CustomerRecord[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  }> {
    // By default, customer directory lists non-admin buyer accounts (unless role filter specifically requests otherwise)
    const users = mockStore.getUsers().filter((u) => {
      if (params?.role && params.role !== "all") {
        if (params.role === "corporate") {
          return Boolean(u.company_name);
        }
        return u.role === params.role;
      }
      return u.role !== "admin";
    });

    const orders = mockStore.getOrders();
    const rfqs = mockStore.getRfqs();

    let list: CustomerRecord[] = users.map((u) => {
      const userOrders = orders.filter(
        (o) => String(o.user_id) === String(u.id) || o.email.toLowerCase() === u.email.toLowerCase()
      );
      const userSpent = userOrders.reduce(
        (sum, o) => sum + (o.payment_status === "paid" ? Number(o.total_amount || 0) : 0),
        0
      );
      const userRfqs = rfqs.filter((r) => r.buyerEmail?.toLowerCase() === u.email.toLowerCase());

      return {
        id: Number(u.id),
        name: u.name,
        email: u.email,
        role: u.role || "customer",
        phone: u.phone,
        company_name: u.company_name,
        tax_id: u.tax_id,
        b2b_approval_status: u.b2b_approval_status || "approved",
        b2b_payment_terms: u.b2b_payment_terms || "none",
        b2b_credit_limit: u.b2b_credit_limit || 0,
        avatar_url: u.avatar_url,
        orders_count: userOrders.length,
        quotes_count: userRfqs.length,
        total_spent: Math.round(userSpent * 100) / 100,
        created_at: u.created_at || "2026-01-01T00:00:00Z",
      };
    });

    // Search filter
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.company_name && c.company_name.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q))
      );
    }

    // Role filter
    if (params?.role && params.role !== "all") {
      list = list.filter((c) => c.role === params.role);
    }

    // B2B status filter
    if (params?.b2b_approval_status && params.b2b_approval_status !== "all") {
      list = list.filter((c) => c.b2b_approval_status === params.b2b_approval_status);
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

  async getCustomerById(id: number | string): Promise<CustomerDetail> {
    const user = mockStore.getUserById(id);
    if (!user) {
      throw new Error("Customer not found");
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

    return {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: user.role || "customer",
      phone: user.phone,
      company_name: user.company_name,
      tax_id: user.tax_id,
      b2b_approval_status: user.b2b_approval_status || "approved",
      b2b_payment_terms: user.b2b_payment_terms || "none",
      b2b_credit_limit: user.b2b_credit_limit || 0,
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
    };
  }

  async updateCustomer(id: number | string, data: Partial<CustomerRecord>): Promise<CustomerRecord> {
    const roleVal =
      data.role === "admin" || data.role === "sales" || data.role === "customer"
        ? data.role
        : data.role === "b2b_buyer"
        ? "customer"
        : undefined;
    const approvalVal =
      data.b2b_approval_status === "approved" ||
      data.b2b_approval_status === "pending" ||
      data.b2b_approval_status === "rejected"
        ? data.b2b_approval_status
        : undefined;
    const termsVal =
      data.b2b_payment_terms === "none" ||
      data.b2b_payment_terms === "net_30" ||
      data.b2b_payment_terms === "net_60" ||
      data.b2b_payment_terms === "terms"
        ? data.b2b_payment_terms
        : undefined;

    const updated = mockStore.saveUser({
      ...data,
      id: Number(id),
      role: roleVal,
      b2b_approval_status: approvalVal,
      b2b_payment_terms: termsVal,
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
      role: updated.role || "customer",
      phone: updated.phone,
      company_name: updated.company_name,
      tax_id: updated.tax_id,
      b2b_approval_status: updated.b2b_approval_status,
      b2b_payment_terms: updated.b2b_payment_terms,
      b2b_credit_limit: updated.b2b_credit_limit,
      avatar_url: updated.avatar_url,
      orders_count: userOrders.length,
      quotes_count: userRfqs.length,
      total_spent: Math.round(totalSpent * 100) / 100,
      created_at: updated.created_at || new Date().toISOString(),
    };
  }
}

export const adminCustomerService = new AdminCustomerService();
