import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, Database, Server, Cpu, HardDrive, RefreshCcw } from 'lucide-react';
import { adminApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">System Health</h1>
          <p className="text-sm text-muted-foreground">Real-time system monitoring (auto-refreshes every 10s)</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${data.status === 'healthy' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
              <span className={`h-2 w-2 rounded-full ${data.status === 'healthy' ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
              {data.status.toUpperCase()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : data ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Database */}
          <Card className="border-border/50">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><Database className="h-4 w-4 text-primary" />Database</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><span className={data.database.status === 'healthy' ? 'text-success font-medium' : 'text-destructive font-medium'}>{data.database.status}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Response Time</span><span>{data.database.responseTimeMs}ms</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Connections</span><span>{data.database.pool.totalConnections}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Idle Connections</span><span>{data.database.pool.idleConnections}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Waiting Clients</span><span>{data.database.pool.waitingClients}</span></div>
            </CardContent>
          </Card>

          {/* System Memory */}
          <Card className="border-border/50">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><HardDrive className="h-4 w-4 text-primary" />System Memory</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground"><span>Usage</span><span>{data.system.memory.usagePercent}%</span></div>
                <Progress value={parseFloat(data.system.memory.usagePercent)} className="h-2" />
              </div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span>{formatBytes(data.system.memory.total)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Used</span><span>{formatBytes(data.system.memory.used)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Free</span><span>{formatBytes(data.system.memory.free)}</span></div>
            </CardContent>
          </Card>

          {/* Process */}
          <Card className="border-border/50">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><Server className="h-4 w-4 text-primary" />Process</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Uptime</span><span className="font-medium">{data.process.uptimeFormatted}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Node.js</span><span>{data.process.nodeVersion}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Heap Used</span><span>{formatBytes(data.process.memory.heapUsed)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Heap Total</span><span>{formatBytes(data.process.memory.heapTotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">RSS</span><span>{formatBytes(data.process.memory.rss)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">PID</span><span className="font-mono">{data.process.pid || 'N/A'}</span></div>
            </CardContent>
          </Card>

          {/* CPU / OS */}
          <Card className="border-border/50">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" />CPU & OS</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Platform</span><span>{data.system.platform}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">CPU Cores</span><span>{data.system.cpu.cores}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">CPU Model</span><span className="text-xs truncate max-w-[200px]">{data.system.cpu.model}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Load Avg (1m)</span><span>{data.system.loadAverage['1m']}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Load Avg (5m)</span><span>{data.system.loadAverage['5m']}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">System Uptime</span><span>{Math.floor(data.system.uptime / 3600)}h</span></div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </motion.div>
  );
};

export default SystemHealth;
