import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { mockAnalyticsDaily, mockDoctors } from '@/data/mockData';
import { IndianRupee, Users, CalendarDays, Scan, Activity, Server, Clock, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import StatsCard from '@/components/StatsCard';
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

type DoctorFilter = 'all' | (typeof mockDoctors)[number]['id'];

const todayIso = '2026-03-18';
const defaultFrom = '2026-03-01';

const withinRange = (date: string, from: string, to: string) => date >= from && date <= to;

const Analytics: React.FC = () => {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(todayIso);
  const [doctorId, setDoctorId] = useState<DoctorFilter>('all');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    // simulate network refetch
    setLoading(true);
    const t = window.setTimeout(() => setLoading(false), 350);
    return () => window.clearTimeout(t);
  }, [from, to, doctorId]);

  const filtered = useMemo(() => {
    return mockAnalyticsDaily
      .filter((p) => withinRange(p.date, from, to))
      .filter((p) => (doctorId === 'all' ? true : p.doctorId === doctorId));
  }, [from, to, doctorId]);

  const kpis = useMemo(() => {
    const revenue = filtered.reduce((sum, p) => sum + p.revenue, 0);
    const patientVisits = filtered.reduce((sum, p) => sum + p.patientVisits, 0);
    const appointments = filtered.reduce((sum, p) => sum + p.appointments, 0);
    return { revenue, patientVisits, appointments };
  }, [filtered]);

  const revenueSeries = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of filtered) map.set(p.date, (map.get(p.date) || 0) + p.revenue);
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, revenue]) => ({ date: date.slice(5), revenue }));
  }, [filtered]);

  const visitsSeries = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of filtered) map.set(p.date, (map.get(p.date) || 0) + p.patientVisits);
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, visits]) => ({ date: date.slice(5), visits }));
  }, [filtered]);

  const empty = !loading && filtered.length === 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Revenue, visits and operational metrics with filters</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">From</p>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">To</p>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Doctor</p>
            <Select value={doctorId} onValueChange={(v) => setDoctorId(v as DoctorFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="All doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All doctors</SelectItem>
                {mockDoctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <StatsCard title="Revenue" value={`₹${kpis.revenue.toLocaleString()}`} change={`${from} → ${to}`} changeType="neutral" icon={IndianRupee} />
            <StatsCard title="Patient Visits" value={kpis.patientVisits} change="Total visits" changeType="neutral" icon={Users} />
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
                No data for the selected filters
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
                No data for the selected filters
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
                  <p className="text-xs text-muted-foreground">Server Uptime</p>
                  <p className="text-lg font-bold">99.998%</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-info/5 border-info/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Response Time</p>
                  <p className="text-lg font-bold">42ms</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-warning/5 border-warning/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">API Throughput</p>
                  <p className="text-lg font-bold">85 req/min</p>
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

