import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, Search, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PatientList: React.FC = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const navigate = useNavigate();

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

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const pageItems = useMemo(() => data.slice((page - 1) * pageSize, page * pageSize), [data, page]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="py-4 text-sm text-destructive">
          Failed to load patients: {error instanceof Error ? error.message : "Unknown error"}
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Patients</h1>
          <p className="text-sm text-muted-foreground">{data.length} registered patients</p>
        </div>
        <Button onClick={() => navigate("/patients/new")}>
          <UserPlus className="mr-1 h-4 w-4" /> Add Patient
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or ID..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Gender</SelectItem>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
      </div>

      <Card className="hidden border-border/50 md:block">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading">Patient Directory</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-hidden rounded-md border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Blood</TableHead>
                  <TableHead className="text-right">Last visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((patient) => (
                  <TableRow key={patient.id} className="cursor-pointer" onClick={() => navigate(`/patients/${patient.id}`)}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{patient.name}</p>
                        <p className="text-xs text-muted-foreground">{patient.id} · {patient.age}y · {patient.gender}</p>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={patient.status} /></TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {patient.phone}</div>
                        <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {patient.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{patient.bloodGroup}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{patient.lastVisit || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => setPage((value) => Math.max(1, value - 1))} className={page === 1 ? "pointer-events-none opacity-50" : undefined} />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                  const value = index + 1;
                  return (
                    <PaginationItem key={value}>
                      <PaginationLink isActive={value === page} onClick={() => setPage(value)}>
                        {value}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className={page === totalPages ? "pointer-events-none opacity-50" : undefined} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:hidden">
        {pageItems.map((patient) => (
          <Card key={patient.id} className="cursor-pointer border-border/50 transition-all hover:shadow-md" onClick={() => navigate(`/patients/${patient.id}`)}>
            <CardContent className="p-5">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="font-heading text-base font-semibold">{patient.name}</p>
                  <p className="text-xs text-muted-foreground">{patient.id} · {patient.age}y · {patient.gender}</p>
                </div>
                <StatusBadge status={patient.status} />
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{patient.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{patient.email}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span>Blood: <strong className="text-foreground">{patient.bloodGroup}</strong></span>
                <span>Last visit: {patient.lastVisit || "N/A"}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-lg font-heading">No patients found</p>
          <p className="text-sm">Try adjusting your search or filters.</p>
        </div>
      )}
    </motion.div>
  );
};

export default PatientList;
