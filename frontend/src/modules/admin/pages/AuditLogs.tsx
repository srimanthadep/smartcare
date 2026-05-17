import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ScrollText, Search, RefreshCcw, FileSpreadsheet, FileText, Info } from 'lucide-react';
import { adminApi } from '../api';
import { Card, CardContent, CardHeader } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Skeleton } from '@/shared/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';

const AuditLogs: React.FC = () => {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [isExportingXLSX, setIsExportingXLSX] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  React.useEffect(() => { 
    document.title = 'Activity Logs | Admin'; 
  }, []);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-audit-logs', search, action, entityType, page],
    queryFn: () => adminApi.getAuditLogs({ 
      search, 
      action: action || undefined, 
      entityType: entityType || undefined, 
      page, 
      limit: 25 
    }),
  });

  const { data: filters } = useQuery({ 
    queryKey: ['admin-audit-filters'], 
    queryFn: adminApi.getAuditFilters 
  });
  
  const totalPages = Math.ceil((data?.total || 0) / 25);

  const getActionColor = (a: string) => {
    const act = a.toUpperCase();
    if (act.includes('DELETE') || act.includes('SUSPEND') || act.includes('REMOVE')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25';
    if (act.includes('CREATE') || act.includes('RESTORE') || act.includes('ADD') || act.includes('INSERT') || act.includes('UPLOAD')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25';
    if (act.includes('LOGIN') || act.includes('LOGOUT') || act.includes('AUTH') || act.includes('CONNECT')) return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25';
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('MODIFY')) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25';
    return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/25';
  };

  const handleExportXLSX = async () => {
    try {
      setIsExportingXLSX(true);
      toast.loading('Generating Excel sheet...', { id: 'xlsx-export' });
      await adminApi.exportAuditLogsXLSX({ 
        search, 
        action: action || undefined, 
        entityType: entityType || undefined 
      });
      toast.success('Excel sheet downloaded successfully!', { id: 'xlsx-export' });
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to export Excel sheet: ' + error.message, { id: 'xlsx-export' });
    } finally {
      setIsExportingXLSX(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      toast.loading('Generating PDF report...', { id: 'pdf-export' });
      await adminApi.exportAuditLogsPDF({ 
        search, 
        action: action || undefined, 
        entityType: entityType || undefined 
      });
      toast.success('PDF report downloaded successfully!', { id: 'pdf-export' });
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to export PDF: ' + error.message, { id: 'pdf-export' });
    } finally {
      setIsExportingPDF(false);
    }
  };

  const renderDetails = (log: any) => {
    if (!log.metadata) {
      return log.action.replace(/_/g, ' ');
    }
    try {
      const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
      
      // 1. Bulk Delete Action
      if (log.action.includes('BULK_PERMANENTLY_DELETED') || meta.ids) {
        const count = meta.count || meta.ids?.length || 0;
        const type = log.action.includes('INVOICE') ? 'invoices' : log.action.includes('PRESCRIPTION') ? 'prescriptions' : 'records';
        const idList = meta.ids ? meta.ids.slice(0, 5).join(', ') + (meta.ids.length > 5 ? '...' : '') : '';
        return `Permanently deleted ${count} ${type}${idList ? ` (${idList})` : ''}`;
      }
      
      // 2. User Deleted
      if (log.action === 'USER_DELETED') {
        return `Deleted user: ${meta.userName || 'Unknown'} (Reason: ${meta.reason || 'None'})`;
      }
      
      // 3. If details string is directly available
      if (meta.details) return meta.details;
      if (meta.message) return meta.message;
      
      // 4. Empty objects/special actions with friendly names
      const act = log.action.toUpperCase();
      const entityStr = log.entityType && log.entityId ? `${log.entityType} #${log.entityId}` : '';
      
      if (act === 'EXPENSE_PERMANENTLY_DELETED') return `Permanently deleted expense ${entityStr || 'record'}`;
      if (act === 'PRESCRIPTION_PERMANENTLY_DELETED') return `Permanently deleted prescription ${entityStr || 'record'}`;
      if (act === 'APPOINTMENT_PERMANENTLY_DELETED') return `Permanently deleted appointment ${entityStr || 'record'}`;
      if (act === 'PATIENT_PERMANENTLY_DELETED') return `Permanently deleted patient file ${entityStr || ''}`;
      if (act === 'PATIENT_RESTORED') return `Restored patient file ${entityStr || ''}`;
      if (act === 'USER_PASSWORD_RESET') return `Reset user account password ${log.entityId ? `for user #${log.entityId}` : ''}`;
      if (act === 'USER_ROLE_CHANGED') return `Updated user role privileges ${log.entityId ? `for user #${log.entityId}` : ''}`;
      if (act === 'BACKUP_TRIGGERED') return `Triggered manual database snapshot backup`;
      
      // 5. Fallback JSON representation if it contains custom fields
      if (Object.keys(meta).length > 0) {
        return JSON.stringify(meta);
      }
      
      // 6. Generic action fallback
      return `${log.action.replace(/_/g, ' ')} ${entityStr}`.trim();
    } catch (e) {
      return String(log.metadata) || log.action.replace(/_/g, ' ');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75 bg-clip-text text-transparent">Activity Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total?.toLocaleString() || 0} total logs registered</p>
        </div>
        
        {/* Premium Export Buttons Group */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportXLSX} 
            disabled={isExportingXLSX || isLoading}
            className="h-9 gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 border-emerald-500/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all shadow-sm"
          >
            <FileSpreadsheet className={`h-4 w-4 ${isExportingXLSX ? 'animate-pulse' : ''}`} />
            Export Excel
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF} 
            disabled={isExportingPDF || isLoading}
            className="h-9 gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 border-rose-500/20 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all shadow-sm"
          >
            <FileText className={`h-4 w-4 ${isExportingPDF ? 'animate-pulse' : ''}`} />
            Export PDF
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()} 
            disabled={isFetching || isLoading}
            className="h-9 gap-2 text-xs shadow-sm"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm backdrop-blur-sm bg-card/60">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/75" />
              <Input 
                placeholder="Search by actor, action, scope, details or patient..." 
                className="pl-9 h-10 bg-background/50 focus-visible:ring-1 focus-visible:ring-primary/30" 
                value={search} 
                onChange={e => { setSearch(e.target.value); setPage(1); }} 
              />
            </div>
            
            <Select value={action} onValueChange={v => { setAction(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background/50">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {filters?.actions?.map(a => (
                  <SelectItem key={a} value={a}>
                    {a.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={entityType} onValueChange={v => { setEntityType(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background/50">
                <SelectValue placeholder="All scopes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All scopes</SelectItem>
                {filters?.entityTypes?.map(e => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(10)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
          ) : !data?.logs?.length ? (
            <div className="py-20 text-center text-muted-foreground">
              <ScrollText className="mx-auto h-16 w-16 opacity-10 mb-4 text-primary" />
              <h3 className="font-semibold text-foreground text-lg mb-1">No logs found</h3>
              <p className="text-sm max-w-xs mx-auto">Try adjusting your filters or search terms to find what you are looking for.</p>
            </div>
          ) : (
            <>
              {/* Mobile List View */}
              <div className="space-y-3 md:hidden">
                {data.logs.map(log => (
                  <div key={log.id} className="rounded-xl border border-border/50 bg-background/30 p-4 space-y-2 shadow-xs transition-colors hover:bg-muted/10">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-muted-foreground/80 font-medium font-mono">
                        {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        {log.actorName || 'System'}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-normal capitalize">
                          {log.actorRole || 'user'}
                        </span>
                      </p>
                      {log.entityType && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Scope: <span className="font-medium text-foreground/85">{log.entityType} {log.entityId && `#${log.entityId}`}</span>
                        </p>
                      )}
                    </div>
                    <div className="pt-1.5 border-t border-border/30 text-xs text-muted-foreground bg-muted/20 rounded-md p-2.5 flex gap-1.5 items-start">
                      <Info className="h-3.5 w-3.5 mt-0.5 text-primary/65 flex-shrink-0" />
                      <p className="leading-relaxed text-foreground/90 font-medium">{renderDetails(log)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-hidden rounded-xl border border-border/50 bg-background/25">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[170px] font-semibold">Timestamp</TableHead>
                      <TableHead className="w-[150px] font-semibold">Actor</TableHead>
                      <TableHead className="w-[240px] font-semibold">Action</TableHead>
                      <TableHead className="w-[130px] font-semibold">Scope</TableHead>
                      <TableHead className="font-semibold">Details</TableHead>
                      <TableHead className="w-[120px] font-semibold">IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.logs.map(log => (
                      <TableRow key={log.id} className="hover:bg-muted/15 transition-colors group">
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground">{log.actorName || 'System'}</span>
                            <span className="text-[10px] text-muted-foreground capitalize font-medium">{log.actorRole || 'user'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${getActionColor(log.action)}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground/80">
                          {log.entityType ? (
                            <span>{log.entityType} <span className="text-muted-foreground/60 font-normal">{log.entityId ? `#${log.entityId.substring(0, 8)}` : ''}</span></span>
                          ) : (
                            <span className="text-muted-foreground/45">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-foreground/90 font-medium group-hover:text-foreground transition-colors max-w-[320px] leading-relaxed break-words py-3">
                          {renderDetails(log)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {log.ipAddress || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-5">
                  <p className="text-xs text-muted-foreground font-medium">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page <= 1} 
                      onClick={() => setPage(p => p - 1)}
                      className="h-8 text-xs font-semibold px-3"
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={page >= totalPages} 
                      onClick={() => setPage(p => p + 1)}
                      className="h-8 text-xs font-semibold px-3"
                    >
                      Next
                    </Button>
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
