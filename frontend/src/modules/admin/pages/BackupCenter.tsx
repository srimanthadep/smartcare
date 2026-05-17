import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Database, Download, RefreshCcw, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { adminApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Badge } from '@/shared/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusConfig: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  completed: { icon: CheckCircle2, color: 'text-success' },
  failed: { icon: XCircle, color: 'text-destructive' },
  pending: { icon: Clock, color: 'text-warning' },
  in_progress: { icon: Loader2, color: 'text-info' },
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const BackupCenter: React.FC = () => {
  const qc = useQueryClient();
  React.useEffect(() => { document.title = 'Backup Center | Admin'; }, []);

  const { data, isLoading } = useQuery({ queryKey: ['admin-backups'], queryFn: () => adminApi.getBackups({ limit: 30 }) });

  const triggerMutation = useMutation({
    mutationFn: () => adminApi.triggerBackup(),
    onSuccess: (d) => { toast.success(d.message); qc.invalidateQueries({ queryKey: ['admin-backups'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Backup Center</h1>
          <p className="text-sm text-muted-foreground">Database backup management</p>
        </div>
        <Button onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending} className="gap-2">
          {triggerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Trigger Backup
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : !data?.backups?.length ? (
        <Card className="border-border/50"><CardContent className="py-12 text-center text-muted-foreground"><Database className="mx-auto h-12 w-12 opacity-20 mb-3" /><p>No backups found</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data.backups.map(b => {
            const st = statusConfig[b.status] || statusConfig.pending;
            const StIcon = st.icon;
            return (
              <Card key={b.id} className="border-border/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <StIcon className={`h-5 w-5 ${st.color} ${b.status === 'in_progress' ? 'animate-spin' : ''}`} />
                    <div>
                      <p className="text-sm font-medium">{b.fileName || 'Backup'} <Badge variant="outline" className="ml-2 text-[10px] capitalize">{b.status.replace('_', ' ')}</Badge></p>
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <span>By: {b.triggeredBy}</span>
                        <span>{format(new Date(b.startedAt), 'MMM d, yyyy HH:mm')}</span>
                        {b.fileSize && <span>{formatSize(b.fileSize)}</span>}
                      </div>
                      {b.errorMessage && <p className="text-[10px] text-destructive mt-0.5">{b.errorMessage}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default BackupCenter;
