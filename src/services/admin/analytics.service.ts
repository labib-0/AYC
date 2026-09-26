import { apiClient } from "@/services/api-client";
import { mockStore } from "@/lib/mock-data/mock-store";
import { isFrontendOnly } from "@/lib/frontend-mode";

export type AnalyticsPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

export interface SalesProfitSummary {
  total_sales: number;
  gross_profit: number;
  units_sold: number;
  profit_margin: number;
}

export interface SalesProfitSeriesPoint {
  label: string;
  start_date: string;
  sales: number;
  gross_profit: number;
  units_sold: number;
}

export interface SalesProfitData {
  period: AnalyticsPeriod;
  date_from: string;
  date_to: string;
  timezone: string;
  summary: SalesProfitSummary;
  series: SalesProfitSeriesPoint[];
}

export interface AnalyticsQueryParams {
  period?: AnalyticsPeriod;
  date_from?: string;
  date_to?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export class AdminAnalyticsService {
  /**
   * Primary entrypoint: Retrieve sales & profit analytics.
   * Connects to the Laravel backend endpoint if available;
   * gracefully falls back to deterministic client calculation in demo mode.
   */
  async getSalesProfit(params: AnalyticsQueryParams = {}): Promise<SalesProfitData> {
    const period = params.period || "daily";

    try {
      const query: Record<string, string> = { period };
      if (params.date_from) query.date_from = params.date_from;
      if (params.date_to) query.date_to = params.date_to;

      const res = await apiClient.get<ApiResponse<SalesProfitData>>("/admin/analytics/sales-profit", {
        params: query,
      });

      const responseData = (res as any)?.data || res;
      if (responseData && responseData.summary) {
        return responseData as SalesProfitData;
      }
    } catch (err) {
      console.warn("Failed to fetch sales & profit analytics from API:", err);
    }

    if (isFrontendOnly()) {
      return this.calculateDemoSalesProfit(period, params.date_from, params.date_to);
    }

    return {
      period,
      date_from: params.date_from || new Date().toISOString().split("T")[0],
      date_to: params.date_to || new Date().toISOString().split("T")[0],
      timezone: "Asia/Dhaka",
      summary: {
        total_sales: 0,
        gross_profit: 0,
        units_sold: 0,
        profit_margin: 0,
      },
      series: [],
    };
  }

  /**
   * Deterministic calculation for frontend-only / demo preview mode.
   * Strictly adheres to the identical financial formulas and Asia/Dhaka time boundaries.
   */
  public calculateDemoSalesProfit(
    period: AnalyticsPeriod = "daily",
    dateFrom?: string,
    dateTo?: string
  ): SalesProfitData {
    const orders = mockStore.getOrders();
    const products = mockStore.getProducts();
    const productCostMap = new Map<string, number>();

    products.forEach((p) => {
      const cost = p.costPrice !== undefined ? Number(p.costPrice) : (p.wholesalePrice ? Number(p.wholesalePrice) * 0.55 : 0);
      productCostMap.set(String(p.id), cost);
    });

    // Valid statuses: processing, shipped, delivered, confirmed, or paid; excluding cancelled and refunded
    const validOrders = orders.filter((o) => {
      if (o.status === "cancelled") return false;
      if (o.payment_status === "refunded") return false;
      return (
        ["confirmed", "processing", "shipped", "delivered"].includes(o.status) ||
        o.payment_status === "paid"
      );
    });

    const now = new Date();
    // Resolve date boundaries
    let startDate: Date;
    let endDate: Date;

    if (dateFrom && dateTo) {
      startDate = new Date(dateFrom + "T00:00:00+06:00");
      endDate = new Date(dateTo + "T23:59:59+06:00");
    } else {
      endDate = new Date();
      startDate = new Date();
      if (period === "weekly") {
        startDate.setDate(now.getDate() - 12 * 7);
      } else if (period === "monthly") {
        startDate.setMonth(now.getMonth() - 11);
      } else if (period === "quarterly") {
        startDate.setMonth(now.getMonth() - 24);
      } else if (period === "yearly") {
        startDate.setFullYear(now.getFullYear() - 4);
      } else {
        startDate.setDate(now.getDate() - 29);
      }
    }

    // Pre-generate buckets for zero activity timeline
    const buckets: Record<string, { label: string; start_date: string; sales: number; cost: number; discount: number; units: number }> = {};
    const cursor = new Date(startDate.getTime());

    while (cursor <= endDate) {
      const key = this.formatDateKey(cursor, period);
      if (!buckets[key]) {
        buckets[key] = {
          label: this.formatBucketLabel(cursor, period),
          start_date: cursor.toISOString().split("T")[0],
          sales: 0,
          cost: 0,
          discount: 0,
          units: 0,
        };
      }
      if (period === "weekly") {
        cursor.setDate(cursor.getDate() + 7);
      } else if (period === "monthly") {
        cursor.setMonth(cursor.getMonth() + 1);
      } else if (period === "quarterly") {
        cursor.setMonth(cursor.getMonth() + 3);
      } else if (period === "yearly") {
        cursor.setFullYear(cursor.getFullYear() + 1);
      } else {
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    // Distribute valid orders
    validOrders.forEach((order) => {
      const orderDate = new Date(order.created_at || order.placed_at || Date.now());
      if (orderDate < startDate || orderDate > endDate) return;

      const key = this.formatDateKey(orderDate, period);
      if (!buckets[key]) {
        buckets[key] = {
          label: this.formatBucketLabel(orderDate, period),
          start_date: orderDate.toISOString().split("T")[0],
          sales: 0,
          cost: 0,
          discount: 0,
          units: 0,
        };
      }

      let orderSales = 0;
      let orderCost = 0;
      let orderUnits = 0;

      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          const qty = Number(item.quantity) || 1;
          const sellingPrice = Number(item.unit_price) || 0;
          const itemWithCost = item as { buying_price_at_sale?: number | string };
          const snapCost = itemWithCost.buying_price_at_sale !== undefined
            ? Number(itemWithCost.buying_price_at_sale)
            : (productCostMap.get(String(item.product_id)) || (sellingPrice * 0.55));

          orderSales += sellingPrice * qty;
          orderCost += snapCost * qty;
          orderUnits += qty;
        });
      } else {
        orderSales = Number(order.subtotal) || Number(order.total_amount) || 0;
        orderCost = orderSales * 0.55;
        orderUnits = 1;
      }

      const discount = Number(order.discount_amount) || 0;
      buckets[key].sales += orderSales;
      buckets[key].cost += orderCost;
      buckets[key].discount += discount;
      buckets[key].units += orderUnits;
    });

    const series: SalesProfitSeriesPoint[] = [];
    let totalSales = 0;
    let totalCost = 0;
    let totalDiscount = 0;
    let totalUnits = 0;

    Object.values(buckets).forEach((b) => {
      const sales = Math.round(b.sales * 100) / 100;
      const cost = Math.round(b.cost * 100) / 100;
      const discount = Math.round(b.discount * 100) / 100;
      const profit = Math.round((sales - cost - discount) * 100) / 100;

      series.push({
        label: b.label,
        start_date: b.start_date,
        sales,
        gross_profit: profit,
        units_sold: b.units,
      });

      totalSales += sales;
      totalCost += cost;
      totalDiscount += discount;
      totalUnits += b.units;
    });

    totalSales = Math.round(totalSales * 100) / 100;
    const grossProfit = Math.round((totalSales - totalCost - totalDiscount) * 100) / 100;
    const profitMargin = totalSales > 0 ? Math.round((grossProfit / totalSales) * 1000) / 10 : 0.0;

    return {
      period,
      date_from: startDate.toISOString().split("T")[0],
      date_to: endDate.toISOString().split("T")[0],
      timezone: "Asia/Dhaka",
      summary: {
        total_sales: totalSales,
        gross_profit: grossProfit,
        units_sold: totalUnits,
        profit_margin: profitMargin,
      },
      series,
    };
  }

  private formatDateKey(date: Date, period: AnalyticsPeriod): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    if (period === "yearly") return String(y);
    if (period === "quarterly") {
      const q = Math.floor(date.getMonth() / 3) + 1;
      return `${y}-Q${q}`;
    }
    if (period === "monthly") return `${y}-${m}`;
    if (period === "weekly") {
      // Simple ISO week key
      const oneJan = new Date(y, 0, 1);
      const week = Math.ceil(((date.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
      return `${y}-W${week}`;
    }
    return `${y}-${m}-${d}`;
  }

  private formatBucketLabel(date: Date, period: AnalyticsPeriod): string {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const y = date.getFullYear();
    const m = months[date.getMonth()];
    const d = date.getDate();

    if (period === "yearly") return String(y);
    if (period === "quarterly") {
      const q = Math.floor(date.getMonth() / 3) + 1;
      return `Q${q} ${y}`;
    }
    if (period === "monthly") return `${m} ${y}`;
    if (period === "weekly") {
      const oneJan = new Date(y, 0, 1);
      const week = Math.ceil(((date.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
      return `W${week} (${m} ${d})`;
    }
    return `${m} ${d}`;
  }
}

export const adminAnalyticsService = new AdminAnalyticsService();
