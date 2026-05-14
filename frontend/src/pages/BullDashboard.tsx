import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, RefreshCcw, Pause, Play, Trash2, RotateCcw,
  CheckCircle2, XCircle, Clock, Loader2, Timer, Zap,
  Server, Wifi, WifiOff, ChevronDown, ChevronUp, CalendarClock
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Queue status color mapping
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  waiting: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  active: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  completed: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-500 border-red-500/30",
  delayed: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  paused: "bg-slate-500/15 text-slate-500 border-slate-500/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  waiting: <Clock className="h-3.5 w-3.5" />,
  active: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5" />,
  failed: <XCircle className="h-3.5 w-3.5" />,
  delayed: <Timer className="h-3.5 w-3.5" />,
  paused: <Pause className="h-3.5 w-3.5" />,
};

// ─────────────────────────────────────────────────────────────────────────────
// Stat Pill component
// ─────────────────────────────────────────────────────────────────────────────
const StatPill = ({ label, value, status }: { label: string; value: number; status: string }) => {
  if (value === 0 && !["completed", "failed"].includes(status)) return null;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${STATUS_COLORS[status]}`}>
      {STATUS_ICONS[status]}
      <span>{value.toLocaleString()}</span>
      <span className="opacity-70 font-normal">{label}</span>
    </div>
  );
};

import { QueueData, QueueJob, RepeatableJob } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Queue Card component
// ─────────────────────────────────────────────────────────────────────────────
const QueueCard = ({ queue, onAction }: { queue: QueueData; onAction: (action: string, name: string) => void }) => {
  const [expanded, setExpanded] = useState(false);
  const total = queue.counts.completed + queue.counts.failed;
  const successRate = total > 0 ? Math.round((queue.counts.completed / total) * 100) : 100;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-border/50 overflow-hidden hover:border-border/80 transition-colors">
        {/* Thin status bar */}
        <div className={`h-1 ${queue.isPaused ? 'bg-slate-400' : queue.counts.failed > 0 ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`} />

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{queue.icon}</div>
              <div>
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  {queue.label}
                  {queue.isPaused && (
                    <Badge variant="outline" className="text-[10px] bg-slate-500/10 text-slate-500 border-slate-500/30">
                      PAUSED
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{queue.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Success rate indicator */}
              <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                successRate >= 95 ? 'bg-emerald-500/15 text-emerald-500' :
                successRate >= 80 ? 'bg-amber-500/15 text-amber-500' :
                'bg-red-500/15 text-red-500'
              }`}>
                {successRate}%
              </div>
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats pills */}
          <div className="flex flex-wrap gap-2">
            <StatPill label="waiting" value={queue.counts.waiting} status="waiting" />
            <StatPill label="active" value={queue.counts.active} status="active" />
            <StatPill label="completed" value={queue.counts.completed} status="completed" />
            <StatPill label="failed" value={queue.counts.failed} status="failed" />
            <StatPill label="delayed" value={queue.counts.delayed} status="delayed" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {queue.isPaused ? (
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => onAction('resume', queue.name)}>
                <Play className="h-3 w-3 mr-1" /> Resume
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => onAction('pause', queue.name)}>
                <Pause className="h-3 w-3 mr-1" /> Pause
              </Button>
            )}
            {queue.counts.failed > 0 && (
              <Button variant="outline" size="sm" className="text-xs h-7 text-amber-500 border-amber-500/30 hover:bg-amber-500/10" onClick={() => onAction('retry', queue.name)}>
                <RotateCcw className="h-3 w-3 mr-1" /> Retry Failed
              </Button>
            )}
            {queue.counts.completed > 0 && (
              <Button variant="outline" size="sm" className="text-xs h-7 text-muted-foreground" onClick={() => onAction('clean', queue.name)}>
                <Trash2 className="h-3 w-3 mr-1" /> Clean
              </Button>
            )}
          </div>

          {/* Expandable sections */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                {/* Repeatable jobs */}
                {queue.repeatableJobs?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <CalendarClock className="h-3 w-3" /> Scheduled (Cron)
                    </h4>
                    <div className="space-y-1.5">
                      {queue.repeatableJobs.map((rj: RepeatableJob, i: number) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/40 border border-border/30 text-xs">
                          <div className="flex items-center gap-2">
                            <Zap className="h-3 w-3 text-amber-500" />
                            <span className="font-medium">{rj.name || rj.key}</span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span className="font-mono">{rj.pattern}</span>
                            {rj.tz && <span>({rj.tz})</span>}
                            {rj.next && (
                              <span className="text-[10px]">
                                Next: {new Date(rj.next).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent completed jobs */}
                {queue.recentCompleted?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Recent Completed
                    </h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {queue.recentCompleted.slice(0, 8).map((job: QueueJob, i: number) => (
                        <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-md bg-emerald-500/5 border border-emerald-500/10 text-xs">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            <span className="font-medium">{job.name}</span>
                            <span className="text-muted-foreground font-mono text-[10px]">#{job.id}</span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            {job.duration != null && (
                              <span className="text-[10px]">{job.duration < 1000 ? `${job.duration}ms` : `${(job.duration / 1000).toFixed(1)}s`}</span>
                            )}
                            {job.finishedOn && (
                              <span className="text-[10px]">{new Date(job.finishedOn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent failed jobs */}
                {queue.recentFailed?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                      <XCircle className="h-3 w-3 text-red-500" /> Recent Failures
                    </h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {queue.recentFailed.slice(0, 8).map((job: QueueJob, i: number) => (
                        <div key={i} className="px-3 py-2 rounded-md bg-red-500/5 border border-red-500/10 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-3 w-3 text-red-500" />
                              <span className="font-medium">{job.name}</span>
                              <span className="text-muted-foreground font-mono text-[10px]">#{job.id}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] border-red-500/20 text-red-400">
                              attempt {job.attemptsMade}
                            </Badge>
                          </div>
                          <p className="text-red-400/80 text-[11px] truncate ml-5" title={job.failedReason}>
                            {job.failedReason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {queue.recentCompleted?.length === 0 && queue.recentFailed?.length === 0 && queue.repeatableJobs?.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No job history yet
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Bull Dashboard page
// ─────────────────────────────────────────────────────────────────────────────
const BullDashboard = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "Bull Dashboard | Siara Dental";
  }, []);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["queue-stats"],
    queryFn: () => api.getQueueStats(),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const handleAction = async (action: string, queueName: string) => {
    try {
      let result;
      switch (action) {
        case 'pause':
          result = await api.pauseQueue(queueName);
          toast.success(`Queue "${queueName}" paused`);
          break;
        case 'resume':
          result = await api.resumeQueue(queueName);
          toast.success(`Queue "${queueName}" resumed`);
          break;
        case 'retry':
          result = await api.retryFailedJobs(queueName);
          toast.success(`Retried ${result.retried} failed jobs`);
          break;
        case 'clean':
          result = await api.cleanQueue(queueName);
          toast.success(`Cleaned ${result.cleaned} completed jobs`);
          break;
      }
      queryClient.invalidateQueries({ queryKey: ["queue-stats"] });
    } catch (err: any) {
      toast.error(`Action failed: ${err.message}`);
    }
  };

  // Compute aggregate stats
  const aggregateStats = data?.queues?.reduce(
    (acc: { totalCompleted: number; totalFailed: number; totalActive: number; totalWaiting: number }, q: QueueData) => ({
      totalCompleted: acc.totalCompleted + (q.counts.completed || 0),
      totalFailed: acc.totalFailed + (q.counts.failed || 0),
      totalActive: acc.totalActive + (q.counts.active || 0),
      totalWaiting: acc.totalWaiting + (q.counts.waiting || 0),
    }),
    { totalCompleted: 0, totalFailed: 0, totalActive: 0, totalWaiting: 0 }
  ) || { totalCompleted: 0, totalFailed: 0, totalActive: 0, totalWaiting: 0 };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Bull Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time monitoring of background job queues
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
            data?.redisConnected
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
              : 'bg-red-500/10 text-red-500 border-red-500/30'
          }`}>
            {data?.redisConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {data?.redisConnected ? 'Redis Connected' : 'Redis Offline'}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Aggregate stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{aggregateStats.totalCompleted.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{aggregateStats.totalFailed.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Loader2 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{aggregateStats.totalActive}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{aggregateStats.totalWaiting}</p>
              <p className="text-xs text-muted-foreground">Waiting</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : !data?.redisConnected ? (
        <Card className="border-red-500/20">
          <CardContent className="py-16 text-center">
            <Server className="mx-auto h-16 w-16 text-red-500/30 mb-4" />
            <h3 className="text-lg font-heading font-semibold mb-2">Redis Not Connected</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              The BullMQ job queue system requires a Redis connection. Please check your REDIS_URL configuration in the backend .env file.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.queues.map((queue: QueueData) => (
            <QueueCard key={queue.name} queue={queue} onAction={handleAction} />
          ))}
        </div>
      )}

      {/* Footer info */}
      {data?.timestamp && (
        <p className="text-[10px] text-muted-foreground text-center">
          Last updated: {new Date(data.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} • Auto-refreshes every 5s
        </p>
      )}
    </motion.div>
  );
};

export default BullDashboard;
