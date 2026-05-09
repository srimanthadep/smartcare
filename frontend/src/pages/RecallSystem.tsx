import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarClock, Phone, MessageSquare, CheckCircle2, AlertTriangle } from 'lucide-react';
import { RecallEntry } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import StatsCard from '@/components/StatsCard';
import { toast } from 'sonner';

const STORAGE_KEY = 'siara_recalls';

const initialRecalls: RecallEntry[] = [
  { id: 'RC001', patientId: 'P001', patientName: 'Aarav Sharma', lastVisit: '2026-03-15', recallDate: '2026-09-15', status: 'Due', type: 'Routine Checkup' },
  { id: 'RC002', patientId: 'P002', patientName: 'Priya Patel', lastVisit: '2026-03-17', recallDate: '2026-04-17', status: 'Due', type: 'Orthodontic Review', notes: 'Monthly adjustment needed' },
  { id: 'RC003', patientId: 'P003', patientName: 'Rahul Verma', lastVisit: '2026-03-18', recallDate: '2026-04-01', status: 'Overdue', type: 'Post-Procedure', notes: 'Post RCT follow-up for #46' },
  { id: 'RC004', patientId: 'P004', patientName: 'Sneha Gupta', lastVisit: '2026-03-10', recallDate: '2026-09-10', status: 'Scheduled', type: 'Routine Checkup' },
  { id: 'RC005', patientId: 'P005', patientName: 'Vikram Singh', lastVisit: '2026-01-20', recallDate: '2026-03-20', status: 'Overdue', type: 'Periodontal', notes: 'Denture review + periodontal probing' },
  { id: 'RC006', patientId: 'P006', patientName: 'Meera Reddy', lastVisit: '2026-03-16', recallDate: '2026-06-16', status: 'Due', type: 'Routine Checkup' },
];

function loadRecalls(): RecallEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as RecallEntry[];
  } catch {
    // ignore parse errors
  }
  return initialRecalls;
}

function saveRecalls(recalls: RecallEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recalls));
  } catch {
    // ignore storage errors
  }
}

const statusColors: Record<string, string> = {
  Due: 'bg-warning/10 text-warning border-warning/20',
  Overdue: 'bg-destructive/10 text-destructive border-destructive/20',
  Scheduled: 'bg-info/10 text-info border-info/20',
  Completed: 'bg-success/10 text-success border-success/20',
};

const RecallSystem: React.FC = () => {
  const [recalls, setRecalls] = useState<RecallEntry[]>(loadRecalls);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    document.title = 'Recalls | Siara Dental';
  }, []);

  // Persist to localStorage whenever recalls change
  useEffect(() => {
    saveRecalls(recalls);
  }, [recalls]);

  const filtered = useMemo(() => {
    return recalls
      .filter((r) => statusFilter === 'all' || r.status === statusFilter)
      .filter((r) => r.patientName.toLowerCase().includes(query.toLowerCase()));
  }, [recalls, query, statusFilter]);

  const stats = useMemo(() => ({
    total: recalls.length,
    overdue: recalls.filter((r) => r.status === 'Overdue').length,
    due: recalls.filter((r) => r.status === 'Due').length,
    scheduled: recalls.filter((r) => r.status === 'Scheduled').length,
  }), [recalls]);

  const markScheduled = (id: string) => {
    setRecalls((prev) => prev.map((r) => r.id === id ? { ...r, status: 'Scheduled' as const } : r));
    toast.success('Recall scheduled — appointment booked');
  };

  const markCompleted = (id: string) => {
    setRecalls((prev) => prev.map((r) => r.id === id ? { ...r, status: 'Completed' as const } : r));
    toast.success('Recall marked complete');
  };

  const sendReminder = (name: string, channel: string) => {
    toast.success(`${channel} reminder sent to ${name}`);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold">Recall System</h1>
        <p className="text-sm text-muted-foreground">6-month recalls, overdue follow-ups, and reminder management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatsCard title="Total Recalls" value={stats.total} change="All patients" changeType="neutral" icon={CalendarClock} />
        <StatsCard title="Overdue" value={stats.overdue} change="Action needed" changeType={stats.overdue > 0 ? 'negative' : 'positive'} icon={AlertTriangle} />
        <StatsCard title="Coming Due" value={stats.due} change="Upcoming" changeType="neutral" icon={CalendarClock} />
        <StatsCard title="Scheduled" value={stats.scheduled} change="Appointment booked" changeType="positive" icon={CheckCircle2} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patients..." className="sm:max-w-xs" />
        <div className="flex gap-2 flex-wrap">
          {['all', 'Overdue', 'Due', 'Scheduled', 'Completed'].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead>Recall Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium">{r.patientName}</p>
                      <p className="text-xs text-muted-foreground">{r.patientId}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{r.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.lastVisit}</TableCell>
                    <TableCell className="text-sm font-medium">{r.recallDate}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[r.status] || ''}`}>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.status !== 'Completed' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => sendReminder(r.patientName, 'SMS')} title="Send SMS reminder">
                              <Phone className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => sendReminder(r.patientName, 'WhatsApp')} title="Send WhatsApp reminder">
                              <MessageSquare className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {(r.status === 'Due' || r.status === 'Overdue') && (
                          <Button size="sm" variant="outline" onClick={() => markScheduled(r.id)}>Book</Button>
                        )}
                        {r.status === 'Scheduled' && (
                          <Button size="sm" variant="outline" onClick={() => markCompleted(r.id)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />Done
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                      No recalls matching your filters
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RecallSystem;
