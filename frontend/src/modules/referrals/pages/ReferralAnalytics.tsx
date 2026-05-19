import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Briefcase,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';

const ReferralAnalytics: React.FC = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['referralAnalytics'],
    queryFn: () => api.getReferralAnalytics().catch(() => null),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const kpis = analytics?.kpis || {
    total_leads: 0,
    converted_cases: 0,
    total_conversion_revenue: 0,
    pipeline_value: 0,
  };

  const sourceBreakdown = analytics?.sourceBreakdown || [];
  const monthlyTrends = analytics?.monthlyTrends || [];
  const topReferrers = analytics?.topReferrers || [];

  const maxRevenueSource = sourceBreakdown.reduce((max: number, current: any) => 
    Number(current.revenue || 0) > max ? Number(current.revenue || 0) : max, 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Revenue Breakdown by Channel */}
        <Card className="luxury-card">
          <CardHeader className="flex flex-row items-center gap-3">
            <PieChart className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">Revenue Breakdown by Channel</CardTitle>
              <CardDescription>Visual analysis of income distribution across partner channels.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {sourceBreakdown.map((item: any) => {
              const widthPct = Math.round((Number(item.revenue || 0) / maxRevenueSource) * 100);
              return (
                <div key={item.source_type} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground capitalize">
                      {item.source_type === 'doctor' ? 'Clinical Doctors' : item.source_type}
                    </span>
                    <span className="font-bold text-foreground">
                      ₹{Number(item.revenue || 0).toLocaleString()} ({item.count} leads)
                    </span>
                  </div>
                  {/* SVG Bar Chart progress representation */}
                  <div className="h-3.5 w-full rounded-full bg-secondary/15 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-orange-500 transition-all duration-500"
                      style={{ width: `${Math.max(5, widthPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {sourceBreakdown.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No active source data collected yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Conversion Pipeline Value */}
        <Card className="luxury-card">
          <CardHeader className="flex flex-row items-center gap-3">
            <TrendingUp className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">Monthly ROI Trend</CardTitle>
              <CardDescription>Track conversions and clinical billings generated over time.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthlyTrends.map((trend: any) => (
              <div key={trend.month} className="flex items-center justify-between border-b border-border/30 pb-2">
                <div>
                  <p className="font-semibold text-sm text-foreground">{trend.month}</p>
                  <p className="text-xs text-muted-foreground">
                    {trend.converted} converted of {trend.total} leads
                  </p>
                </div>
                <span className="font-bold text-emerald-500">
                  ₹{Number(trend.revenue || 0).toLocaleString()}
                </span>
              </div>
            ))}
            {monthlyTrends.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No monthly trends collected yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Partnerships ledger overview */}
      <Card className="luxury-card">
        <CardHeader className="flex flex-row items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-xl font-bold">Partnerships ROI Leaderboard</CardTitle>
            <CardDescription>Performance rank of our clinical referral network members.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            {topReferrers.map((ref: any, idx: number) => (
              <div key={ref.id} className="flex items-center justify-between p-4 hover:bg-secondary/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{ref.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{ref.type}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-foreground text-sm">
                    ₹{Number(ref.total_revenue || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{ref.total_referrals} referral leads</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralAnalytics;
