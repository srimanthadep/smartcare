import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ScrollText, Search, Filter, RefreshCcw } from 'lucide-react';
import { adminApi } from '../api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Skeleton } from '@/shared/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { format } from 'date-fns';

const AuditLogs: React.FC = () => {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);

  React.useEffect(() => { document.title = 'Activity Logs | Admin'; }, []);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-audit-logs', search, action, entityType, page],
    queryFn: () => adminApi.getAuditLogs({ search, action: action || undefined, entityType: entityType || undefined, page, limit: 25 }),
  });

  const { data: filters } = useQuery({ queryKey: ['admin-audit-filters'], queryFn: adminApi.getAuditFilters });
  const totalPages = Math.ceil((data?.total || 0) / 25);

  const getActionColor = (a: string) => {
    if (a.includes('DELETE') || a.includes('SUSPEND')) return 'bg-destructive/10 text-destructive';
    if (a.includes('CREATE') || a.includes('RESTORE') || a.includes('ACTIVATE')) return 'bg-success/10 text-success';
    if (a.includes('LOGIN') || a.includes('LOGOUT')) return 'bg-info/10 text-info';
    return 'bg-primary/10 text-primary';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold">Activity Logs</h1>
          <p className="text-sm text-muted-foreground">{data?.total?.toLocaleString() || 0} total entries</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search logs..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={action} onValueChange={v => { setAction(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {filters?.actions?.map(a => <SelectItem key={a} value={a}>{a.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={entityType} onValueChange={v => { setEntityType(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All entities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {filters?.entityTypes?.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !data?.logs?.length ? (
            <div className="py-12 text-center text-muted-foreground"><ScrollText className="mx-auto h-12 w-12 opacity-20 mb-3" /><p>No audit logs found</p></div>
          ) : (
            <>
              {/* Mobile */}
              <div className="space-y-2 md:hidden">
                {data.logs.map(log => (
                  <div key={log.id} className="rounded-xl border border-border/50 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getActionColor(log.action)}`}>{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(log.createdAt), 'MMM d, HH:mm')}</span>
                    </div>
                    <p className="text-sm font-medium">{log.actorName || 'System'}</p>
                    {log.entityType && <p className="text-xs text-muted-foreground">{log.entityType} {log.entityId && `#${log.entityId}`}</p>}
                  </div>
                ))}
              </div>
              {/* Desktop */}
              <div className="hidden md:block overflow-hidden rounded-md border border-border/50">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[160px]">Timestamp</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.logs.map(log => (
                      <TableRow key={log.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground font-medium">{format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}</TableCell>
                        <TableCell>
                          <div><span className="text-sm font-medium">{log.actorName || 'System'}</span>
                          <span className="text-[10px] text-muted-foreground ml-1 capitalize">{log.actorRole}</span></div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{log.entityType ? `${log.entityType}${log.entityId ? ` #${log.entityId}` : ''}` : '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{log.ipAddress || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AuditLogs;
