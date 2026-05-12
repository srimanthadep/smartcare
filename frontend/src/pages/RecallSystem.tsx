import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  MessageSquare,
  Phone,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import StatsCard from "@/components/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const STORAGE_KEY = "siara-recalls";

const initialRecalls: RecallEntry[] = [
  {
    id: "RC001",
    patientId: "P001",
    patientName: "Aarav Sharma",
    lastVisit: "2026-03-15",
    recallDate: "2026-09-15",
    status: "Due",
    type: "Routine Checkup",
  },
  {
    id: "RC002",
    patientId: "P002",
    patientName: "Priya Patel",
    lastVisit: "2026-03-17",
    recallDate: "2026-04-17",
    status: "Due",
    type: "Orthodontic Review",
    notes: "Monthly adjustment needed",
  },
  {
    id: "RC003",
    patientId: "P003",
    patientName: "Rahul Verma",
    lastVisit: "2026-03-18",
    recallDate: "2026-04-01",
    status: "Overdue",
    type: "Post-Procedure",
    notes: "Post RCT follow-up for 46",
  },
  {
    id: "RC004",
    patientId: "P004",
    patientName: "Sneha Gupta",
    lastVisit: "2026-03-10",
    recallDate: "2026-09-10",
    status: "Scheduled",
    type: "Routine Checkup",
  },
  {
    id: "RC005",
    patientId: "P005",
    patientName: "Vikram Singh",
    lastVisit: "2026-01-20",
    recallDate: "2026-03-20",
    status: "Overdue",
    type: "Periodontal",
    notes: "Denture review periodontal probing",
  },
  {
    id: "RC006",
    patientId: "P006",
    patientName: "Meera Reddy",
    lastVisit: "2026-03-16",
    recallDate: "2026-06-16",
    status: "Due",
    type: "Routine Checkup",
  },
];

const statusTone: Record<RecallEntry["status"], string> = {
  Due: "bg-warning/10 text-warning border-warning/20",
  Overdue: "bg-destructive/10 text-destructive border-destructive/20",
  Scheduled: "bg-info/10 text-info border-info/20",
  Completed: "bg-success/10 text-success border-success/20",
};

function loadRecalls(): RecallEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : initialRecalls;
  } catch {
    return initialRecalls;
  }
}

const RecallSystem: React.FC = () => {
  const [recalls, setRecalls] = useState<RecallEntry[]>(loadRecalls);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RecallEntry["status"]>("all");

  useEffect(() => {
    document.title = "Recall System · Siara Dental";
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recalls));
  }, [recalls]);

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

  const markScheduled = (id: string) => {
    setRecalls((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: "Scheduled" } : item
      )
    );
    toast.success("Recall scheduled and ready for booking");
  };

  const markCompleted = (id: string) => {
    setRecalls((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: "Completed" } : item
      )
    );
    toast.success("Recall marked complete");
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
          <div className="overflow-x-auto">
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