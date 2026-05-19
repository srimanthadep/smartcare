import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import {
  Users2,
  Phone,
  Mail,
  Percent,
  Coins,
  Search,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

const ReferralCRM: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    type: 'doctor',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    commissionType: 'percentage',
    commissionValue: '10',
  });

  // Queries
  const { data: sources, isLoading } = useQuery({
    queryKey: ['referralSources'],
    queryFn: () => api.getReferralSources().catch(() => []),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) => api.createReferralSource(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralSources'] });
      toast.success('Referral source added to CRM');
      setShowAddForm(false);
      setFormData({
        name: '',
        type: 'doctor',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        commissionType: 'percentage',
        commissionValue: '10',
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to add source');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteReferralSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralSources'] });
      toast.success('Referral source removed from CRM');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Partner Name is required');
    createMutation.mutate({
      ...formData,
      commissionValue: Number(formData.commissionValue) || 0,
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remove ${name} from CRM directory?`)) {
      deleteMutation.mutate(id);
    }
  };

  const filteredSources = sources
    ?.filter((s: any) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.contactName && s.contactName.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .filter((s: any) => (typeFilter === 'all' ? true : s.type === typeFilter)) || [];

  return (
    <div className="space-y-6">
      {/* Top Search & Filter Bar */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2 max-w-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search partners by clinic, name..."
              className="pl-9"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="all">All Types</option>
            <option value="doctor">Doctors</option>
            <option value="clinic">Clinics</option>
            <option value="patient">Patients</option>
            <option value="corporate">Corporates</option>
            <option value="marketing">Marketing campaigns</option>
          </select>
        </div>

        <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2 shrink-0">
          {showAddForm ? 'Close panel' : <><Plus className="h-4 w-4" /> Add Partner</>}
        </Button>
      </section>

      {/* Add Partner Panel */}
      {showAddForm && (
        <Card className="luxury-card border border-primary/20 bg-gradient-to-tr from-background to-primary/5">
          <CardHeader>
            <CardTitle>Add Growth Partner / Campaign</CardTitle>
            <CardDescription>Configure external referrers and reward systems.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="name">Partner Name / Campaign Title</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dr. Rajan Verma"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Partner Type</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="doctor">External Doctor</option>
                    <option value="clinic">Clinic / Lab Group</option>
                    <option value="patient">Patient Referral (Loyalty)</option>
                    <option value="corporate">Corporate Alliance</option>
                    <option value="marketing">Marketing Campaign</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="contactName">Contact Representative</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="e.g. Front desk manager"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <Label htmlFor="phone">Phone Contact</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="partner@clinic.com"
                  />
                </div>
                <div>
                  <Label htmlFor="commissionType">Commission Model</Label>
                  <select
                    id="commissionType"
                    value={formData.commissionType}
                    onChange={(e) => setFormData({ ...formData, commissionType: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="percentage">Percentage share (%)</option>
                    <option value="flat">Flat Reward Payout (₹)</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="commissionValue">Commission Rate</Label>
                  <Input
                    id="commissionValue"
                    type="number"
                    value={formData.commissionValue}
                    onChange={(e) => setFormData({ ...formData, commissionValue: e.target.value })}
                    placeholder="e.g. 10 or 1500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Clinic / Campaign Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street suite, city area..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  Save Partner Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Partners List Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSources.map((src: any) => (
          <Card key={src.id} className="luxury-card flex flex-col justify-between hover:border-primary/20 transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-foreground line-clamp-1">{src.name}</CardTitle>
                  <CardDescription className="text-xs font-mono">{src.id}</CardDescription>
                </div>
                <Badge variant="secondary" className="capitalize text-xs">
                  {src.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {/* Contact info */}
              <div className="space-y-2 text-xs text-muted-foreground">
                {src.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground/80" />
                    <span>{src.phone}</span>
                  </div>
                )}
                {src.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-muted-foreground/80" />
                    <span>{src.email}</span>
                  </div>
                )}
              </div>

              {/* Commission Details */}
              <div className="bg-secondary/10 p-3 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {src.commissionType === 'percentage' ? (
                    <Percent className="h-4.5 w-4.5 text-primary" />
                  ) : (
                    <Coins className="h-4.5 w-4.5 text-primary" />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">
                      {src.commissionType === 'percentage' ? `${src.commissionValue}% Share` : `₹${src.commissionValue} Flat`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Commission Rate</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    ₹{Number(src.totalRevenue || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{src.totalReferrals} leads</p>
                </div>
              </div>

              {/* Delete Button */}
              <div className="flex justify-end pt-2 border-t border-border/20">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                  onClick={() => handleDelete(src.id, src.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredSources.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center text-sm text-muted-foreground">
            No growth partners match your current filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralCRM;
