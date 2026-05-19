import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import {
  DollarSign,
  Gift,
  CheckCircle,
  Coins,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';

const statusTone: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  approved: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  released: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  cancelled: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  available: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  redeemed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

const ReferralCommissions: React.FC = () => {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<'commissions' | 'rewards'>('commissions');

  // Queries
  const { data: commissions, isLoading: loadingCom } = useQuery({
    queryKey: ['referralCommissions'],
    queryFn: () => api.getReferralCommissions().catch(() => []),
  });

  const { data: rewards, isLoading: loadingRew } = useQuery({
    queryKey: ['referralRewards'],
    queryFn: () => api.getReferralRewards().catch(() => []),
  });

  // Mutations
  const payoutMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      api.updateReferralCommission(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralCommissions'] });
      queryClient.invalidateQueries({ queryKey: ['referralAnalytics'] });
      toast.success('Payout status updated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update payout');
    },
  });

  const rewardMutation = useMutation({
    mutationFn: (id: string) => api.redeemReferralReward(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralRewards'] });
      toast.success('Reward point claimed/redeemed!');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to redeem points');
    },
  });

  const handleReleasePayout = (id: string) => {
    if (confirm('Mark this commission payout as fully released and transferred?')) {
      payoutMutation.mutate({ id, payload: { status: 'released' } });
    }
  };

  const handleRedeemPoints = (id: string) => {
    if (confirm('Confirm redemption of patient reward points?')) {
      rewardMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs Selection */}
      <div className="flex gap-2">
        <Button
          variant={subTab === 'commissions' ? 'default' : 'outline'}
          onClick={() => setSubTab('commissions')}
          className="gap-2"
        >
          <DollarSign className="h-4 w-4" />
          Doctor Commission Ledger
        </Button>
        <Button
          variant={subTab === 'rewards' ? 'default' : 'outline'}
          onClick={() => setSubTab('rewards')}
          className="gap-2"
        >
          <Gift className="h-4 w-4" />
          Patient Loyalty Rewards
        </Button>
      </div>

      {subTab === 'commissions' ? (
        <Card className="luxury-card">
          <CardHeader>
            <CardTitle>Commission Payouts Ledger</CardTitle>
            <CardDescription>Track and disburse referral commission payouts to collaborating clinics or doctors.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/15">
                <TableRow>
                  <TableHead>Commission ID</TableHead>
                  <TableHead>Referral Source</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payout Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCom ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center">Loading ledger...</TableCell>
                  </TableRow>
                ) : commissions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      No commission payout ledger lines generated.
                    </TableCell>
                  </TableRow>
                ) : (
                  commissions?.map((com: any) => (
                    <TableRow key={com.id} className="hover:bg-secondary/10">
                      <TableCell className="font-mono text-xs">{com.id}</TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{com.sourceName}</p>
                        <p className="text-xs text-muted-foreground">Contact: {com.sourceContact || 'N/A'}</p>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">{com.patientName}</TableCell>
                      <TableCell className="font-bold text-primary">₹{Number(com.commissionAmount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize font-medium ${statusTone[com.status]}`}>
                          {com.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {com.releasedAt ? new Date(com.releasedAt).toLocaleDateString() : 'Pending'}
                      </TableCell>
                      <TableCell className="text-right">
                        {com.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReleasePayout(com.id)}
                            className="h-8 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500"
                          >
                            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                            Release Payout
                          </Button>
                        )}
                        {com.status === 'released' && (
                          <span className="text-xs text-emerald-500 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Paid by {com.releasedBy}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="luxury-card">
          <CardHeader>
            <CardTitle>Patient Loyalty Rewards Points</CardTitle>
            <CardDescription>Reward patient ambassadors who introduce family, friends, or colleagues to Siara Dental.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-secondary/15">
                <TableRow>
                  <TableHead>Reward ID</TableHead>
                  <TableHead>Referring Patient Ambassador</TableHead>
                  <TableHead>Referred Contact</TableHead>
                  <TableHead>Reward Points Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Redeemed At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRew ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center">Loading rewards...</TableCell>
                  </TableRow>
                ) : rewards?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      No ambassador rewards created yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rewards?.map((rew: any) => (
                    <TableRow key={rew.id} className="hover:bg-secondary/10">
                      <TableCell className="font-mono text-xs">{rew.id}</TableCell>
                      <TableCell className="font-semibold text-foreground">{rew.referrerName}</TableCell>
                      <TableCell className="text-muted-foreground">{rew.patientName}</TableCell>
                      <TableCell className="font-bold text-amber-500">
                        <span className="flex items-center gap-1">
                          <Coins className="h-4 w-4" /> {Number(rew.rewardValue).toLocaleString()} Points
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize font-medium ${statusTone[rew.status]}`}>
                          {rew.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {rew.redeemedAt ? new Date(rew.redeemedAt).toLocaleDateString() : 'Available'}
                      </TableCell>
                      <TableCell className="text-right">
                        {rew.status === 'available' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRedeemPoints(rew.id)}
                            className="h-8 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-500"
                          >
                            <Gift className="mr-1 h-3.5 w-3.5" />
                            Redeem Points
                          </Button>
                        )}
                        {rew.status === 'redeemed' && (
                          <span className="text-xs text-emerald-500 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Redeemed
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReferralCommissions;
