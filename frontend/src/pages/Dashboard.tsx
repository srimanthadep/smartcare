import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
import { CalendarDays, CalendarPlus, FileText, Scan, UserPlus, Users, CalendarClock, TrendingUp, Banknote, Receipt, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function calcRevenueChange(revenueTrend: { month: string; revenue: number }[]): string {
  if (!revenueTrend || revenueTrend.length < 2) return "No comparison data";
  const last = revenueTrend[revenueTrend.length - 1].revenue;
  const prev = revenueTrend[revenueTrend.length - 2].revenue;
  if (prev === 0) return "New this month";
  const pct = Math.round(((last - prev) / prev) * 100);
  return pct >= 0 ? `+${pct}% from last period` : `${pct}% from last period`;
}

function calcRevenueChangeType(revenueTrend: { month: string; revenue: number }[]): "positive" | "negative" | "neutral" {
  if (!revenueTrend || revenueTrend.length < 2) return "neutral";
  const last = revenueTrend[revenueTrend.length - 1].revenue;
  const prev = revenueTrend[revenueTrend.length - 2].revenue;
  if (last > prev) return "positive";
  if (last < prev) return "negative";
  return "neutral";
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = React.useState("monthly");
  const [backupLoading, setBackupLoading] = React.useState(false);

  React.useEffect(() => {
    document.title = "Dashboard | Siara Dental";
  }, []);

  const handleBackup = async () => {
    if (!window.confirm('Start a full database backup? This may take a moment.')) {
      return;
    }

    setBackupLoading(true);
    const toastId = (await import('sonner')).toast.loading("Creating Backup...");

    try {
      const token = localStorage.getItem("smartcare_token");
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"}/api/backup/download`, {
        method: 'POST',
        headers
      });

      if (!res.ok) {
        if (res.status === 429) throw new Error('A backup is already in progress. Please wait.');
        throw new Error('Backup failed. Please try again.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;

      const disposition = res.headers.get('content-disposition');
      const match = disposition?.match(/filename[^;=\n]*=['"]?([^'"\n;]*)/);
      const filename = match?.[1] || 'siara_dental_backup.zip';

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
      (await import('sonner')).toast.success('Backup downloaded successfully!', { id: toastId });

    } catch (err: any) {
      const message = err.message || 'Backup failed. Please try again.';
      (await import('sonner')).toast.error(message, { id: toastId });
      console.error('Backup error:', err);
    } finally {
      setBackupLoading(false);
    }
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard", period],
    queryFn: () => api.getDashboard(period),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="py-4 text-sm text-destructive">
          Failed to load dashboard data: {error instanceof Error ? error.message : "Unknown error"}
        </CardContent>
      </Card>
    );
  }

  const revenueChangeText = calcRevenueChange(data.revenueTrend);
  const revenueChangeType = calcRevenueChangeType(data.revenueTrend);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-3 md:space-y-6">
      <motion.div variants={item}>
        <h1 className="text-lg font-heading font-bold md:text-2xl">Good {getGreeting()}, {user?.name?.replace("Dr. ", "")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening at your clinic today.</p>
      </motion.div>

      <motion.div variants={item} className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => navigate("/patients/new")}>
          <UserPlus className="mr-1 h-4 w-4" /> New Patient
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate("/appointments")}>
          <CalendarPlus className="mr-1 h-4 w-4" /> Book Appointment
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate("/prescriptions")}>
          <FileText className="mr-1 h-4 w-4" /> Create Prescription
        </Button>
        <Button
          size="sm"
          onClick={handleBackup}
          disabled={backupLoading}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          <Download className="mr-1 h-4 w-4" />
          {backupLoading ? 'Creating Backup...' : 'Download Backup'}
        </Button>
        <div className="ml-auto">
          <Tabs value={period} onValueChange={setPeriod} className="w-full">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="daily" className="text-xs px-3">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs px-3">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs px-3">Monthly</TabsTrigger>
              <TabsTrigger value="yearly" className="text-xs px-3">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </motion.div>
      <motion.div variants={item} className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
        <StatsCard title="Total Patients" value={data.stats.totalPatients} change="Lifetime" changeType="neutral" icon={Users} />
        <StatsCard title="Total Revenue" value={`₹${data.stats.totalRevenue.toLocaleString()}`} change="Gross Billing" changeType="neutral" icon={Banknote} />
        <StatsCard title="Total Paid" value={`₹${data.stats.totalPaid.toLocaleString()}`} change="Collected Cash" changeType="positive" icon={TrendingUp} />
        <StatsCard title="Total Pending" value={`₹${data.stats.totalPending.toLocaleString()}`} change="Outstanding" changeType="negative" icon={CalendarClock} />
        <StatsCard title="Total Expenses" value={`₹${data.stats.totalExpenses.toLocaleString()}`} change="Outflow" changeType="negative" icon={Receipt} />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 md:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} />
                  <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Specializations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 md:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.departmentBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                    {data.departmentBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Weekly Patient Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 md:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.patientVisits}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-3">
            {data.appointmentsToday.length === 0 ? (
              <div className="rounded-lg bg-secondary/30 p-4 text-sm text-muted-foreground">No appointments scheduled for today.</div>
            ) : (
              <div className="flex gap-3 overflow-x-auto md:block md:space-y-3">
                {data.appointmentsToday.map((appointment) => (
                  <div key={appointment.id} className="min-w-[240px] rounded-lg bg-secondary/40 p-3 md:min-w-0 md:flex md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium">{appointment.patientName}</p>
                      <p className="text-xs text-muted-foreground">{appointment.time} · {appointment.reason || "Consultation"}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2 md:mt-0">
                      <StatusBadge status={appointment.type} />
                      <StatusBadge status={appointment.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
