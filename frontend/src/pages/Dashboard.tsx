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
import { CalendarDays, CalendarPlus, FileText, Scan, IndianRupee, UserPlus, Users, CalendarClock, TrendingUp } from "lucide-react";
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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = React.useState("monthly");
  
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

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-heading font-bold">Good morning, {user?.name?.replace("Dr. ", "")}</h1>
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
      <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Today's Patients" value={data.stats.dailyPatients} change="Live from appointments" changeType="neutral" icon={Users} />
        <StatsCard title="Revenue" value={`Rs ${data.stats.revenue.toLocaleString()}`} change="+12% from last month" changeType="positive" icon={IndianRupee} />
        <StatsCard title="Profit" value={`Rs ${data.stats.profit?.toLocaleString() || "0"}`} change="Estimated 80% margin" changeType="positive" icon={TrendingUp} />
        <StatsCard title="Pending Recalls" value="12" change="Due this week" changeType="negative" icon={CalendarClock} />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(value) => `Rs ${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value: number) => [`Rs ${value.toLocaleString()}`, "Revenue"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Specializations</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
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
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Weekly Patient Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.patientVisits}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.appointmentsToday.length === 0 ? (
              <div className="rounded-lg bg-secondary/30 p-4 text-sm text-muted-foreground">No appointments scheduled for today.</div>
            ) : (
              data.appointmentsToday.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between rounded-lg bg-secondary/40 p-3">
                  <div>
                    <p className="text-sm font-medium">{appointment.patientName}</p>
                    <p className="text-xs text-muted-foreground">{appointment.time} · {appointment.reason || "Consultation"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={appointment.type} />
                    <StatusBadge status={appointment.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
