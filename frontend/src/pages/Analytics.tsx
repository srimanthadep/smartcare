import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CalendarDays,
  Clock,
  IndianRupee,
  Server,
  Users,
  Zap,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

import StatsCard from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const Analytics: React.FC = () => {
  const [period, setPeriod] = useState("monthly");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    document.title = "Analytics · Siara Dental";
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

  const kpis = useMemo(
    () => ({
      revenue: dashboard?.stats?.revenue ?? 0,
      patientVisits: dashboard?.stats?.dailyPatients ?? 0,
      appointments: dashboard?.stats?.appointments ?? 0,
      estimatedNet: dashboard?.stats?.estimatedNet ?? 0,
    }),
    [dashboard]
  );

  const revenueSeries = useMemo(
    () =>
      (dashboard?.revenueTrend ?? []).map((item: any) => ({
        date: item.month,
        revenue: item.revenue,
      })),
    [dashboard]
  );

  const visitSeries = useMemo(
    () =>
      (dashboard?.patientVisits ?? []).map((item: any) => ({
        date: item.day,
        visits: item.visits,
      })),
    [dashboard]
  );

  const departmentSeries = useMemo(
    () => dashboard?.departmentBreakdown ?? [],
    [dashboard]
  );

  const avgInvoice = useMemo(() => {
    if (!invoices.length) return 0;
    const total = invoices.reduce((sum: number, item: any) => sum + Number(item.total || 0), 0);
    return Math.round(total / invoices.length);
  }, [invoices]);

  if (loading) {
    return (
      <div className="luxury-page space-y-5">
        <Skeleton className="h-14 w-72 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[124px] rounded-[28px]" />
          ))}
        </div>
        <Skeleton className="h-[360px] rounded-[28px]" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="luxury-page">
        <Card className="luxury-card border-destructive/30 bg-destructive/5">
          <CardContent className="py-6 text-sm text-destructive">
            Failed to load analytics.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="luxury-page space-y-5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <section className="luxury-panel p-3 md:p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="luxury-subtitle mb-2">Performance intelligence</p>
            <h1 className="luxury-title text-lg font-semibold md:text-4xl sm:text-5xl">
              Revenue, visits and operational trend lines
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Monitor billed performance, chair utilization, department activity and workload rhythm across the selected period.
            </p>
          </div>

          <div className="w-full max-w-[180px] hidden md:block">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto md:hidden">
          {["daily", "weekly", "monthly", "yearly"].map((value) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${period === value ? "border-primary text-primary" : "border-border/50"}`}
            >
              {value}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Revenue"
          value={Number(kpis.revenue).toLocaleString()}
          change={`${period} view`}
          changeType="neutral"
          icon={IndianRupee}
        />
        <StatsCard
          title="Patient Visits"
          value={String(kpis.patientVisits)}
          change="Active patients today"
          changeType="neutral"
          icon={Users}
        />
        <StatsCard
          title="Appointments"
          value={String(kpis.appointments)}
          change="Scheduled and completed"
          changeType="neutral"
          icon={CalendarDays}
        />
        <StatsCard
          title="Est. Net 80%"
          value={Number(kpis.estimatedNet).toLocaleString()}
          change="Projected margin"
          changeType="positive"
          icon={Activity}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="luxury-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">Revenue trend</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueSeries.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center rounded-[24px] bg-secondary/15 text-sm text-muted-foreground">
                No revenue data available.
              </div>
            ) : (
               <ResponsiveContainer width="100%" height={208}>
                <LineChart data={revenueSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString(), "Revenue"]}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid hsl(var(--border))",
                      background: "rgba(255,255,255,0.96)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="luxury-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">Patient visits</CardTitle>
          </CardHeader>
          <CardContent>
            {visitSeries.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center rounded-[24px] bg-secondary/15 text-sm text-muted-foreground">
                No visit data available.
              </div>
            ) : (
               <ResponsiveContainer width="100%" height={208}>
                <BarChart data={visitSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid hsl(var(--border))",
                      background: "rgba(255,255,255,0.96)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="luxury-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">Department mix</CardTitle>
          </CardHeader>
          <CardContent>
            {departmentSeries.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center rounded-[24px] bg-secondary/15 text-sm text-muted-foreground">
                No department data available.
              </div>
            ) : (
               <ResponsiveContainer width="100%" height={208}>
                <PieChart>
                  <Pie
                    data={departmentSeries}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={102}
                    paddingAngle={3}
                  >
                    {departmentSeries.map((entry: any) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid hsl(var(--border))",
                      background: "rgba(255,255,255,0.96)",
                    }}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="luxury-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">Operational notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] border border-border/60 bg-secondary/15 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Total invoices
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{invoices.length}</p>
            </div>

            <div className="rounded-[24px] border border-border/60 bg-secondary/15 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Average invoice value
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                ₹{avgInvoice.toLocaleString()}
              </p>
            </div>

            <div className="rounded-[24px] border border-border/60 bg-secondary/15 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Doctors available
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{doctors.length}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {isAdmin ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="luxury-card bg-success/5">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-success/10 text-success">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Server status</p>
                <p className="text-lg font-semibold text-foreground">Online</p>
              </div>
            </CardContent>
          </Card>

          <Card className="luxury-card bg-info/5">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-info/10 text-info">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Selected period</p>
                <p className="text-lg font-semibold capitalize text-foreground">{period}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="luxury-card bg-warning/5">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-warning/10 text-warning">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Admin insight</p>
                <p className="text-lg font-semibold text-foreground">Live monitoring</p>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </motion.div>
  );
};

export default Analytics;
