import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  CreditCard,
  FileText,
  Search,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { safeLocalStorageParse } from "@/lib/storage";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type NoticeKind = "patient" | "billing" | "prescription" | "system";
type Notice = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  kind: NoticeKind;
  actionLabel?: string;
  actionPath?: string;
};

const STORAGE_KEY = "siara-notifications-v1";

const seedNotifications: Notice[] = [
  {
    id: "NTF-001",
    title: "Upcoming chair load",
    body: "Three appointments are scheduled in the next two hours.",
    time: "2 min ago",
    read: false,
    kind: "system",
    actionLabel: "Open appointments",
    actionPath: "/appointments",
  },
  {
    id: "NTF-002",
    title: "Pending invoice follow-up",
    body: "Two invoices still show as pending and may need collection follow-up.",
    time: "18 min ago",
    read: false,
    kind: "billing",
    actionLabel: "Open billing",
    actionPath: "/billing",
  },
  {
    id: "NTF-003",
    title: "Prescription shared",
    body: "A recent prescription was sent successfully through communication channels.",
    time: "42 min ago",
    read: true,
    kind: "prescription",
    actionLabel: "Open prescriptions",
    actionPath: "/prescriptions",
  },
  {
    id: "NTF-004",
    title: "Patient activity updated",
    body: "A patient profile was recently edited and synced into the record system.",
    time: "1 hr ago",
    read: true,
    kind: "patient",
    actionLabel: "Open patients",
    actionPath: "/patients",
  },
];

const toneMap: Record<NoticeKind, string> = {
  patient:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-300 dark:border-sky-900/40",
  billing:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/40",
  prescription:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/40",
  system:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-300 dark:border-violet-900/40",
};

const iconMap: Record<NoticeKind, React.ReactNode> = {
  patient: <Users className="h-4 w-4" />,
  billing: <CreditCard className="h-4 w-4" />,
  prescription: <FileText className="h-4 w-4" />,
  system: <ShieldAlert className="h-4 w-4" />,
};

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notice[]>(seedNotifications);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | NoticeKind>("all");

  useEffect(() => {
    document.title = "Notifications · Siara Dental";
    
    const fetchLogs = async () => {
      try {
        const logs = await api.getActivityLogs();
        const mapped: Notice[] = logs.map(log => {
          let kind: NoticeKind = "system";
          if (log.entityType === 'patient') kind = 'patient';
          if (log.entityType === 'invoice') kind = 'billing';
          if (log.entityType === 'prescription') kind = 'prescription';
          
          return {
            id: log.id,
            title: `${log.action} - ${log.entityType}`,
            body: log.details || `Activity recorded by ${log.userName}`,
            time: formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }),
            read: false,
            kind,
            actionLabel: 'View',
            actionPath: `/${log.entityType}s`
          };
        });
        setNotifications(mapped);
      } catch (e) {
        console.error("Failed to load notifications", e);
        // Fallback to seed if network fails
        setNotifications(safeLocalStorageParse<Notice[]>(STORAGE_KEY, seedNotifications));
      }
    };
    
    fetchLogs();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const filtered = useMemo(() => {
    return notifications.filter((item) => {
      const matchesText =
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.body.toLowerCase().includes(query.toLowerCase());

      const matchesFilter =
        filter === "all"
          ? true
          : filter === "unread"
            ? !item.read
            : item.kind === filter;

      return matchesText && matchesFilter;
    });
  }, [notifications, query, filter]);

  const stats = useMemo(
    () => ({
      total: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      system: notifications.filter((n) => n.kind === "system").length,
      actionable: notifications.filter((n) => !!n.actionPath).length,
    }),
    [notifications]
  );

  const markRead = (id: string) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  const markAllRead = () => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  };

  const removeOne = (id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  };

  const clearRead = () => {
    setNotifications((current) => current.filter((item) => !item.read));
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
            <p className="luxury-subtitle mb-2">Activity inbox</p>
            <h1 className="luxury-title text-4xl font-semibold sm:text-5xl">
              Notifications and clinic signals
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Track operational alerts, billing prompts, prescription events, and system notices in one premium feed.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={clearRead}>
              <Trash2 className="h-4 w-4" />
              Clear read
            </Button>
            <Button onClick={markAllRead}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "Total", value: stats.total, icon: <Bell className="h-4 w-4" /> },
            { label: "Unread", value: stats.unread, icon: <CheckCheck className="h-4 w-4" /> },
            { label: "System", value: stats.system, icon: <ShieldAlert className="h-4 w-4" /> },
            {
              label: "Actionable",
              value: stats.actionable,
              icon: <CalendarDays className="h-4 w-4" />,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[24px] border border-white/60 bg-white/75 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {item.label}
                </p>
                <div className="text-primary">{item.icon}</div>
              </div>
              <p className="mt-3 text-2xl font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="luxury-card">
          <CardHeader>
            <CardTitle className="text-2xl">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notices"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {["all", "unread", "patient", "billing", "prescription", "system"].map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={filter === value ? "default" : "outline"}
                  onClick={() => setFilter(value as any)}
                >
                  {value === "all"
                    ? "All"
                    : value === "unread"
                      ? "Unread"
                      : value.charAt(0).toUpperCase() + value.slice(1)}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Recent updates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AnimatePresence initial={false}>
              {filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-[24px] bg-secondary/15 p-8 text-center text-sm text-muted-foreground"
                >
                  No notifications match the current filters.
                </motion.div>
              ) : (
                filtered.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`rounded-[24px] border p-4 shadow-sm transition-all ${item.read
                        ? "border-border/60 bg-white/75"
                        : "border-primary/20 bg-primary/5"
                      }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`border ${toneMap[item.kind]}`}>
                            <span className="mr-1 inline-flex">{iconMap[item.kind]}</span>
                            {item.kind}
                          </Badge>

                          {!item.read ? (
                            <Badge className="bg-primary text-primary-foreground">Unread</Badge>
                          ) : null}

                          <span className="text-xs text-muted-foreground">{item.time}</span>
                        </div>

                        <p className="mt-3 text-base font-semibold text-foreground">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {item.body}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!item.read ? (
                          <Button size="sm" variant="outline" onClick={() => markRead(item.id)}>
                            Mark read
                          </Button>
                        ) : null}

                        {item.actionPath ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              markRead(item.id);
                              navigate(item.actionPath!);
                            }}
                          >
                            {item.actionLabel || "Open"}
                          </Button>
                        ) : null}

                        <Button size="sm" variant="ghost" onClick={() => removeOne(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </section>
    </motion.div>
  );
};

export default Notifications;