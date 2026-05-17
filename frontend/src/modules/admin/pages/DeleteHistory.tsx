import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, RotateCcw, Search, AlertTriangle, CheckSquare, Calendar, User, FileText, DollarSign, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { adminApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Checkbox } from '@/shared/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/shared/ui/dialog';

const ENTITIES = ['patients', 'invoices', 'appointments', 'prescriptions', 'expenses', 'users'] as const;

const DeleteHistory: React.FC = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>('patients');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<{ entityType: string; id: string } | null>(null);
  
  // Multiselect state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  React.useEffect(() => { document.title = 'Delete History | Admin'; }, []);

  // Clear selection when tab, search, or page changes
  React.useEffect(() => {
    setSelectedIds([]);
  }, [tab, search, page]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-deleted', tab, search, page],
    queryFn: () => adminApi.getDeletedItems(tab, { search, page, limit: 15 }),
  });

  const restoreMutation = useMutation({
    mutationFn: ({ entityType, id }: { entityType: string; id: string }) => adminApi.restoreItem(entityType, id),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['admin-deleted'] }); 
      toast.success('Item restored successfully'); 
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: ({ entityType, id }: { entityType: string; id: string }) => adminApi.permanentDelete(entityType, id),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['admin-deleted'] }); 
      setConfirmDelete(null); 
      toast.success('Permanently deleted'); 
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Bulk mutations
  const bulkRestoreMutation = useMutation({
    mutationFn: ({ entityType, ids }: { entityType: string; ids: string[] }) => adminApi.bulkRestore(entityType, ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-deleted'] });
      setSelectedIds([]);
      toast.success('Selected items restored successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: ({ entityType, ids }: { entityType: string; ids: string[] }) => adminApi.bulkPermanentDelete(entityType, ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-deleted'] });
      setSelectedIds([]);
      setConfirmBulkDelete(false);
      toast.success('Selected items permanently deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const itemsList = data?.items || [];
  const totalPages = Math.ceil((data?.total || 0) / 15);

  const isAllSelected = itemsList.length > 0 && itemsList.every((item: any) => selectedIds.includes(item.id));
  const isSomeSelected = itemsList.length > 0 && itemsList.some((item: any) => selectedIds.includes(item.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      // Unselect all items on the current page
      setSelectedIds(prev => prev.filter(id => !itemsList.some((item: any) => item.id === id)));
    } else {
      // Select all items on the current page
      const newIds = itemsList.map((item: any) => item.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...newIds])));
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Helper to render customized descriptions based on entity type
  const renderItemDetails = (item: any) => {
    switch (tab) {
      case 'patients':
        return (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              {item.name}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>Age: {item.age}</span>
              <span>•</span>
              <span>Gender: <span className="capitalize">{item.gender}</span></span>
              <span>•</span>
              <span>Phone: {item.phone || 'N/A'}</span>
            </div>
          </div>
        );
      case 'invoices':
        return (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              Invoice {item.id}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {item.patientName && (
                <>
                  <span className="font-medium text-foreground">Patient: {item.patientName}</span>
                  <span>•</span>
                </>
              )}
              <span className="text-emerald-600 font-medium">Total: ₹{item.total}</span>
              <span>•</span>
              <span>Status: <span className="capitalize font-semibold">{item.status}</span></span>
            </div>
          </div>
        );
      case 'appointments':
        return (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-purple-500" />
              Appointment: <span className="font-normal capitalize">{item.type || 'General'}</span>
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {item.patientName && (
                <>
                  <span className="font-medium text-foreground">Patient: {item.patientName}</span>
                  <span>•</span>
                </>
              )}
              <span>Doctor: {item.doctorName || 'General'}</span>
              <span>•</span>
              <span>Date: {item.date ? format(new Date(item.date), 'MMM d, yyyy') : 'N/A'} at {item.time || 'N/A'}</span>
            </div>
          </div>
        );
      case 'prescriptions':
        return (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-emerald-500" />
              Prescription {item.id}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {item.patientName && (
                <>
                  <span className="font-medium text-foreground">Patient: {item.patientName}</span>
                  <span>•</span>
                </>
              )}
              <span>Doctor: {item.doctorName || 'General'}</span>
              {item.diagnosis && (
                <>
                  <span>•</span>
                  <span className="italic">Diagnosis: {item.diagnosis}</span>
                </>
              )}
            </div>
          </div>
        );
      case 'expenses':
        return (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-red-500" />
              Expense: {item.category || 'Other'}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="text-foreground">{item.description}</span>
              <span>•</span>
              <span className="font-medium text-red-600">Amount: ₹{item.amount}</span>
            </div>
          </div>
        );
      case 'users':
        return (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-yellow-500" />
              {item.name}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>Username: <span className="font-medium">{item.username}</span></span>
              <span>•</span>
              <span>Email: {item.email}</span>
              <span>•</span>
              <span className="capitalize font-semibold text-primary/80">Role: {item.role}</span>
            </div>
          </div>
        );
      default:
        return <p className="text-sm font-medium">{item.name || item.id}</p>;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20 relative">
      <div>
        <h1 className="text-2xl font-heading font-bold text-zinc-900 dark:text-zinc-50">Recovery Center</h1>
        <p className="text-sm text-muted-foreground">Restore or permanently delete soft-deleted items with detailed logs and bulk operations</p>
      </div>

      <Tabs value={tab} onValueChange={v => { setTab(v); setPage(1); setSearch(''); }}>
        <TabsList className="flex-wrap h-auto gap-1">
          {ENTITIES.map(e => <TabsTrigger key={e} value={e} className="capitalize text-xs">{e}</TabsTrigger>)}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card className="border-border/50 shadow-sm relative">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={`Search deleted ${tab}...`} className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{data?.total || 0} deleted items</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : !itemsList.length ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Trash2 className="mx-auto h-12 w-12 opacity-20 mb-3" />
                  <p>No deleted {tab} found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Select All Checkbox header */}
                  <div className="flex items-center justify-between p-2 px-3 bg-muted/40 rounded-lg border border-border/30">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                      />
                      <label htmlFor="select-all" className="text-xs font-semibold cursor-pointer select-none text-muted-foreground">
                        Select All ({itemsList.length} items on this page)
                      </label>
                    </div>
                    {selectedIds.length > 0 && (
                      <span className="text-xs font-medium text-primary">
                        {selectedIds.length} item(s) selected
                      </span>
                    )}
                  </div>

                  {/* List of items */}
                  <div className="space-y-2">
                    {itemsList.map((item: any) => {
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <div 
                          key={item.id} 
                          className={`flex items-start justify-between gap-4 rounded-xl border p-3.5 transition-all duration-200 ${
                            isSelected 
                              ? 'border-primary/50 bg-primary/[0.02] shadow-sm' 
                              : 'border-border/50 hover:bg-muted/30 hover:border-border'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="pt-1.5">
                              <Checkbox 
                                checked={isSelected} 
                                onCheckedChange={() => handleSelectItem(item.id)} 
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              {/* Renders custom details with Patient Name inline */}
                              {renderItemDetails(item)}
                              
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-muted-foreground font-medium bg-muted/20 w-fit px-2 py-0.5 rounded border border-border/20">
                                <span>ID: {item.id}</span>
                                <span>|</span>
                                {item.deletedAt && (
                                  <span className="text-red-500/90 font-medium">
                                    Deleted: {format(new Date(item.deletedAt), 'MMM d, yyyy h:mm:ss a')}
                                  </span>
                                )}
                                {item.deleteReason && (
                                  <>
                                    <span>|</span>
                                    <span>Reason: {item.deleteReason}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 shrink-0 self-center">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => restoreMutation.mutate({ entityType: tab, id: item.id })} 
                              disabled={restoreMutation.isPending} 
                              className="gap-1.5 text-xs h-8"
                            >
                              <RotateCcw className="h-3 w-3" />Restore
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => setConfirmDelete({ entityType: tab, id: item.id })} 
                              className="gap-1.5 text-xs h-8"
                            >
                              <Trash2 className="h-3 w-3" />Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination footer */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-border/30 mt-4">
                      <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4"
          >
            <div className="bg-zinc-900 text-zinc-50 border border-zinc-800 rounded-full shadow-2xl p-2 px-6 flex items-center justify-between gap-4 backdrop-blur-md bg-opacity-95">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">{selectedIds.length} item(s) selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => bulkRestoreMutation.mutate({ entityType: tab, ids: selectedIds })}
                  disabled={bulkRestoreMutation.isPending}
                  className="text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-full text-xs h-9 gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmBulkDelete(true)}
                  className="rounded-full text-xs h-9 gap-1.5 px-4 shadow-md bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Forever
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Permanent Delete */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Permanent Delete
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The selected item will be permanently removed from the database forever.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => confirmDelete && permanentDeleteMutation.mutate(confirmDelete)} 
              disabled={permanentDeleteMutation.isPending}
            >
              {permanentDeleteMutation.isPending ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Bulk Permanent Delete */}
      <Dialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              Bulk Permanent Delete
            </DialogTitle>
            <DialogDescription>
              Are you absolutely sure you want to permanently delete these <strong>{selectedIds.length}</strong> items? This action is irreversible and the records will be lost forever.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setConfirmBulkDelete(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => bulkDeleteMutation.mutate({ entityType: tab, ids: selectedIds })} 
              disabled={bulkDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {bulkDeleteMutation.isPending ? 'Deleting All...' : `Delete ${selectedIds.length} Forever`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default DeleteHistory;
