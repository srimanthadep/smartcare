import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Database, Server, Cpu, HardDrive, RefreshCcw, Cloud, Users, FileText, Calendar, Receipt, ClipboardList, Info, Link as LinkIcon, Radio } from 'lucide-react';
import { adminApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Progress } from '@/shared/ui/progress';

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`;
  return `${(b / 1073741824).toFixed(2)} GB`;
};

const SystemHealth: React.FC = () => {
  React.useEffect(() => { document.title = 'System Health | Admin'; }, []);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-health'],
    queryFn: adminApi.getHealth,
    refetchInterval: 10000,
  });

  const getStatusColor = (status: string) => {
    return status?.toLowerCase() === 'healthy' 
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25' 
      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75 bg-clip-text text-transparent">System Health</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time status monitoring (auto-refreshes every 10s)</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${getStatusColor(data.status)}`}>
              <span className={`h-2 w-2 rounded-full ${data.status === 'healthy' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {data.status.toUpperCase()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-9 shadow-xs">
            <RefreshCcw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
      ) : data ? (
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Supabase Service Card */}
          <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-card/60 overflow-hidden flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3 border-b border-border/30 bg-muted/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Database className="h-5 w-5 text-emerald-500" />
                    Supabase Database
                  </CardTitle>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${getStatusColor(data.supabase?.status || data.database.status)}`}>
                    {(data.supabase?.status || data.database.status).toUpperCase()}
                  </span>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">Managed Serverless PostgreSQL Instance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background/40 border border-border/20 rounded-xl p-3 flex flex-col justify-center">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Database Size</span>
                    <span className="text-lg font-bold text-foreground mt-0.5">{data.supabase?.databaseSize || 'N/A'}</span>
                  </div>
                  <div className="bg-background/40 border border-border/20 rounded-xl p-3 flex flex-col justify-center">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Active Conns</span>
                    <span className="text-lg font-bold text-foreground mt-0.5">{data.supabase?.activeConnections || 0}</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 pt-1">
                    <Radio className="h-3 w-3 text-primary/75" />
                    Table Usage Stats
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-background/25 border border-border/25 rounded-xl p-3.5">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                      <div className="text-xs">
                        <p className="font-semibold text-foreground">{data.supabase?.tables.patients || 0}</p>
                        <p className="text-[10px] text-muted-foreground">Patients</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Receipt className="h-3.5 w-3.5 text-blue-500/70 shrink-0" />
                      <div className="text-xs">
                        <p className="font-semibold text-foreground">{data.supabase?.tables.invoices || 0}</p>
                        <p className="text-[10px] text-muted-foreground">Invoices</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-purple-500/70 shrink-0" />
                      <div className="text-xs">
                        <p className="font-semibold text-foreground">{data.supabase?.tables.appointments || 0}</p>
                        <p className="text-[10px] text-muted-foreground">Appts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1.5 sm:pt-0">
                      <FileText className="h-3.5 w-3.5 text-emerald-500/70 shrink-0" />
                      <div className="text-xs">
                        <p className="font-semibold text-foreground">{data.supabase?.tables.prescriptions || 0}</p>
                        <p className="text-[10px] text-muted-foreground">Rx Files</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1.5">
                      <ClipboardList className="h-3.5 w-3.5 text-amber-500/70 shrink-0" />
                      <div className="text-xs">
                        <p className="font-semibold text-foreground">{data.supabase?.tables.auditLogs || 0}</p>
                        <p className="text-[10px] text-muted-foreground">Audit Logs</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>
            <div className="px-6 py-3.5 border-t border-border/30 bg-muted/5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Ping Latency</span>
              <span className="font-mono font-semibold text-foreground">{data.database.responseTimeMs}ms</span>
            </div>
          </Card>

          {/* Render Cloud Platform Card */}
          <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-card/60 overflow-hidden flex flex-col justify-between">
            <div>
              <CardHeader className="pb-3 border-b border-border/30 bg-muted/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-sky-500" />
                    Render Web Service
                  </CardTitle>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25">
                    ONLINE
                  </span>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">Render Cloud Hosting Platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    <span>App Container RAM Usage</span>
                    <span className="text-foreground">{data.render?.memoryUsagePercent || 0}%</span>
                  </div>
                  <Progress value={parseFloat(data.render?.memoryUsagePercent || '0')} className="h-2 bg-muted/70" />
                  <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>Used: {formatBytes(data.render?.memoryUsageBytes || data.process.memory.rss)}</span>
                    <span>Limit: {formatBytes(data.render?.memoryLimitBytes || 536870912)}</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Info className="h-3.5 w-3.5 text-primary/75" />Region</span>
                    <span className="font-semibold text-foreground/90">{data.render?.region || 'Singapore (sgp)'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-primary/75" />Service ID</span>
                    <span className="font-mono text-xs text-foreground/80">{data.render?.serviceId || 'srv-ck9c0d12e3f4'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5"><LinkIcon className="h-3.5 w-3.5 text-primary/75" />Deployment</span>
                    <a 
                      href={data.render?.externalUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
                    >
                      {data.render?.serviceName || 'smartcare-backend'}
                    </a>
                  </div>
                </div>
              </CardContent>
            </div>
            <div className="px-6 py-3.5 border-t border-border/30 bg-muted/5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Instance ID</span>
              <span className="font-mono text-[10px] text-foreground/70 truncate max-w-[200px]">{data.render?.instanceId || 'srv-ck9c...'}</span>
            </div>
          </Card>

          {/* Process Card */}
          <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-card/60">
            <CardHeader className="pb-3 border-b border-border/30 bg-muted/10">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="h-4.5 w-4.5 text-primary" />
                Node.js Engine Process
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Uptime</span><span className="font-semibold text-foreground">{data.process.uptimeFormatted}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Node Version</span><span className="font-semibold text-foreground">{data.process.nodeVersion}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Heap Used</span><span className="font-mono text-xs">{formatBytes(data.process.memory.heapUsed)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Heap Total</span><span className="font-mono text-xs">{formatBytes(data.process.memory.heapTotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Process ID (PID)</span><span className="font-mono text-xs text-foreground/80">{data.process.pid || 'N/A'}</span></div>
            </CardContent>
          </Card>

          {/* Host CPU & OS Card */}
          <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-card/60">
            <CardHeader className="pb-3 border-b border-border/30 bg-muted/10">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="h-4.5 w-4.5 text-primary" />
                Host Hardware & OS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Platform</span><span className="font-semibold text-foreground capitalize">{data.system.platform} ({data.system.arch})</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">CPU Cores</span><span className="font-semibold text-foreground">{data.system.cpu.cores} Cores</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Load Average (1m/5m/15m)</span><span className="font-mono text-xs">{data.system.loadAverage['1m']} / {data.system.loadAverage['5m']} / {data.system.loadAverage['15m']}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">System RAM Usage</span><span className="font-semibold text-foreground">{data.system.memory.usagePercent}%</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">System Uptime</span><span className="font-semibold text-foreground">{Math.floor(data.system.uptime / 3600)} Hours</span></div>
            </CardContent>
          </Card>

        </div>
      ) : null}
    </motion.div>
  );
};

export default SystemHealth;
