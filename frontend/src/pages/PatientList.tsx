import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  X
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const PatientList: React.FC = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);
  
  const pageSize = 8;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, genderFilter, from, to]);

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["patients", search, statusFilter, genderFilter, from, to],
    queryFn: () =>
      api.getPatients({
        search,
        status: statusFilter,
        gender: genderFilter,
        from,
        to,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient deleted successfully");
      setPatientToDelete(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete patient");
    }
  });

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const pageItems = useMemo(() => data.slice((page - 1) * pageSize, page * pageSize), [data, page]);

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
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Patient Directory</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <User className="h-4 w-4" />
            {data.length} Total Patients
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={showFilters ? "bg-accent" : ""}>
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
          <Button onClick={() => navigate("/patients/new")} className="shadow-sm">
            <UserPlus className="mr-2 h-4 w-4" /> Add New Patient
          </Button>
        </div>
      </div>

      {/* Search & Filters Section */}
      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-4">
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
      <Card className="border-border/40 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[280px]">Patient Information</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact Details</TableHead>
                  <TableHead>Medical Info</TableHead>
                  <TableHead className="text-right">Last Interaction</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.length > 0 ? (
                  pageItems.map((patient) => (
                    <TableRow 
                      key={patient.id} 
                      className="group transition-colors hover:bg-muted/20"
                    >
                      <TableCell onClick={() => navigate(`/patients/${patient.id}`)} className="cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                            {patient.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{patient.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 font-normal border-muted-foreground/30 text-muted-foreground uppercase">{patient.id}</Badge>
                              <span className="text-xs text-muted-foreground">{patient.age}y · {patient.gender}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={patient.status} /></TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <Phone className="h-3 w-3 text-muted-foreground" /> 
                            {patient.phone}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" /> 
                            {patient.email || "No email"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border-none font-medium">
                            {patient.bloodGroup}
                          </Badge>
                          {patient.allergies?.length > 0 && (
                            <Badge variant="outline" className="text-[10px] border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50">
                              {patient.allergies.length} Allergies
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-sm font-medium text-foreground">{patient.lastVisit || "N/A"}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">Registered: {new Date(patient.registeredOn).toLocaleDateString()}</div>
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
                            <DropdownMenuItem onClick={() => navigate(`/billing?patientId=${patient.id}`)}>
                              <FilePlus className="mr-2 h-4 w-4" /> Pay Bill
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
                Showing <strong>{(page - 1) * pageSize + 1}</strong> to <strong>{Math.min(page * pageSize, data.length)}</strong> of <strong>{data.length}</strong> patients
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!patientToDelete} onOpenChange={(open) => !open && setPatientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
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
