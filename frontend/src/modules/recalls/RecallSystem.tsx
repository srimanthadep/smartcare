import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/shared/contexts/SocketContext";
import { api } from '@/shared/lib/api';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  MessageSquare,
  Phone,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import StatsCard from "@/shared/components/StatsCard";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

type RecallEntry = {
  id: string;
  patientId: string;
  patientName: string;
  lastVisit: string;
  recallDate: string;
  status: "Due" | "Overdue" | "Scheduled" | "Completed";
  type: string;
  notes?: string;
};



const statusTone: Record<RecallEntry["status"], string> = {
  Due: "bg-warning/10 text-warning border-warning/20",
  Overdue: "bg-destructive/10 text-destructive border-destructive/20",
  Scheduled: "bg-info/10 text-info border-info/20",
  Completed: "bg-success/10 text-success border-success/20",
};

const RecallSystem: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: serverRecalls } = useQuery({
    queryKey: ["recalls"],
    queryFn: () => api.getRecalls().catch(() => [])
  });
  
  const recalls = serverRecalls || [];

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RecallEntry["status"]>("all");

  useEffect(() => {
    document.title = "Recall System · Siara Dental";
  }, []);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    
    const handleUpdate = (data: any) => {
      // Refetch if specifically a recall update, or if generic
      if (data?.updateType === 'RECALL' || !data?.updateType) {
        queryClient.invalidateQueries({ queryKey: ["recalls"] });
      }
    };

    socket.on('PATIENT_UPDATED', handleUpdate);
    socket.on('PRESCRIPTION_UPDATED', () => queryClient.invalidateQueries({ queryKey: ["recalls"] }));

    return () => {
      socket.off('PATIENT_UPDATED', handleUpdate);
      socket.off('PRESCRIPTION_UPDATED');
    };
  }, [socket, queryClient]);

  const filtered = useMemo(() => {
    return recalls
      .filter((item) => (statusFilter === "all" ? true : item.status === statusFilter))
      .filter((item) =>
        item.patientName.toLowerCase().includes(query.toLowerCase())
      );
  }, [recalls, query, statusFilter]);

  const stats = useMemo(
    () => ({
      total: recalls.length,
      overdue: recalls.filter((item) => item.status === "Overdue").length,
      due: recalls.filter((item) => item.status === "Due").length,
      scheduled: recalls.filter((item) => item.status === "Scheduled").length,
    }),
    [recalls]
  );

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: any }) => api.updateRecall(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recalls"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteRecall(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recalls"] });
      toast.success("Recall deleted successfully");
    }
  });

  const markScheduled = (id: string) => {
    updateMutation.mutate({ id, payload: { status: "Scheduled" } });
    toast.success("Recall scheduled and ready for booking");
  };

  const markCompleted = (id: string) => {
    updateMutation.mutate({ id, payload: { status: "Completed" } });
    toast.success("Recall marked complete");
  };

  const deleteRecall = (id: string) => {
    if (confirm("Are you sure you want to delete this recall?")) {
      deleteMutation.mutate(id);
    }
  };

  const sendReminder = (name: string, channel: "SMS" | "WhatsApp") => {
    toast.success(`${channel} reminder sent to ${name}`);
  };

  return (
    <motion.div
      className="luxury-page space-y-5"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <section className="luxury-panel p-6 sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="luxury-subtitle mb-2">Follow-up desk</p>
            <h1 className="luxury-title text-4xl font-semibold sm:text-5xl">
              Recalls, overdue reviews and patient reminders
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Keep six-month reviews, post-procedure follow-ups and overdue patient outreach visible in one structured workspace.
            </p>
          </div>

          <div className="flex w-full max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search patients..."
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Total Recalls"
          value={String(stats.total)}
          change="All tracked recalls"
          changeType="neutral"
          icon={CalendarClock}
        />
        <StatsCard
          title="Overdue"
          value={String(stats.overdue)}
          change="Action needed"
          changeType={stats.overdue > 0 ? "negative" : "positive"}
          icon={AlertTriangle}
        />
        <StatsCard
          title="Coming Due"
          value={String(stats.due)}
          change="Upcoming"
          changeType="neutral"
          icon={CalendarClock}
        />
        <StatsCard
          title="Scheduled"
          value={String(stats.scheduled)}
          change="Appointment booked"
          changeType="positive"
          icon={CheckCircle2}
        />
      </section>

      <Card className="luxury-card">
        <CardHeader className="gap-4">
          <CardTitle className="text-2xl">Recall queue</CardTitle>
          <div className="flex flex-wrap gap-2">
            {["all", "Overdue", "Due", "Scheduled", "Completed"].map((value) => (
              <Button
                key={value}
                size="sm"
                variant={statusFilter === value ? "default" : "outline"}
                onClick={() => setStatusFilter(value as any)}
              >
                {value === "all" ? "All" : value}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="space-y-3 p-3 md:hidden">
            {filtered.map((item) => (
              <Card key={item.id} className="border-border/50">
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{item.patientName}</p>
                    <Badge variant="outline" className="text-xs">{item.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Recall: {item.recallDate}</p>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone[item.status]}`}>{item.status}</span>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => sendReminder(item.patientName, "SMS")}>SMS</Button>
                    <Button size="sm" variant="outline" onClick={() => sendReminder(item.patientName, "WhatsApp")}>WhatsApp</Button>
                    {(item.status === "Due" || item.status === "Overdue") ? <Button size="sm" onClick={() => markScheduled(item.id)}>Book</Button> : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader className="bg-secondary/15">
                <TableRow>
                  <TableHead className="whitespace-nowrap">Patient</TableHead>
                  <TableHead className="whitespace-nowrap">Type</TableHead>
                  <TableHead className="whitespace-nowrap">Last Visit</TableHead>
                  <TableHead className="whitespace-nowrap">Recall Date</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No recalls match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-secondary/10">
                      <TableCell>
                        <p className="font-medium text-foreground">{item.patientName}</p>
                        <p className="text-xs text-muted-foreground">{item.patientId}</p>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.type}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {item.lastVisit}
                      </TableCell>

                      <TableCell className="text-sm font-medium text-foreground">
                        {item.recallDate}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone[item.status]}`}
                        >
                          {item.status}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {item.status !== "Completed" ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => sendReminder(item.patientName, "SMS")}
                                title="Send SMS reminder"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => sendReminder(item.patientName, "WhatsApp")}
                                title="Send WhatsApp reminder"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : null}

                          {(item.status === "Due" || item.status === "Overdue") ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markScheduled(item.id)}
                            >
                              Book
                            </Button>
                          ) : null}

                          {item.status === "Scheduled" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markCompleted(item.id)}
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Done
                            </Button>
                          ) : null}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteRecall(item.id)}
                            title="Delete recall"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
