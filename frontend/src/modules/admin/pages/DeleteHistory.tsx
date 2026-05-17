import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trash2, RotateCcw, Search, AlertTriangle } from 'lucide-react';
import { adminApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
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

  React.useEffect(() => { document.title = 'Delete History | Admin'; }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-deleted', tab, search, page],
    queryFn: () => adminApi.getDeletedItems(tab, { search, page, limit: 15 }),
  });

  const restoreMutation = useMutation({
    mutationFn: ({ entityType, id }: { entityType: string; id: string }) => adminApi.restoreItem(entityType, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-deleted'] }); toast.success('Item restored'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: ({ entityType, id }: { entityType: string; id: string }) => adminApi.permanentDelete(entityType, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-deleted'] }); setConfirmDelete(null); toast.success('Permanently deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPages = Math.ceil((data?.total || 0) / 15);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Recovery Center</h1>
        <p className="text-sm text-muted-foreground">Restore or permanently delete soft-deleted items</p>
      </div>

      <Tabs value={tab} onValueChange={v => { setTab(v); setPage(1); setSearch(''); }}>
        <TabsList className="flex-wrap h-auto gap-1">
          {ENTITIES.map(e => <TabsTrigger key={e} value={e} className="capitalize text-xs">{e}</TabsTrigger>)}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={`Search deleted ${tab}...`} className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <span className="text-xs text-muted-foreground">{data?.total || 0} deleted</span>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : !data?.items?.length ? (
                <div className="py-12 text-center text-muted-foreground"><Trash2 className="mx-auto h-12 w-12 opacity-20 mb-3" /><p>No deleted {tab} found</p></div>
              ) : (
                <div className="space-y-2">
                  {data.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-border/50 p-3 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.name || item.patientName || item.title || item.id}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                          <span>ID: {item.id}</span>
                          {item.deletedAt && <span>Deleted: {format(new Date(item.deletedAt), 'MMM d, yyyy HH:mm')}</span>}
                          {item.deleteReason && <span>Reason: {item.deleteReason}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => restoreMutation.mutate({ entityType: tab, id: item.id })} disabled={restoreMutation.isPending} className="gap-1.5 text-xs">
                          <RotateCcw className="h-3 w-3" />Restore
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setConfirmDelete({ entityType: tab, id: item.id })} className="gap-1.5 text-xs">
                          <Trash2 className="h-3 w-3" />Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
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

      {/* Confirm Permanent Delete */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" />Permanent Delete</DialogTitle>
            <DialogDescription>This action cannot be undone. The item will be permanently removed from the database.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => confirmDelete && permanentDeleteMutation.mutate(confirmDelete)} disabled={permanentDeleteMutation.isPending}>
              {permanentDeleteMutation.isPending ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default DeleteHistory;
