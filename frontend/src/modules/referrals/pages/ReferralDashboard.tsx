import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import {
  Users,
  Award,
  CircleDollarSign,
  TrendingUp,
  Plus,
  ArrowUpRight,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';

import StatsCard from '@/shared/components/StatsCard';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const ReferralDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    sourceId: '',
    notes: '',
    estimatedRevenue: '0',
  });

  // Queries
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['referralAnalytics'],
    queryFn: () => api.getReferralAnalytics().catch(() => null),
  });

  const { data: sources } = useQuery({
    queryKey: ['referralSources'],
    queryFn: () => api.getReferralSources().catch(() => []),
  });

  const { data: referrals } = useQuery({
    queryKey: ['patientReferrals'],
    queryFn: () => api.getPatientReferrals().catch(() => []),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => api.createPatientReferral(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientReferrals'] });
      queryClient.invalidateQueries({ queryKey: ['referralAnalytics'] });
      toast.success('Patient referral added successfully');
      setShowAddForm(false);
      setFormData({
        patientName: '',
        patientPhone: '',
        patientEmail: '',
        sourceId: '',
        notes: '',
        estimatedRevenue: '0',
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to add referral');
    },
  });

  const handleAddReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName || !formData.sourceId) {
      return toast.error('Patient Name and Referral Source are required');
    }
    createMutation.mutate({
      ...formData,
      estimatedRevenue: Number(formData.estimatedRevenue) || 0,
      status: 'received',
    });
  };

  const kpis = analytics?.kpis || {
    total_leads: 0,
    converted_cases: 0,
    total_conversion_revenue: 0,
    pipeline_value: 0,
  };

  const conversionRate = kpis.total_leads > 0 
    ? Math.round((Number(kpis.converted_cases) / Number(kpis.total_leads)) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Referral Leads"
          value={String(kpis.total_leads)}
          change="Lifetime received"
          changeType="neutral"
          icon={Users}
        />
        <StatsCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          change="Stage transitions accepted"
          changeType="positive"
          icon={TrendingUp}
        />
        <StatsCard
          title="Total Conversion Revenue"
          value={`₹${Number(kpis.total_conversion_revenue || 0).toLocaleString()}`}
          change="Released invoices revenue"
          changeType="positive"
          icon={CircleDollarSign}
        />
        <StatsCard
          title="Pipeline Est. Value"
          value={`₹${Number(kpis.pipeline_value || 0).toLocaleString()}`}
          change="Pending conversion cases"
          changeType="neutral"
          icon={Award}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Section */}
        <div className="space-y-6 lg:col-span-2">
          {/* Quick Create Referral */}
          <Card className="luxury-card border border-primary/10 bg-gradient-to-br from-background via-background to-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-xl">Record Patient Referral</CardTitle>
                <CardDescription>Enter incoming referral lead cases from external groups or patients.</CardDescription>
              </div>
              <Button
                variant={showAddForm ? "outline" : "default"}
                onClick={() => setShowAddForm(!showAddForm)}
                className="gap-2"
              >
                {showAddForm ? 'Cancel' : <><Plus className="h-4 w-4" /> Add Lead</>}
              </Button>
            </CardHeader>
            {showAddForm && (
              <CardContent>
                <form onSubmit={handleAddReferral} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="patientName">Patient Name</Label>
                      <Input
                        id="patientName"
                        value={formData.patientName}
                        onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                        placeholder="e.g. Amit Sharma"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sourceId">Referral Source</Label>
                      <select
                        id="sourceId"
                        value={formData.sourceId}
                        onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Doctor, Group or Campaign...</option>
                        {sources?.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="patientPhone">Phone Number</Label>
                      <Input
                        id="patientPhone"
                        value={formData.patientPhone}
                        onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                        placeholder="10-digit number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="patientEmail">Email Address</Label>
                      <Input
                        id="patientEmail"
                        type="email"
                        value={formData.patientEmail}
                        onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                        placeholder="patient@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="estimatedRevenue">Estimated Revenue (₹)</Label>
                      <Input
                        id="estimatedRevenue"
                        type="number"
                        value={formData.estimatedRevenue}
                        onChange={(e) => setFormData({ ...formData, estimatedRevenue: e.target.value })}
                        placeholder="e.g. 15000"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Clinical notes / Treatment focus</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Chief complaint or expected procedure..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="submit" disabled={createMutation.isPending}>
                      Submit Referral Entry
                    </Button>
                  </div>
                </form>
              </CardContent>
            )}
          </Card>

          {/* Recent Referrals Pipeline List */}
          <Card className="luxury-card">
            <CardHeader>
              <CardTitle className="text-xl">Latest Referral Activity</CardTitle>
              <CardDescription>Real-time view of recent incoming cases and pipeline status.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                {referrals?.slice(0, 5).map((ref: any) => (
                  <div key={ref.id} className="flex items-center justify-between p-4 hover:bg-secondary/5 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{ref.patientName}</span>
                        <Badge variant="outline" className="text-xs">
                          {ref.sourceName}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Source ID: {ref.sourceId} · Ref ID: {ref.id}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          ₹{Number(ref.estimatedRevenue || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Est. Value</p>
                      </div>
                      <Badge
                        className={
                          ref.status === 'completed' || ref.status === 'commission_released'
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-primary/10 text-primary border-primary/20'
                        }
                      >
                        {ref.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {referrals?.length === 0 && (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No patient referrals recorded yet. Click "Add Lead" to enter one.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar panels */}
        <div className="space-y-6">
          {/* Top Sources Leaderboard */}
          <Card className="luxury-card">
            <CardHeader>
              <CardTitle className="text-xl">Top Referral Partners</CardTitle>
              <CardDescription>Highest revenue-generating partners.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sources?.slice(0, 4).map((src: any, index: number) => (
                <div key={src.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{src.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{src.type}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      ₹{Number(src.totalRevenue || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{src.totalReferrals} referrals</p>
                  </div>
                </div>
              ))}
              {sources?.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No partners recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReferralDashboard;
