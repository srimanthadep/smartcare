import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from '@/shared/hooks/useDebounce';
import {
  Mail,
  Phone,
  Search,
  UserPlus,
  Edit,
  Trash2,
  MoreHorizontal,
  FilePlus,
  Receipt,
  ClipboardList,
  User,
  Filter,
  X,
  FileDown,
  Download,
  Calendar,
  Clock,
  Droplet
} from "lucide-react";
import { exportService } from '@/shared/lib/exportService';
import { api } from '@/shared/lib/api';
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/shared/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import StatusBadge from "@/shared/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/shared/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";

const PatientList: React.FC = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);

  // Dynamic soft gradient avatar generator
  const getAvatarGradient = (name: string) => {
    const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      "from-blue-500/10 to-sky-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
      "from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
      "from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
      "from-orange-500/10 to-amber-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
      "from-indigo-500/10 to-violet-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
    ];
    return gradients[hash % gradients.length];
  };

  // Professional gender coloring style
  const getGenderStyle = (gender: string) => {
    const lower = gender?.toLowerCase() || "";
    if (lower === "male") return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20";
    if (lower === "female") return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20";
    return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20";
  };

  const handleExport = async (patientId: string, format: 'pdf' | 'excel') => {
    const toastId = toast.loading(`Gathering records & generating ${format.toUpperCase()}...`);
    try {
      const [fullData, chart, invoices, px] = await Promise.all([
        api.getPatient(patientId),
        api.getDentalChart(patientId).catch(() => ({ teeth: [] })),
        api.getInvoices(patientId).catch(() => []),
        api.getPrescriptions(patientId).catch(() => [])
      ]);

      if (format === 'pdf') {
        exportService.exportPatientToPDF(fullData.patient, chart.teeth || [], invoices, px, fullData.diagnoses || []);
      } else {
        exportService.exportPatientToExcel(fullData.patient, chart.teeth || [], invoices, px, fullData.diagnoses || []);
      }
      toast.success(`${format.toUpperCase()} Exported Successfully!`, { id: toastId });
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Failed to export ${format.toUpperCase()}`, { id: toastId });
    }
  };

  const handleBulkExport = async (format: 'pdf' | 'excel') => {
    const toastId = toast.loading(`Gathering records & generating Bulk ${format.toUpperCase()} export...`);
    try {
      const chunkArray = (arr: any[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
          arr.slice(i * size, i * size + size));

      const [allInvoices, allPx] = await Promise.all([
        api.getInvoices().catch(() => []),
        api.getPrescriptions().catch(() => [])
      ]);

      const allResults = [];
      for (const batch of chunkArray(data, 5)) {
        const batchResults = await Promise.all(
          batch.map(p => Promise.all([
            api.getPatient(p.id).catch(() => ({ patient: p, diagnoses: [] })),
            api.getDentalChart(p.id).catch(() => ({ teeth: [] }))
          ]))
        );
        allResults.push(...batchResults);
      }

      const bulkData = allResults.map(([fp, chart]: any) => ({
        patient: fp.patient,
        diagnoses: fp.diagnoses || [],
        dentalChart: chart.teeth || [],
        invoices: allInvoices.filter((i: any) => i.patientId === fp.patient.id),
        prescriptions: allPx.filter((p: any) => p.patientId === fp.patient.id)
      }));

      if (format === 'pdf') {
        await exportService.exportAllPatientsToPDF(bulkData);
      } else {
        exportService.exportAllPatientsToExcel(bulkData);
      }
      toast.success(`Bulk ${format.toUpperCase()} Exported Successfully!`, { id: toastId });
    } catch (error) {
      console.error("Bulk export error:", error);
      toast.error(`Failed to generate bulk ${format.toUpperCase()}`, { id: toastId });
    }
  };

  const pageSize = 25;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    document.title = "Patients | Siara Dental";
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, genderFilter, from, to]);

  const { data: queryData, isLoading, isError, error } = useQuery({
    queryKey: ["patients", debouncedSearch, statusFilter, genderFilter, from, to, page],
    queryFn: () =>
      api.getPatients({
        search: debouncedSearch,
        status: statusFilter,
        gender: genderFilter,
        from,
        to,
        page,
        limit: pageSize,
      }),
  });

  const data = queryData?.patients ?? [];
  const serverTotal = queryData?.total ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Patient deleted successfully");
      setPatientToDelete(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete patient");
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
      return api.updatePatient(id, { status: nextStatus });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      const nextStatus = variables.currentStatus === "Active" ? "Inactive" : "Active";
      toast.success(`Patient status updated to ${nextStatus}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  });

  const totalPages = Math.max(1, Math.ceil(serverTotal / pageSize));
  const pageItems = data; // Already paginated from server

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setGenderFilter("all");
    setFrom("");
    setTo("");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>

        <Card className="border-border/40">
          <CardContent className="p-4">
            <Skeleton className="h-11 w-full" />
          </CardContent>
        </Card>

        <Card className="border-border/40 overflow-hidden">
          <div className="p-0">
            <div className="bg-muted/40 p-4 border-b">
              <div className="grid grid-cols-6 gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24 ml-auto" />
                <Skeleton className="h-4 w-10 ml-auto" />
              </div>
            </div>
            <div className="divide-y">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-4 grid grid-cols-6 gap-4 items-center">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="flex gap-1">
                    <Skeleton className="h-5 w-8" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <div className="text-right space-y-1 ml-auto">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 md:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-3 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-heading font-bold text-foreground md:text-3xl">Patient Directory</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <User className="h-4 w-4" />
            {serverTotal} Total Patients
          </p>
        </div>
        <div className="hidden gap-2 md:flex">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={showFilters ? "bg-accent" : ""}>
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="shadow-sm">
                <Download className="mr-2 h-4 w-4" /> Export All
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleBulkExport('pdf')}>
                <FileDown className="mr-2 h-4 w-4" /> Export as PDF (Roster)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkExport('excel')}>
                <Download className="mr-2 h-4 w-4" /> Export as Excel (Data)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => navigate("/patients/new")} className="shadow-sm">
            <UserPlus className="mr-2 h-4 w-4" /> Add New Patient
          </Button>
        </div>
      </div>

      {/* Search & Filters Section */}
      <Card className="sticky top-16 z-20 luxury-panel overflow-hidden border-none shadow-lg md:static md:z-auto">
        <CardContent className="p-3 md:p-5">
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by patient name, ID, or phone..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10 h-11 bg-muted/30 focus-visible:ring-primary"
              />
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-muted/30">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Gender</Label>
                      <Select value={genderFilter} onValueChange={setGenderFilter}>
                        <SelectTrigger className="bg-muted/30">
                          <SelectValue placeholder="All Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Genders</SelectItem>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Registered From</Label>
                      <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="bg-muted/30" />
                    </div>
                    <div className="flex gap-2">
                      <div className="space-y-1.5 flex-1">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Registered To</Label>
                        <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="bg-muted/30" />
                      </div>
                      <Button variant="ghost" size="icon" onClick={clearFilters} className="mb-0.5" title="Clear Filters">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Data Table Section */}
      <div className="space-y-3 md:hidden">
        {pageItems.length > 0 ? (
          pageItems.map((patient) => (
            <Card key={patient.id} className="overflow-hidden border-border/50">
              <CardContent className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{patient.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-nowrap">
                      <Badge variant="outline" className="h-5 border-muted-foreground/30 px-1.5 py-0 text-[10px] uppercase text-muted-foreground">
                        {patient.id}
                      </Badge>
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${getGenderStyle(patient.gender)}`}>
                        {patient.gender}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 border border-border/30 px-1.5 py-0.5 rounded-md">
                        {patient.age} Yrs
                      </span>
                    </div>
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatusMutation.mutate({ id: patient.id, currentStatus: patient.status });
                    }}
                    className="cursor-pointer hover:opacity-85 active:scale-95 transition-all"
                    title="Click to toggle status"
                  >
                    <StatusBadge status={patient.status} className="pointer-events-none" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{patient.phone}</p>
                <p className="text-xs text-muted-foreground">Last visit: {patient.lastVisit || "N/A"}</p>
                <Button size="sm" variant="outline" className="w-full" onClick={() => navigate(`/patients/${patient.id}`)}>
                  View
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-4 text-center text-sm text-muted-foreground">No patients found</CardContent>
          </Card>
        )}
      </div>

      <Card className="hidden overflow-hidden md:block luxury-card w-full">
        <CardContent className="p-0">
          <div className="w-full overflow-hidden">
            <Table className="w-full table-auto">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[30%]">Patient Information</TableHead>
                  <TableHead className="w-[12%]">Status</TableHead>
                  <TableHead className="w-[26%]">Contact Details</TableHead>
                  <TableHead className="w-[18%]">Medical Info</TableHead>
                  <TableHead className="w-[14%] text-right">Last Interaction</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.length > 0 ? (
                  pageItems.map((patient) => (
                    <TableRow
                      key={patient.id}
                      className="group transition-all duration-200 hover:bg-muted/15 border-b border-border/40"
                    >
                      <TableCell onClick={() => navigate(`/patients/${patient.id}`)} className="cursor-pointer py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br font-bold shadow-xs transition-transform duration-200 group-hover:scale-105 ${getAvatarGradient(patient.name)}`}>
                            {patient.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">{patient.name}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-nowrap">
                              <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 py-0 font-medium bg-primary/5 border-primary/20 text-primary tracking-wide uppercase">{patient.id}</Badge>
                              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${getGenderStyle(patient.gender)}`}>
                                {patient.gender}
                              </span>
                              <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 border border-border/30 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                {patient.age} Yrs
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStatusMutation.mutate({ id: patient.id, currentStatus: patient.status });
                          }}
                          className="cursor-pointer hover:opacity-80 active:scale-95 transition-all inline-block"
                          title="Click to toggle Status"
                        >
                          <StatusBadge status={patient.status} className="shadow-xs scale-95 origin-left pointer-events-none" />
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80 hover:text-primary transition-colors">
                            <span className="p-1 rounded bg-muted/50 border border-border/30 group-hover:bg-background transition-colors">
                              <Phone className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                            </span>
                            {patient.phone}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary/80 transition-colors">
                            <span className="p-1 rounded bg-muted/50 border border-border/30 group-hover:bg-background transition-colors">
                              <Mail className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                            </span>
                            <span className="truncate max-w-[160px] font-medium">{patient.email || "No email"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {patient.bloodGroup ? (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              <Droplet className="h-3 w-3 fill-rose-500 stroke-rose-500 shrink-0" />
                              {patient.bloodGroup}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted/40 border border-border/20 px-1.5 py-0.5 rounded-md">
                              No BG Info
                            </span>
                          )}
                          {patient.allergies?.length > 0 ? (
                            <Badge variant="outline" className="text-[10px] font-semibold border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 shadow-xs">
                              {patient.allergies.length} Allergies
                            </Badge>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              No Allergies
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        {patient.lastVisit ? (
                          <div className="flex items-center justify-end gap-1 text-xs font-semibold text-foreground/90">
                            <Clock className="h-3 w-3 text-primary/75" />
                            <span>{patient.lastVisit}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/30">
                            New Patient
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 justify-end mt-1 font-medium">
                          <Calendar className="h-2.5 w-2.5 shrink-0" />
                          <span>Reg: {new Date(patient.registeredOn).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate(`/patients/${patient.id}`)}>
                              <User className="mr-2 h-4 w-4" /> View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/patients/edit/${patient.id}`)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate(`/prescriptions?patientId=${patient.id}`)}>
                              <ClipboardList className="mr-2 h-4 w-4" /> New Prescription
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/billing?patientId=${patient.id}`)}>
                              <Receipt className="mr-2 h-4 w-4" /> Create Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/billing`)}>
                              <FilePlus className="mr-2 h-4 w-4" /> Pay Bill
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleExport(patient.id, 'pdf')}>
                              <FileDown className="mr-2 h-4 w-4" /> Export as PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExport(patient.id, 'excel')}>
                              <Download className="mr-2 h-4 w-4" /> Export as Excel
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => setPatientToDelete(patient.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Patient
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Search className="h-8 w-8 opacity-20" />
                        <p className="text-lg font-heading">No patients found</p>
                        <p className="text-sm">Try adjusting your filters or search criteria.</p>
                        <Button variant="link" onClick={clearFilters}>Clear all filters</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Section */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/50 px-6 py-4">
              <p className="text-xs text-muted-foreground">
                Showing <strong>{(page - 1) * pageSize + 1}</strong> to <strong>{Math.min(page * pageSize, serverTotal)}</strong> of <strong>{serverTotal}</strong> patients
              </p>
              <Pagination className="w-auto ml-0 mr-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((v) => Math.max(1, v - 1))}
                      className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const v = i + 1;
                    if (v === 1 || v === totalPages || (v >= page - 1 && v <= page + 1)) {
                      return (
                        <PaginationItem key={v}>
                          <PaginationLink isActive={v === page} onClick={() => setPage(v)} className="cursor-pointer">
                            {v}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                    if (v === page - 2 || v === page + 2) {
                      return <PaginationItem key={v}><span className="px-2 text-muted-foreground">...</span></PaginationItem>;
                    }
                    return null;
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
                      className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={() => navigate("/patients/new")}
        size="icon"
        className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg md:hidden"
      >
        <UserPlus className="h-5 w-5" />
      </Button>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!patientToDelete} onOpenChange={(open) => !open && setPatientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the patient
              and all associated data (appointments, prescriptions, and invoices).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => patientToDelete && deleteMutation.mutate(patientToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Patient"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default PatientList;
