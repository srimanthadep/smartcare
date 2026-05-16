import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Clock, MoreHorizontal, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from '@/shared/lib/api';
import { Button } from "@/shared/ui/button";
import { Calendar } from "@/shared/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import StatusBadge from "@/shared/components/StatusBadge";

const STATUS_ORDER = ["Waiting", "In Triage", "In Chair", "X-Ray", "Billing", "Completed"] as const;

const PROCEDURE_TYPES = ["Checkup", "Root Canal", "Extraction", "Orthodontics", "Cosmetic", "Consultation", "Prosthodontics", "Filling", "Emergency", "Follow-up"] as const;

const Appointments: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [searchParams, setSearchParams] = useSearchParams();
  const [isBookOpen, setIsBookOpen] = useState(false);
  const selectedIso = format(selectedDay, "yyyy-MM-dd");
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "Appointments | Siara Dental";

    if (searchParams.get("book") === "true") {
      setIsBookOpen(true);
    }
  }, [searchParams]);

  const bootstrapQuery = useQuery({
    queryKey: ["bootstrap"],
    queryFn: api.getBootstrap,
  });

  const patientsQuery = useQuery({
    queryKey: ["patients", "appointment-options"],
    queryFn: () => api.getPatients({ limit: 1000 }), // Increased limit for appointment selector
  });

  const appointmentsQuery = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api.getAppointments(),
  });

  const createAppointment = useMutation({
    mutationFn: api.createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Appointment booked");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to create appointment");
    },
  });

  const updateAppointment = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, string> }) => api.updateAppointment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to update appointment");
    },
  });

  const appointments = appointmentsQuery.data || [];
  const bootstrap = bootstrapQuery.data;

  const filteredAppointments = useMemo(
    () => appointments.filter((item) => (typeFilter === "all" ? true : item.type === typeFilter)),
    [appointments, typeFilter],
  );

  const dayAppointments = useMemo(
    () => filteredAppointments.filter((item) => item.date === selectedIso).sort((left, right) => left.time.localeCompare(right.time)),
    [filteredAppointments, selectedIso],
  );

  const upcoming = useMemo(
    () => filteredAppointments.filter((item) => item.date >= todayIso).sort((left, right) => `${left.date}${left.time}`.localeCompare(`${right.date}${right.time}`)),
    [filteredAppointments, todayIso],
  );
  const dateStrip = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, index) => {
        const next = new Date();
        next.setDate(next.getDate() + index);
        return next;
      }),
    [],
  );



  const AppointmentRow = ({ appointment }: { appointment: typeof appointments[number] }) => (
    <div className="flex flex-col justify-between gap-2 rounded-lg border border-border/50 bg-secondary/30 p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">{appointment.patientName}</p>
          <p className="text-xs text-muted-foreground">{appointment.date} · {appointment.time} · {appointment.doctorName}</p>
          {appointment.reason && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{appointment.reason}</p>}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2 sm:ml-0">
        <StatusBadge status={appointment.type} />
        <StatusBadge status={appointment.status} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => updateAppointment.mutate({ id: appointment.id, payload: { status: "Completed" } })}>
              Mark completed
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateAppointment.mutate({ id: appointment.id, payload: { status: "Cancelled" } })}>
              Cancel appointment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const BookDialog = () => {
    const [patientId, setPatientId] = useState(searchParams.get("patientId") || "");
    const [doctorName, setDoctorName] = useState(bootstrap?.doctors[0]?.name || "");
    const [date, setDate] = useState(selectedIso);
    const [time, setTime] = useState("10:30");
    const [mode, setMode] = useState<string>("Checkup");
    const [reason, setReason] = useState("Routine dental checkup");

    const patientOptions = patientsQuery.data?.patients || [];
    const selectedPatient = patientOptions.find((item: any) => item.id === patientId);

    return (
      <Dialog open={isBookOpen} onOpenChange={(open) => {
        setIsBookOpen(open);
        if (!open) {
          // Clear search params when closing
          const newParams = new URLSearchParams(searchParams);
          newParams.delete("book");
          newParams.delete("patientId");
          setSearchParams(newParams);
        }
      }}>
        <DialogTrigger asChild>
          <Button onClick={() => setIsBookOpen(true)} className="hidden md:inline-flex"><CalendarPlus className="mr-1 h-4 w-4" /> Book</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Book appointment</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground sr-only">Schedule a new dental appointment for a patient.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  {patientOptions.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>{patient.name} ({patient.id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Doctor</Label>
                <Select value={doctorName} onValueChange={setDoctorName}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(bootstrap?.doctors || []).map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.name}>{doctor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Procedure Type</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROCEDURE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  if (!selectedPatient) {
                    toast.error("Select a patient");
                    return;
                  }
                  createAppointment.mutate({
                    patientId,
                    patientName: selectedPatient.name,
                    doctorName,
                    date,
                    time,
                    type: mode as any,
                    status: "Scheduled",
                    reason,
                  });
                }}
                disabled={createAppointment.isPending}
              >
                {createAppointment.isPending ? "Booking..." : "Confirm booking"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (appointmentsQuery.isLoading || bootstrapQuery.isLoading || patientsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-72" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (appointmentsQuery.isError || bootstrapQuery.isError || !bootstrap) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="py-4 text-sm text-destructive">
          Failed to load appointments data.
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Appointments</h1>
          <p className="text-sm text-muted-foreground">Scheduling, availability and queue management</p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={typeFilter} onValueChange={(value) => setTypeFilter(value || "all")}>
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="Checkup">Checkup</ToggleGroupItem>
            <ToggleGroupItem value="Root Canal">Root Canal</ToggleGroupItem>
            <ToggleGroupItem value="Orthodontics">Ortho</ToggleGroupItem>
          </ToggleGroup>
          <BookDialog />
        </div>
      </div>

      <div className="md:hidden">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {dateStrip.map((day) => {
            const iso = format(day, "yyyy-MM-dd");
            const active = iso === selectedIso;
            return (
              <button
                key={iso}
                onClick={() => setSelectedDay(day)}
                className={`min-w-[70px] rounded-lg border px-2 py-2 text-center ${
                  active ? "border-primary bg-primary/10 text-primary" : "border-border/50"
                }`}
              >
                <p className="text-[10px] uppercase">{format(day, "EEE")}</p>
                <p className="text-sm font-semibold">{format(day, "d")}</p>
              </button>
            );
          })}
        </div>
        <div className="mt-3 space-y-3">
          {dayAppointments.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-4 text-sm text-muted-foreground">No appointments on this day</CardContent>
            </Card>
          ) : (
            dayAppointments.map((appointment) => (
              <Card key={appointment.id} className="border-border/50">
                <CardContent className="space-y-2 p-3">
                  <p className="font-medium">{appointment.patientName}</p>
                  <p className="text-xs text-muted-foreground">{appointment.time} · {appointment.doctorName}</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={appointment.type} />
                    <StatusBadge status={appointment.status} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 hidden space-y-4 md:block">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading">Pick a day</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar mode="single" selected={selectedDay} onSelect={(value) => value && setSelectedDay(value)} className="rounded-md border border-border/50" />
              <p className="mt-3 text-xs text-muted-foreground">Selected: <span className="font-medium text-foreground">{selectedIso}</span></p>
            </CardContent>
          </Card>

          <Card className="border-border/50 xl:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading">Day schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dayAppointments.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">No appointments on this day</div>
              ) : (
                dayAppointments.map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} />)
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">No upcoming appointments</div>
            ) : (
              upcoming.slice(0, 10).map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} />)
            )}
          </CardContent>
        </Card>
      </div>

      <Button size="icon" className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg md:hidden" onClick={() => setIsBookOpen(true)}>
        <CalendarPlus className="h-5 w-5" />
      </Button>

    </motion.div>
  );
};

export default Appointments;
