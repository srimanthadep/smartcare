import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Gauge,
  IndianRupee,
  Landmark,
  LayoutDashboard,
  Minus,
  ReceiptText,
  Server,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type TrendType = "positive" | "negative" | "neutral";

const periodOptions = [
  { value: "daily", label: "Day" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "yearly", label: "Year" },
];

const chartColors = {
  revenue: "#f97316",
  visits: "#0f766e",
  paid: "#16a34a",
  pending: "#d97706",
  overdue: "#dc2626",
  neutral: "#475569",
  blue: "#2563eb",
  violet: "#7c3aed",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.055 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function formatCurrency(value: number | string | undefined) {
  const numericValue = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function formatCompact(value: number | string | undefined) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function getTrend(current: number, previous: number) {
  if (!previous && current) return { label: "New momentum", value: 100, type: "positive" as TrendType };
  if (!previous) return { label: "No prior data", value: 0, type: "neutral" as TrendType };
  const value = Math.round(((current - previous) / previous) * 100);
  return {
    label: `${value >= 0 ? "+" : ""}${value}% vs previous`,
    value,
    type: value > 0 ? "positive" as TrendType : value < 0 ? "negative" as TrendType : "neutral" as TrendType,
  };
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function trendIcon(type: TrendType) {
  if (type === "positive") return <ArrowUpRight className="h-3.5 w-3.5" />;
  if (type === "negative") return <ArrowDownRight className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "rgba(255,255,255,0.98)",
  boxShadow: "0 16px 40px rgba(26, 18, 14, 0.12)",
};

const EmptyChart = ({ label }: { label: string }) => (
  <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/20 text-sm text-muted-foreground">
    {label}
  </div>
);

const MetricTile = ({
  title,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "orange" | "teal" | "blue" | "green" | "red" | "neutral";
}) => {
  const toneMap = {
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
    neutral: "border-border bg-secondary/40 text-foreground",
  };

  return (
    <motion.div variants={item}>
      <Card className="h-full overflow-hidden rounded-lg border-border/70 bg-white/95 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", toneMap[tone])}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="rounded-full border border-border/60 bg-muted/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Live
            </div>
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-semibold leading-tight text-foreground">{value}</p>
          <p className="mt-3 min-h-5 text-sm text-muted-foreground">{detail}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const ChartPanel = ({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.div variants={item} className={className}>
    <Card className="h-full rounded-lg border-border/70 bg-white/95 shadow-sm">
      <CardContent className="p-4 md:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  </motion.div>
);

const InsightRow = ({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
}) => (
  <div className="flex gap-3 rounded-lg border border-border/70 bg-muted/20 p-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  </div>
);

const Analytics: React.FC = () => {
  const [period, setPeriod] = useState("monthly");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    document.title = "Analytics | Siara Dental";
  }, []);

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", period],
    queryFn: () => api.getDashboard(period),
  });

  const invoicesQuery = useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.getInvoices(),
  });

  const bootstrapQuery = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => api.getBootstrap(),
  });

  const loading = dashboardQuery.isLoading || invoicesQuery.isLoading;
  const dashboard = dashboardQuery.data as any;
  const invoices = (invoicesQuery.data as any[]) ?? [];
  const doctors = (bootstrapQuery.data as any)?.doctors ?? [];

  const analytics = useMemo(() => {
    const stats = dashboard?.stats ?? {};
    const revenueTrend = (dashboard?.revenueTrend ?? []).map((entry: any) => ({
      period: entry.month,
      revenue: Number(entry.revenue || 0),
      target: Math.round(Number(entry.revenue || 0) * 1.12),
    }));
    const visitTrend = (dashboard?.patientVisits ?? []).map((entry: any) => ({
      period: entry.day,
      visits: Number(entry.visits || 0),
    }));

    const lastRevenue = revenueTrend[revenueTrend.length - 1]?.revenue ?? 0;
    const previousRevenue = revenueTrend[revenueTrend.length - 2]?.revenue ?? 0;
    const revenueMovement = getTrend(lastRevenue, previousRevenue);
    const totalRevenue = Number(stats.totalRevenue ?? stats.revenue ?? 0);
    const totalPaid = Number(stats.totalPaid ?? 0);
    const totalPending = Number(stats.totalPending ?? 0);
    const periodRevenue = Number(stats.periodRevenue ?? stats.revenue ?? 0);
    const collectionRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0;
    const totalInvoiceValue = invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const avgInvoice = invoices.length ? Math.round(totalInvoiceValue / invoices.length) : 0;

    const invoiceStatus = [
      { name: "Paid", value: invoices.filter((invoice) => invoice.status === "Paid").length, fill: chartColors.paid },
      { name: "Pending", value: invoices.filter((invoice) => invoice.status === "Pending" || invoice.status === "Partially Paid").length, fill: chartColors.pending },
      { name: "Overdue", value: invoices.filter((invoice) => invoice.status === "Overdue").length, fill: chartColors.overdue },
    ].filter((entry) => entry.value > 0);
    const invoiceTotal = invoiceStatus.reduce((sum, entry) => sum + entry.value, 0);

    const departmentSeries = (dashboard?.departmentBreakdown ?? []).map((entry: any, index: number) => ({
      ...entry,
      fill: entry.fill || [chartColors.revenue, chartColors.visits, chartColors.blue, chartColors.violet][index % 4],
    }));
    const topDepartment = [...departmentSeries].sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0];
    const departmentTotal = departmentSeries.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
    const totalVisits = visitTrend.reduce((sum, entry) => sum + entry.visits, 0);
    const avgVisits = visitTrend.length ? Math.round(totalVisits / visitTrend.length) : 0;
    const appointmentsToday = dashboard?.appointmentsToday ?? [];

    return {
      stats,
      revenueTrend,
      visitTrend,
      revenueMovement,
      totalRevenue,
      totalPaid,
      totalPending,
      periodRevenue,
      collectionRate,
      avgInvoice,
      invoiceStatus,
      invoiceTotal,
      departmentSeries,
      departmentTotal,
      topDepartment,
      avgVisits,
      appointmentsToday,
    };
  }, [dashboard, invoices]);

  if (loading) {
    return (
      <div className="luxury-page space-y-4">
        <Skeleton className="h-44 rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="luxury-page">
        <Card className="rounded-lg border-destructive/30 bg-destructive/5">
          <CardContent className="py-6 text-sm text-destructive">Failed to load analytics.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="luxury-page space-y-4 md:space-y-5"
    >
      <motion.section
        variants={item}
        className="overflow-hidden rounded-lg border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl"
      >
        <div className="grid gap-6 p-5 lg:grid-cols-2 md:p-7">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-md border-white/15 bg-white/10 text-white hover:bg-white/10">
                  <LayoutDashboard className="mr-1 h-3.5 w-3.5" />
                  Analytics Command Center
                </Badge>
                <Badge className="rounded-md border-teal-300/30 bg-teal-300/10 text-teal-100 hover:bg-teal-300/10">
                  {isAdmin ? "Admin view" : "Doctor view"}
                </Badge>
              </div>
              <h1 className="mt-5 max-w-4xl font-heading text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
                Clinic performance, cash flow, and operational signal in one view.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72 md:text-base">
                Track revenue movement, patient demand, invoice health, and department concentration without leaving the analytics surface.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div
                className="grid h-11 w-full rounded-lg border border-white/10 bg-white/10 p-1 sm:w-96"
                style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
              >
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPeriod(option.value)}
                    className={cn(
                      "rounded-md text-xs font-semibold text-white/70 transition",
                      period === option.value && "bg-white text-sidebar-background shadow-sm"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/72">
                <Sparkles className="h-4 w-4 text-orange-200" />
                Updated from live clinic records
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/55">Period revenue</p>
              <p className="mt-3 text-3xl font-semibold">{formatCurrency(analytics.periodRevenue)}</p>
              <div
                className={cn(
                  "mt-3 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold",
                  analytics.revenueMovement.type === "positive" && "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
                  analytics.revenueMovement.type === "negative" && "border-red-300/30 bg-red-300/10 text-red-100",
                  analytics.revenueMovement.type === "neutral" && "border-white/10 bg-white/10 text-white/65"
                )}
              >
                {trendIcon(analytics.revenueMovement.type)}
                {analytics.revenueMovement.label}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/55">Collection rate</p>
              <p className="mt-3 text-3xl font-semibold">{analytics.collectionRate}%</p>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-emerald-300"
                  style={{ width: `${Math.min(analytics.collectionRate, 100)}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/55">Avg visits</p>
              <p className="mt-3 text-3xl font-semibold">{analytics.avgVisits}</p>
              <p className="mt-3 text-xs text-white/60">Average demand per plotted period</p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/55">Top department</p>
              <p className="mt-3 truncate text-2xl font-semibold">{analytics.topDepartment?.name || "No data"}</p>
              <p className="mt-3 text-xs text-white/60">{analytics.topDepartment?.value || 0} recorded cases</p>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          title="Total revenue"
          value={formatCurrency(analytics.totalRevenue)}
          detail={`${formatCompact(analytics.periodRevenue)} in selected period`}
          icon={IndianRupee}
          tone="orange"
        />
        <MetricTile
          title="Collected cash"
          value={formatCurrency(analytics.totalPaid)}
          detail={`${analytics.collectionRate}% of billed value collected`}
          icon={WalletCards}
          tone="green"
        />
        <MetricTile
          title="Outstanding"
          value={formatCurrency(analytics.totalPending)}
          detail="Pending and partially paid invoices"
          icon={ReceiptText}
          tone={analytics.totalPending > 0 ? "red" : "neutral"}
        />
        <MetricTile
          title="Appointments"
          value={analytics.stats.appointments ?? 0}
          detail={`${analytics.appointmentsToday.length} appointments visible today`}
          icon={CalendarDays}
          tone="blue"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPanel
          title="Revenue trajectory"
          subtitle="Billed value compared against a lightweight aspirational target."
          action={
            <Badge variant="outline" className="rounded-md">
              {periodOptions.find((option) => option.value === period)?.label} view
            </Badge>
          }
        >
          <div className="h-80 md:h-96">
            {analytics.revenueTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.revenueTrend} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.revenue} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={chartColors.revenue} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="period" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickFormatter={(value) => formatCompact(value)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [formatCurrency(value), name === "target" ? "Target" : "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke={chartColors.revenue} strokeWidth={3} fill="url(#revenueArea)" />
                  <Line type="monotone" dataKey="target" stroke={chartColors.visits} strokeDasharray="6 6" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="No revenue data available." />
            )}
          </div>
        </ChartPanel>

        <ChartPanel title="Invoice health" subtitle="Current billing status distribution.">
          <div className="grid gap-4">
            {analytics.invoiceStatus.length ? (
              <div className="grid items-center gap-4 md:grid-cols-2">
                <div className="flex justify-center">
                  <div
                    className="relative flex h-44 w-44 items-center justify-center rounded-full shadow-inner"
                    style={{
                      background: `conic-gradient(${chartColors.paid} 0 ${percent(analytics.invoiceStatus.find((entry) => entry.name === "Paid")?.value || 0, analytics.invoiceTotal)}%, ${chartColors.pending} ${percent(analytics.invoiceStatus.find((entry) => entry.name === "Paid")?.value || 0, analytics.invoiceTotal)}% ${percent((analytics.invoiceStatus.find((entry) => entry.name === "Paid")?.value || 0) + (analytics.invoiceStatus.find((entry) => entry.name === "Pending")?.value || 0), analytics.invoiceTotal)}%, ${chartColors.overdue} ${percent((analytics.invoiceStatus.find((entry) => entry.name === "Paid")?.value || 0) + (analytics.invoiceStatus.find((entry) => entry.name === "Pending")?.value || 0), analytics.invoiceTotal)}% 100%)`,
                    }}
                  >
                    <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-sm">
                      <span className="text-3xl font-semibold">{analytics.invoiceTotal}</span>
                      <span className="text-xs text-muted-foreground">Invoices</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {analytics.invoiceStatus.map((entry) => (
                    <div key={entry.name} className="rounded-lg border border-border/70 bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                          <span className="text-sm font-medium">{entry.name}</span>
                        </div>
                        <span className="text-sm font-semibold">{percent(entry.value, analytics.invoiceTotal)}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${percent(entry.value, analytics.invoiceTotal)}%`, backgroundColor: entry.fill }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyChart label="No invoice status data available." />
            )}
            <div className="grid grid-cols-3 gap-2">
              {["Paid", "Pending", "Overdue"].map((status) => {
                const entry = analytics.invoiceStatus.find((item) => item.name === status);
                return (
                  <div key={status} className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry?.fill || chartColors.neutral }} />
                    <p className="mt-2 text-xs text-muted-foreground">{status}</p>
                    <p className="text-lg font-semibold">{entry?.value || 0}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </ChartPanel>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPanel title="Patient demand rhythm" subtitle="Visit flow across the selected period.">
          <div className="h-80">
            {analytics.visitTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.visitTrend} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="period" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="visits" fill={chartColors.visits} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart label="No patient visit data available." />
            )}
          </div>
        </ChartPanel>

        <ChartPanel title="Department concentration" subtitle="Where clinical demand is currently clustering.">
          <div className="grid gap-4 md:grid-cols-2 md:items-center">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Leading department</p>
              <p className="mt-3 text-3xl font-semibold">{analytics.topDepartment?.name || "No data"}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {analytics.topDepartment?.value || 0} of {analytics.departmentTotal} recorded cases
              </p>
              <div className="mt-5 space-y-2">
                {analytics.departmentSeries.slice(0, 4).map((entry: any) => (
                  <div key={entry.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-semibold">{percent(Number(entry.value || 0), analytics.departmentTotal)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${percent(Number(entry.value || 0), analytics.departmentTotal)}%`, backgroundColor: entry.fill }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {analytics.departmentSeries.length ? (
                analytics.departmentSeries.map((entry: any) => (
                  <div key={entry.name} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} />
                      <span className="truncate text-sm font-medium">{entry.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{entry.value}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No department records yet.</p>
              )}
            </div>
          </div>
        </ChartPanel>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartPanel title="Operational intelligence" subtitle="Fast signals doctors and admins can act on.">
          <div className="space-y-3">
            <InsightRow
              icon={Gauge}
              title="Revenue pulse"
              detail={`${analytics.revenueMovement.label}. Selected period is ${formatCurrency(analytics.periodRevenue)}.`}
            />
            <InsightRow
              icon={CircleDollarSign}
              title="Collection discipline"
              detail={`${analytics.collectionRate}% collected with ${formatCurrency(analytics.totalPending)} still outstanding.`}
            />
            <InsightRow
              icon={Stethoscope}
              title="Clinical demand"
              detail={`${analytics.topDepartment?.name || "No department"} is the leading department in the current mix.`}
            />
          </div>
        </ChartPanel>

        <ChartPanel title="Financial quality" subtitle="Billing depth and cash clarity.">
          <div className="space-y-3">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Average invoice value</p>
              <p className="mt-2 text-3xl font-semibold">{formatCurrency(analytics.avgInvoice)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <Banknote className="h-5 w-5 text-emerald-700" />
                <p className="mt-3 text-xs text-muted-foreground">Paid</p>
                <p className="text-xl font-semibold">{formatCurrency(analytics.totalPaid)}</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                <Landmark className="h-5 w-5 text-orange-700" />
                <p className="mt-3 text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-semibold">{formatCurrency(analytics.totalPending)}</p>
              </div>
            </div>
          </div>
        </ChartPanel>

        <ChartPanel title={isAdmin ? "Admin console" : "Doctor console"} subtitle="Role-aware operating context.">
          <div className="space-y-3">
            <InsightRow
              icon={Users}
              title="Patients registered"
              detail={`${analytics.stats.totalPatients ?? 0} patient records are available in the system.`}
            />
            <InsightRow
              icon={Activity}
              title="Doctors available"
              detail={`${doctors.length} doctors are configured for clinical operations.`}
            />
            {isAdmin ? (
              <InsightRow icon={Server} title="System status" detail="Backend services are responding and analytics queries completed." />
            ) : (
              <InsightRow icon={ShieldCheck} title="Clinical scope" detail="You are seeing operational analytics available to the doctor role." />
            )}
            <InsightRow icon={Clock3} title="Period selected" detail={`Current analytics window is ${period}.`} />
            <InsightRow icon={CheckCircle2} title="Ready state" detail="No analytics errors detected in this render." />
          </div>
        </ChartPanel>
      </section>
    </motion.div>
  );
};

export default Analytics;
