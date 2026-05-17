import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bot, Zap, DollarSign, Clock, RefreshCcw } from 'lucide-react';
import { adminApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import StatsCard from '@/shared/components/StatsCard';
import { format } from 'date-fns';

const AIAnalytics: React.FC = () => {
  React.useEffect(() => { document.title = 'AI Analytics | Admin'; }, []);

  const { data, isLoading, refetch, isFetching } = useQuery({ queryKey: ['admin-ai'], queryFn: adminApi.getAIAnalytics });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">AI Analytics</h1>
          <p className="text-sm text-muted-foreground">Monitor AI tool usage and costs</p>
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
            <StatsCard title="Total Requests" value={data.totalRequests.toLocaleString()} change={`${data.requestsToday} today`} changeType="positive" icon={Bot} />
            <StatsCard title="Total Tokens" value={data.totalTokens.toLocaleString()} icon={Zap} />
            <StatsCard title="Total Cost" value={`$${data.totalCost.toFixed(4)}`} icon={DollarSign} />
            <StatsCard title="Avg Response" value={`${data.avgResponseTime}ms`} icon={Clock} changeType={data.avgResponseTime > 5000 ? 'negative' : 'positive'} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Tool Breakdown</CardTitle></CardHeader>
              <CardContent>
                {data.toolBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No AI tools used yet</p>
                ) : (
                  <div className="space-y-3">
                    {data.toolBreakdown.map(t => (
                      <div key={t.tool} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{t.tool}</span>
                          <span className="text-muted-foreground">{t.count} calls</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary to-orange-500" style={{ width: `${Math.min(100, (t.count / Math.max(1, data.totalRequests)) * 100)}%` }} />
                        </div>
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          <span>{t.tokens.toLocaleString()} tokens</span>
                          <span>${t.cost.toFixed(4)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Recent Requests</CardTitle></CardHeader>
              <CardContent>
                {data.recentRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No recent AI requests</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {data.recentRequests.map(r => (
                      <div key={r.id} className={`rounded-lg border p-2.5 ${r.success ? 'border-border/30' : 'border-destructive/20 bg-destructive/5'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{r.tool}</span>
                          <span className={`text-[10px] font-bold ${r.success ? 'text-success' : 'text-destructive'}`}>{r.success ? 'OK' : 'FAIL'}</span>
                        </div>
                        <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                          <span>{r.userName}</span>
                          <span>{r.tokensUsed} tokens</span>
                          <span>{r.responseTimeMs}ms</span>
                          <span>{format(new Date(r.createdAt), 'HH:mm:ss')}</span>
                        </div>
                        {r.errorMessage && <p className="text-[10px] text-destructive mt-0.5">{r.errorMessage}</p>}
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

export default AIAnalytics;
