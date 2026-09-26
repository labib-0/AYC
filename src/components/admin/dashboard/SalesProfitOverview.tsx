"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  DollarSign,
  Package,
  Percent,
  Calendar,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  adminAnalyticsService,
  AnalyticsPeriod,
  SalesProfitData,
} from "@/services/admin/analytics.service";

function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = `$${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  return isNegative ? `-${formatted}` : formatted;
}

function formatCompactYAxis(value: number): string {
  if (value === 0) return "$0";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1000000) {
    return `${sign}$${(abs / 1000000).toFixed(1)}M`;
  }
  if (abs >= 1000) {
    return `${sign}$${(abs / 1000).toFixed(0)}k`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: {
      label?: string;
      start_date?: string;
      sales?: number;
      gross_profit?: number;
      units_sold?: number;
    };
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload;
  const sales = dataPoint?.sales ?? 0;
  const profit = dataPoint?.gross_profit ?? 0;
  const units = dataPoint?.units_sold ?? 0;
  const margin = sales > 0 ? ((profit / sales) * 100).toFixed(1) : "0.0";

  return (
    <div className="bg-popover/95 backdrop-blur-xs border border-border/80 rounded-xl p-3.5 shadow-lg text-xs space-y-2 min-w-[200px] z-50">
      <div className="font-bold text-foreground border-b border-border/60 pb-1.5 flex items-center justify-between">
        <span>{label}</span>
        {dataPoint?.start_date && (
          <span className="text-[10px] text-muted-foreground font-mono font-normal">
            {dataPoint.start_date}
          </span>
        )}
      </div>
      <div className="space-y-1.5 font-mono">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-blue-500 font-sans font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            Gross Sales:
          </span>
          <span className="font-bold text-foreground">{formatCurrency(sales)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-emerald-500 font-sans font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Gross Profit:
          </span>
          <span className={`font-bold ${profit < 0 ? "text-destructive" : "text-emerald-500"}`}>
            {formatCurrency(profit)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/40 text-[11px]">
          <span className="text-muted-foreground font-sans">Profit Margin:</span>
          <span className={`font-bold ${Number(margin) < 0 ? "text-destructive" : "text-foreground"}`}>
            {margin}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[11px]">
          <span className="text-muted-foreground font-sans">Units Sold:</span>
          <span className="font-semibold text-foreground">{units.toLocaleString()} pcs</span>
        </div>
      </div>
    </div>
  );
}

export default function SalesProfitOverview() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("daily");
  const [dateRangePreset, setDateRangePreset] = useState<string>("default");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [showCustomDates, setShowCustomDates] = useState<boolean>(false);

  const [data, setData] = useState<SalesProfitData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data
  const fetchAnalytics = useCallback(
    async (isManualRefresh: boolean = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const queryParams: { period: AnalyticsPeriod; date_from?: string; date_to?: string } = {
          period,
        };

        if (showCustomDates && customFrom && customTo) {
          queryParams.date_from = customFrom;
          queryParams.date_to = customTo;
        }

        const res = await adminAnalyticsService.getSalesProfit(queryParams);
        setData(res);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load sales & profit analytics.";
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, showCustomDates, customFrom, customTo]
  );

  useEffect(() => {
    fetchAnalytics(false);
  }, [fetchAnalytics]);

  // Handle Preset Changes
  const handlePresetChange = (preset: string) => {
    setDateRangePreset(preset);
    if (preset === "custom") {
      setShowCustomDates(true);
      return;
    }

    setShowCustomDates(false);
    const now = new Date();
    const end = now.toISOString().split("T")[0];
    let start = end;

    if (preset === "last_7_days") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      start = d.toISOString().split("T")[0];
      setCustomFrom(start);
      setCustomTo(end);
    } else if (preset === "last_30_days") {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      start = d.toISOString().split("T")[0];
      setCustomFrom(start);
      setCustomTo(end);
    } else if (preset === "this_month") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      start = d.toISOString().split("T")[0];
      setCustomFrom(start);
      setCustomTo(end);
    } else if (preset === "last_quarter") {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      start = d.toISOString().split("T")[0];
      setCustomFrom(start);
      setCustomTo(end);
    } else {
      // default
      setCustomFrom("");
      setCustomTo("");
    }
  };

  const isAllZero = useMemo(() => {
    if (!data || !data.series || data.series.length === 0) return true;
    return data.summary.total_sales === 0 && data.summary.gross_profit === 0;
  }, [data]);

  return (
    <section
      aria-label="Sales and Profit Overview"
      className="p-5 sm:p-6 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-6"
    >
      {/* ── Section Header with Filter Controls ───────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-foreground font-sans">
              SALES &amp; PROFIT OVERVIEW
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400">
              COMMERCIAL
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-sans mt-0.5">
            Real-time financial performance, product COGS snapshot, and margin overview
          </p>
        </div>

        {/* Filter Controls Strip */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Period Selector (Daily, Weekly, Monthly, Quarterly, Yearly) */}
          <div className="relative">
            <label htmlFor="period-selector" className="sr-only">
              Aggregation Granularity
            </label>
            <select
              id="period-selector"
              value={period}
              disabled={loading}
              onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-wider border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
          </div>

          {/* Date Range Preset Selector */}
          <div className="relative">
            <label htmlFor="range-preset" className="sr-only">
              Date Range Preset
            </label>
            <select
              id="range-preset"
              value={dateRangePreset}
              disabled={loading}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground text-xs font-medium border border-border/70 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
            >
              <option value="default">Default Range</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_quarter">Last 90 Days</option>
              <option value="custom">Custom Dates</option>
            </select>
            <Calendar
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => fetchAnalytics(true)}
            disabled={loading || refreshing}
            title="Refresh analytics data"
            aria-label="Refresh analytics data"
            className="p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/70 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Optional Custom Date Range Inputs ───────────────────────────── */}
      {showCustomDates && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">From:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2.5 py-1 rounded-md bg-card border border-border/80 text-foreground text-xs font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">To:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2.5 py-1 rounded-md bg-card border border-border/80 text-foreground text-xs font-mono"
            />
          </div>
          <button
            type="button"
            onClick={() => fetchAnalytics(false)}
            disabled={!customFrom || !customTo || loading}
            className="px-3 py-1 rounded-md bg-foreground text-background text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            Apply
          </button>
        </div>
      )}

      {/* ── Error Banner State ─────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center justify-between gap-3 text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="text-xs font-medium font-sans">
              {error}
            </span>
          </div>
          <button
            type="button"
            onClick={() => fetchAnalytics(false)}
            className="px-3 py-1 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Summary Metrics Strip (4 Cards) ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Sales */}
        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
              TOTAL SALES
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <DollarSign size={14} />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-24 bg-secondary/80 rounded-md animate-pulse my-1" />
          ) : (
            <div className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight tabular-nums">
              {formatCurrency(data?.summary.total_sales ?? 0)}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            Gross sales revenue in USD
          </p>
        </div>

        {/* Gross Profit */}
        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
              GROSS PROFIT
            </span>
            <div
              className={`p-1.5 rounded-lg ${
                (data?.summary.gross_profit ?? 0) < 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <TrendingUp size={14} />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-24 bg-secondary/80 rounded-md animate-pulse my-1" />
          ) : (
            <div
              className={`text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums ${
                (data?.summary.gross_profit ?? 0) < 0
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {formatCurrency(data?.summary.gross_profit ?? 0)}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            Revenue minus COGS &amp; discounts
          </p>
        </div>

        {/* Units Sold */}
        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
              UNITS SOLD
            </span>
            <div className="p-1.5 rounded-lg bg-secondary text-muted-foreground">
              <Package size={14} />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-secondary/80 rounded-md animate-pulse my-1" />
          ) : (
            <div className="text-xl sm:text-2xl font-bold font-mono text-foreground tracking-tight tabular-nums">
              {(data?.summary.units_sold ?? 0).toLocaleString()}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            Total commercial pieces fulfilled
          </p>
        </div>

        {/* Profit Margin */}
        <div className="p-4 rounded-xl bg-card border border-border/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-sans">
              PROFIT MARGIN
            </span>
            <div
              className={`p-1.5 rounded-lg ${
                (data?.summary.profit_margin ?? 0) < 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <Percent size={14} />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-16 bg-secondary/80 rounded-md animate-pulse my-1" />
          ) : (
            <div
              className={`text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums ${
                (data?.summary.profit_margin ?? 0) < 0
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {(data?.summary.profit_margin ?? 0).toFixed(1)}%
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            Gross profit as % of revenue
          </p>
        </div>
      </div>

      {/* ── Chart Container Area ────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-sans">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#2563eb]" />
              <span className="text-muted-foreground font-medium">Sales ($)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#10b981]" />
              <span className="text-muted-foreground font-medium">Gross Profit ($)</span>
            </div>
          </div>

          {data && (
            <span className="text-[11px] text-muted-foreground font-mono">
              {data.date_from} → {data.date_to} ({data.timezone})
            </span>
          )}
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="h-72 w-full rounded-xl bg-secondary/20 border border-border/60 animate-pulse flex items-center justify-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
              Loading financial metrics...
            </div>
          </div>
        ) : isAllZero ? (
          /* Empty State Display with Baseline Chart */
          <div className="relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/70 backdrop-blur-2xs z-10 rounded-xl space-y-1">
              <DollarSign size={24} className="text-muted-foreground/60" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">
                No sales data for this period.
              </p>
              <p className="text-[11px] text-muted-foreground/80 font-sans">
                Try selecting a different date range or period granularity above.
              </p>
            </div>
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.series || []} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCompactYAxis} />
                  <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={1} dot={false} />
                  <Line type="monotone" dataKey="gross_profit" stroke="#10b981" strokeWidth={1} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          /* Active Dual Series Line Chart */
          <div className="h-72 sm:h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data?.series || []}
                margin={{ top: 10, right: 20, left: 0, bottom: 25 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="currentColor"
                  className="text-[11px] text-muted-foreground font-mono"
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  stroke="currentColor"
                  className="text-[11px] text-muted-foreground font-mono"
                  tickLine={false}
                  tickFormatter={formatCompactYAxis}
                  dx={-4}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={24}
                  iconType="plainline"
                  wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
                />
                <Line
                  type="monotone"
                  name="Sales ($)"
                  dataKey="sales"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#2563eb", strokeWidth: 1 }}
                  activeDot={{ r: 5, strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  name="Gross Profit ($)"
                  dataKey="gross_profit"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#10b981", strokeWidth: 1 }}
                  activeDot={{ r: 5, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
