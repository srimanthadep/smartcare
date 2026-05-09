import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { IndianRupee, Users, CalendarDays, Activity, Server, Clock, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import StatsCard from '@/components/StatsCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from 'recharts';

const Analytics: React.FC = () => {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
    .toISOString()
    .slice(0, 10);

  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(todayIso);
  const [period, setPeriod] = useState('monthly');
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    document.title = 'Analytics | Siara Dental';
  }, []);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => api.getDashboard(period),
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: api.getInvoices,
  });

  const { data: bootstrapData } = useQuery({
    queryKey: ['bootstrap'],
    queryFn: api.getBootstrap,
  });

  const loading = isLoading || invoicesLoading;

  // KPIs from real data
  const kpis = useMemo(() => {
    const revenue = dashboardData?.stats.revenue ?? 0;
    const patientVisits = dashboardData?.stats.dailyPatients ?? 0;
    const appointments = dashboardData?.stats.appointments ?? 0;
    return { revenue, patientVisits, appointments };
  }, [dashboardData]);

  // Revenue trend from real API
  const revenueSeries = useMemo(() => {
    return (dashboardData?.revenueTrend ?? []).map((p) => ({
      date: p.month,
      revenue: p.revenue,
    }));
  }, [dashboardData]);

  // Patient visits from real API
  const visitsSeries = useMemo(() => {
    return (dashboardData?.patientVisits ?? []).map((p) => ({
      date: p.day,
      visits: p.visits,
    }));
  }, [dashboardData]);

  // Doctors list from bootstrap
  const doctors = bootstrapData?.doctors ?? [];

  const empty = !loading && revenueSeries.length === 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Revenue, visits and operational metrics</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <>
            <Skeleton className="h-[104px] rounded-lg" />
            <Skeleton className="h-[104px] rounded-lg" />
            <Skeleton className="h-[104px] rounded-lg" />
          </>
        ) : (
          <>
            <StatsCard title="Revenue" value={`₹${kpis.revenue.toLocaleString()}`} change={`${period} period`} changeType="neutral" icon={IndianRupee} />
            <StatsCard title="Patient Visits" value={kpis.patientVisits} change="Active patients today" changeType="neutral" icon={Users} />
            <StatsCard title="Appointments" value={kpis.appointments} change="Scheduled + completed" changeType="neutral" icon={CalendarDays} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full rounded-md" />
            ) : empty ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                No revenue data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={revenueSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Patient Visits</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full rounded-md" />
            ) : empty ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                No visit data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={visitsSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="visits" name="Visits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-6 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-heading font-bold">System Performance</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-success/5 border-success/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                  <Server className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Server Status</p>
                  <p className="text-lg font-bold text-success">Online</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-info/5 border-info/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Doctors</p>
                  <p className="text-lg font-bold">{doctors.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-warning/5 border-warning/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Invoices</p>
                  <p className="text-lg font-bold">{invoicesData?.length ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Analytics;
