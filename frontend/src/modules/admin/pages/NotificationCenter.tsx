import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, Check, CheckCheck, AlertTriangle, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { adminApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';

const severityConfig: Record<string, { icon: React.ComponentType<any>; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  error: { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
};

const NotificationCenter: React.FC = () => {
  const qc = useQueryClient();
  React.useEffect(() => { document.title = 'Notifications | Admin'; }, []);

  const { data, isLoading } = useQuery({ queryKey: ['admin-notifications'], queryFn: () => adminApi.getNotifications({ limit: 50 }) });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => adminApi.markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => adminApi.markAllNotificationsRead(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-notifications'] }); toast.success('All marked as read'); },
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">{data?.unreadCount || 0} unread</p>
        </div>
        {(data?.unreadCount || 0) > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()} className="gap-2">
            <CheckCheck className="h-4 w-4" />Mark All Read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !data?.notifications?.length ? (
        <Card className="border-border/50"><CardContent className="py-12 text-center text-muted-foreground"><Bell className="mx-auto h-12 w-12 opacity-20 mb-3" /><p>No notifications</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data.notifications.map(n => {
            const sev = severityConfig[n.severity] || severityConfig.info;
            const SevIcon = sev.icon;
            return (
              <div key={n.id} className={`flex items-start gap-3 rounded-xl border p-4 transition-all ${n.isRead ? 'border-border/40 bg-card' : `${sev.bg}`}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${n.isRead ? 'bg-muted' : `bg-white/80`}`}>
                  <SevIcon className={`h-4 w-4 ${sev.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-medium ${!n.isRead ? 'font-semibold' : ''}`}>{n.title}</p>
                      {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
                    </div>
                    {!n.isRead && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => markReadMutation.mutate(n.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span className="capitalize">{n.type}</span>
                    <span>{format(new Date(n.createdAt), 'MMM d, HH:mm')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default NotificationCenter;
