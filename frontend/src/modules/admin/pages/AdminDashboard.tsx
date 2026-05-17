import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Receipt, CalendarDays, Shield, Bell, Database, Activity, Trash2 } from 'lucide-react';
import { adminApi } from '../api';
import StatsCard from '@/shared/components/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: adminApi.getDashboard, refetchInterval: 60000 });

  React.useEffect(() => { document.title = 'Admin Dashboard | Siara Dental'; }, []);

  if (isLoading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-[132px] rounded-xl" />)}</div>
    </div>
  );

  const d = data;
  const deletedTotal = d ? Object.values(d.deletedItems).reduce((a, b) => a + b, 0) : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">System overview and quick stats</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Total Users" value={d?.users.total || 0} change={`${d?.users.activeToday || 0} active today`} changeType="positive" icon={Users} />
        <StatsCard title="Total Patients" value={d?.patients?.toLocaleString() || '0'} icon={Users} />
        <StatsCard title="Revenue" value={`₹${(d?.invoices.revenue || 0).toLocaleString()}`} change={`₹${(d?.invoices.pending || 0).toLocaleString()} pending`} changeType="warning" icon={Receipt} />
        <StatsCard title="Today's Appointments" value={d?.appointmentsToday || 0} icon={CalendarDays} />
        <StatsCard title="Active Sessions" value={d?.activeSessions || 0} icon={Shield} />
        <StatsCard title="Unread Notifications" value={d?.unreadNotifications || 0} changeType={d?.unreadNotifications ? 'negative' : 'neutral'} icon={Bell} />
        <StatsCard title="Audit Entries" value={d?.auditLogsTotal?.toLocaleString() || '0'} icon={Activity} />
        <StatsCard title="Deleted Items" value={deletedTotal} change="In recycle bin" changeType="neutral" icon={Trash2} />
      </div>

      {/* Deleted items breakdown */}
      {d?.deletedItems && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recovery Center Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {Object.entries(d.deletedItems).map(([key, val]) => (
                <button key={key} onClick={() => navigate('/admin/delete-history')}
                  className="rounded-xl border border-border/50 bg-card p-3 text-center hover:border-primary/30 transition-colors cursor-pointer">
                  <p className="text-lg font-bold">{val}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground capitalize">{key}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          <button onClick={() => navigate('/admin/audit-logs')} className="text-xs text-primary hover:underline">View All</button>
        </CardHeader>
        <CardContent>
          {d?.recentActivity && d.recentActivity.length > 0 ? (
            <div className="space-y-2">
              {d.recentActivity.slice(0, 8).map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-lg border border-border/30 p-3 hover:bg-muted/30 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.actorName || 'System'} <span className="text-muted-foreground font-normal">— {log.action?.replace(/_/g, ' ').toLowerCase()}</span></p>
                    <p className="text-[11px] text-muted-foreground">{log.entityType && `${log.entityType}${log.entityId ? ` #${log.entityId}` : ''}`}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{log.createdAt ? format(new Date(log.createdAt), 'MMM d, HH:mm') : ''}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminDashboard;
