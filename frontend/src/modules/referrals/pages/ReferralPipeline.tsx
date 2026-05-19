import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import {
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Briefcase,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

const STAGES = [
  { id: 'received', label: 'Received', color: 'border-slate-500 bg-slate-500/5' },
  { id: 'scheduled', label: 'Scheduled', color: 'border-blue-500 bg-blue-500/5' },
  { id: 'consulted', label: 'Consulted', color: 'border-indigo-500 bg-indigo-500/5' },
  { id: 'treatment_accepted', label: 'Accepted', color: 'border-amber-500 bg-amber-500/5' },
  { id: 'in_progress', label: 'In Progress', color: 'border-purple-500 bg-purple-500/5' },
  { id: 'completed', label: 'Completed', color: 'border-emerald-500 bg-emerald-500/5' },
];

const STAGE_ORDER = ['received', 'scheduled', 'consulted', 'treatment_accepted', 'in_progress', 'completed'];

const ReferralPipeline: React.FC = () => {
  const queryClient = useQueryClient();

  // Queries
  const { data: referrals, isLoading } = useQuery({
    queryKey: ['patientReferrals'],
    queryFn: () => api.getPatientReferrals().catch(() => []),
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      api.updatePatientReferral(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientReferrals'] });
      queryClient.invalidateQueries({ queryKey: ['referralAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['referralCommissions'] });
      toast.success('Referral pipeline stage updated');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update stage');
    },
  });

  const handleMoveStage = (id: string, currentStatus: string, direction: 'forward' | 'backward') => {
    const currentIndex = STAGE_ORDER.indexOf(currentStatus);
    if (currentIndex === -1) return;

    let nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= STAGE_ORDER.length) return;

    const nextStage = STAGE_ORDER[nextIndex];
    const updatePayload: any = { status: nextStage };

    // If moving to completed, simulate patient actual revenue is captured
    if (nextStage === 'completed') {
      const ref = referrals?.find((r: any) => r.id === id);
      if (ref) {
        // Default actual revenue is equal to estimated revenue or some reasonable value if zero
        updatePayload.actualRevenue = ref.actualRevenue || ref.estimatedRevenue || 12000;
        updatePayload.conversionDate = new Date().toISOString();
      }
    }

    updateMutation.mutate({ id, payload: updatePayload });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kanban Scroll Wrapper */}
      <div className="flex gap-4 overflow-x-auto pb-4 select-none scrollbar-thin">
        {STAGES.map((stage) => {
          const stageLeads = referrals?.filter((ref: any) => ref.status === stage.id) || [];
          const stageValue = stageLeads.reduce((sum, r) => sum + (Number(r.estimatedRevenue) || 0), 0);

          return (
            <div
              key={stage.id}
              className={`flex w-72 shrink-0 flex-col rounded-xl border p-4 ${stage.color}`}
            >
              {/* Stage Header */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground">{stage.label}</h3>
                  <p className="text-xs text-muted-foreground">
                    ₹{stageValue.toLocaleString()} · {stageLeads.length} leads
                  </p>
                </div>
                <Badge variant="secondary" className="font-semibold">
                  {stageLeads.length}
                </Badge>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[550px] scrollbar-none">
                {stageLeads.map((ref) => (
                  <Card key={ref.id} className="luxury-card shadow-sm border border-border/50 hover:border-primary/20 transition-all duration-300">
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-foreground">{ref.patientName}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{ref.id}</span>
                        </div>
                        <p className="text-xs text-primary font-medium mt-1">
                          Ref: {ref.sourceName}
                        </p>
                      </div>

                      {ref.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-2 italic bg-secondary/10 p-2 rounded">
                          "{ref.notes}"
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <div>
                          <p className="text-xs text-muted-foreground">Est. Revenue</p>
                          <p className="text-sm font-semibold text-foreground">
                            ₹{Number(ref.estimatedRevenue || 0).toLocaleString()}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            disabled={STAGE_ORDER.indexOf(ref.status) === 0}
                            onClick={() => handleMoveStage(ref.id, ref.status, 'backward')}
                            title="Move back"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            disabled={STAGE_ORDER.indexOf(ref.status) === STAGE_ORDER.length - 1}
                            onClick={() => handleMoveStage(ref.id, ref.status, 'forward')}
                            title="Move next"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {stageLeads.length === 0 && (
                  <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border/40 p-4 text-center text-xs text-muted-foreground/80">
                    <Briefcase className="h-5 w-5 mb-2 text-muted-foreground/40" />
                    No patient leads in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReferralPipeline;
