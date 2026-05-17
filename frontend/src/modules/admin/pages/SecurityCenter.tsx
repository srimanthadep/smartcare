import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Monitor, Globe, RefreshCcw } from 'lucide-react';
import { adminApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import StatsCard from '@/shared/components/StatsCard';
import { Badge } from '@/shared/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SecurityCenter: React.FC = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState('overview');

  React.useEffect(() => { document.title = 'Security Center | Admin'; }, []);

  const { data: overview, isLoading: loadingOverview } = useQuery({ queryKey: ['admin-security-overview'], queryFn: adminApi.getSecurityOverview });
  const { data: sessions, isLoading: loadingSessions } = useQuery({ queryKey: ['admin-sessions'], queryFn: adminApi.getActiveSessions, enabled: tab === 'sessions' });
  const { data: failedLogins, isLoading: loadingFailed } = useQuery({ queryKey: ['admin-failed-logins'], queryFn: () => adminApi.getFailedLogins({ limit: 30 }), enabled: tab === 'failed' });
  const { data: loginHistory, isLoading: loadingHistory } = useQuery({ queryKey: ['admin-login-history'], queryFn: () => adminApi.getLoginHistory({ limit: 30 }), enabled: tab === 'history' });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => adminApi.revokeSession(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-sessions'] }); toast.success('Session revoked'); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Security Center</h1>
        <p className="text-sm text-muted-foreground">Monitor login attempts, sessions, and security threats</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="sessions">Sessions</TabsTrigger><TabsTrigger value="failed">Failed Logins</TabsTrigger><TabsTrigger value="history">Login History</TabsTrigger></TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          {loadingOverview ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[132px]" />)}</div> : overview && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard title="Failed Logins (24h)" value={overview.failedLoginsToday} icon={AlertTriangle} changeType={overview.failedLoginsToday > 0 ? 'negative' : 'positive'} />
                <StatsCard title="Failed Logins (7d)" value={overview.failedLoginsWeek} icon={Shield} changeType="neutral" />
                <StatsCard title="Active Sessions" value={overview.activeSessions} icon={Monitor} changeType="positive" />
                <StatsCard title="Suspicious IPs" value={overview.suspiciousIPs.length} icon={Globe} changeType={overview.suspiciousIPs.length > 0 ? 'negative' : 'positive'} />
              </div>
              {overview.suspiciousIPs.length > 0 && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Suspicious IPs (last 24h)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {overview.suspiciousIPs.map(ip => (
                        <div key={ip.ip} className="flex items-center justify-between rounded-lg border border-destructive/20 p-2.5">
                          <span className="text-sm font-mono">{ip.ip}</span>
                          <Badge variant="destructive" className="text-xs">{ip.attempts} attempts</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              {loadingSessions ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div> : !sessions?.sessions?.length ? (
                <p className="text-center text-muted-foreground py-8">No active sessions</p>
              ) : (
                <div className="space-y-2">
                  {sessions.sessions.map(s => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                      <div>
                        <p className="text-sm font-medium">{s.userName} <span className="text-xs text-muted-foreground capitalize">({s.role})</span></p>
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          <span>{s.deviceInfo?.browser} · {s.deviceInfo?.platform}</span>
                          <span>{s.ipAddress}</span>
                          <span>Active: {s.lastActiveAt ? format(new Date(s.lastActiveAt), 'HH:mm') : 'N/A'}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => revokeMutation.mutate(s.id)} className="text-xs text-destructive">Revoke</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="failed" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              {loadingFailed ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : !failedLogins?.logs?.length ? (
                <p className="text-center text-muted-foreground py-8">No failed login attempts</p>
              ) : (
                <div className="space-y-2">
                  {failedLogins.logs.map(l => (
                    <div key={l.id} className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-2.5">
                      <div>
                        <p className="text-sm font-medium">{l.username}</p>
                        <div className="flex gap-3 text-[10px] text-muted-foreground"><span>{l.ipAddress}</span><span>{l.failureReason}</span></div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(l.createdAt), 'MMM d, HH:mm')}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              {loadingHistory ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> : !loginHistory?.logs?.length ? (
                <p className="text-center text-muted-foreground py-8">No login history</p>
              ) : (
                <div className="space-y-2">
                  {loginHistory.logs.map(l => (
                    <div key={l.id} className="flex items-center justify-between rounded-lg border border-border/30 p-2.5">
                      <div className="flex items-center gap-3">
                        <span className={`h-2 w-2 rounded-full ${l.success ? 'bg-success' : 'bg-destructive'}`} />
                        <div>
                          <p className="text-sm font-medium">{l.username}</p>
                          <div className="flex gap-3 text-[10px] text-muted-foreground"><span>{l.ipAddress}</span><span>{l.deviceInfo?.browser} · {l.deviceInfo?.platform}</span></div>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(l.createdAt), 'MMM d, HH:mm')}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default SecurityCenter;
