import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Gauge, CheckCircle2, XCircle, Clock, RefreshCcw } from 'lucide-react';
import { adminApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import StatsCard from '@/shared/components/StatsCard';
import { Skeleton } from '@/shared/ui/skeleton';
import { Button } from '@/shared/ui/button';
import { format } from 'date-fns';

const QueueMonitor: React.FC = () => {
  React.useEffect(() => { document.title = 'Queue Monitor | Admin'; }, []);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-queue'],
    queryFn: adminApi.getQueueStats,
    refetchInterval: 5000,
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Queue Monitor</h1>
          <p className="text-sm text-muted-foreground">In-memory job queue status (auto-refreshes every 5s)</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[132px]" />)}</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard title="Pending" value={data.pending} icon={Clock} changeType="neutral" />
            <StatsCard title="Active" value={data.active} change={`of ${data.concurrencyLimit} slots`} icon={Gauge} changeType="positive" />
            <StatsCard title="Completed" value={data.completed.toLocaleString()} icon={CheckCircle2} changeType="positive" />
            <StatsCard title="Failed" value={data.failed} icon={XCircle} changeType={data.failed > 0 ? 'negative' : 'neutral'} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />Recent Completed</CardTitle></CardHeader>
              <CardContent>
                {data.recentCompleted.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No completed jobs yet</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {data.recentCompleted.map((job: any) => (
                      <div key={job.id} className="flex items-center justify-between rounded-lg border border-border/30 p-2.5">
                        <div>
                          <p className="text-sm font-medium">{job.name}</p>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(job.finishedOn), 'HH:mm:ss')}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{job.duration}ms</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" />Recent Failed</CardTitle></CardHeader>
              <CardContent>
                {data.recentFailed.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No failed jobs</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {data.recentFailed.map((job: any) => (
                      <div key={job.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5">
                        <p className="text-sm font-medium">{job.name}</p>
                        <p className="text-[10px] text-destructive">{job.failedReason}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(job.finishedOn), 'HH:mm:ss')} · {job.duration}ms</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </motion.div>
  );
};

export default QueueMonitor;
