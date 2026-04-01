import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IndianRupee, Plus, Receipt, Trash2 } from "lucide-react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";

const CDT_CODES = [
  { code: "D0120", description: "Periodic Oral Evaluation", amount: 800 },
  { code: "D1110", description: "Prophylaxis - Adult (Cleaning)", amount: 1200 },
  { code: "D2140", description: "Amalgam - 1 Surface", amount: 1500 },
  { code: "D2330", description: "Resin-Based Composite - 1 Surface", amount: 2000 },
  { code: "D3310", description: "Endodontic Therapy - Anterior (Root Canal)", amount: 8500 },
  { code: "D3330", description: "Endodontic Therapy - Molar (Root Canal)", amount: 12500 },
  { code: "D7140", description: "Extraction, Erupted Tooth", amount: 1800 },
  { code: "D6010", description: "Surgical Placement of Implant Body", amount: 45000 },
  { code: "D2750", description: "Crown - Porcelain Fused to High Noble Metal", amount: 15000 },
];

const Billing: React.FC = () => {
  const queryClient = useQueryClient();
  const invoicesQuery = useQuery({
    queryKey: ["invoices"],
    queryFn: api.getInvoices,
  });
  const patientsQuery = useQuery({
    queryKey: ["patients", "billing-options"],
    queryFn: () => api.getPatients({}),
  });
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard,
  });

  const createInvoice = useMutation({
    mutationFn: api.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Invoice created");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to create invoice"),
  });

  const updateInvoice = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, string> }) => api.updateInvoice(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Invoice updated");
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: api.deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Invoice removed");
    },
  });

  const invoices = invoicesQuery.data || [];
  const patients = patientsQuery.data || [];
  const revenueTrend = dashboardQuery.data?.revenueTrend || [];

  const totals = useMemo(() => {
    const revenue = invoices.reduce((sum, item) => sum + item.total, 0);
    const pending = invoices.filter((item) => item.status !== "Paid").reduce((sum, item) => sum + item.total, 0);
    const paid = invoices.filter((item) => item.status === "Paid").reduce((sum, item) => sum + item.total, 0);
    return { revenue, pending, paid };
  }, [invoices]);

  const NewInvoiceDialog = () => {
    const [patientId, setPatientId] = useState(patients[0]?.id || "");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [status, setStatus] = useState<"Paid" | "Pending" | "Overdue">("Pending");
    const [items, setItems] = useState([{ description: CDT_CODES[0].description, amount: CDT_CODES[0].amount, toothNumber: "" }]);

    const total = items.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);
    const patient = patients.find((item) => item.id === patientId);

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button><Plus className="mr-1 h-4 w-4" /> New Invoice</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Create invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((patientOption) => (
                      <SelectItem key={patientOption.id} value={patientOption.id}>{patientOption.name} ({patientOption.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border/50 p-4">
              <div className="flex items-center justify-between">
                <p className="font-heading font-semibold">Dental Procedures</p>
                <Button size="sm" variant="outline" onClick={() => setItems((current) => [...current, { description: CDT_CODES[0].description, amount: CDT_CODES[0].amount, toothNumber: "" }])}>
                  <Plus className="mr-1 h-4 w-4" /> Add Procedure
                </Button>
              </div>
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-12">
                  <div className="space-y-2 sm:col-span-5">
                    <Label>Procedure (CDT)</Label>
                    <Select 
                      value={item.description} 
                      onValueChange={(val) => {
                        const selected = CDT_CODES.find(c => c.description === val);
                        setItems(current => current.map((row, i) => i === index ? { ...row, description: val, amount: selected?.amount || 0 } : row));
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CDT_CODES.map(c => <SelectItem key={c.code} value={c.description}>{c.description}</SelectItem>)}
                        <SelectItem value="Custom">Other / Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Tooth #</Label>
                    <Input placeholder="e.g. 46" value={item.toothNumber} onChange={(e) => setItems(current => current.map((row, i) => i === index ? { ...row, toothNumber: e.target.value } : row))} />
                  </div>
                  <div className="space-y-2 sm:col-span-4">
                    <Label>Amount (Rs)</Label>
                    <Input type="number" value={item.amount} onChange={(event) => setItems((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, amount: Number(event.target.value) } : row)))} />
                  </div>
                  <div className="flex sm:col-span-1 sm:justify-end">
                    <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => setItems((current) => current.filter((_, rowIndex) => rowIndex !== index))} disabled={items.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Patient: <span className="font-medium text-foreground">{patient?.name || "-"}</span></div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-heading font-bold">Rs {total.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  if (!patient) {
                    toast.error("Select a patient");
                    return;
                  }
                  if (items.some((item) => !item.description.trim())) {
                    toast.error("Add descriptions for all items");
                    return;
                  }
                  createInvoice.mutate({
                    patientId: patient.id,
                    patientName: patient.name,
                    date,
                    items,
                    total,
                    status,
                  });
                }}
                disabled={createInvoice.isPending}
              >
                {createInvoice.isPending ? "Creating..." : "Create invoice"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (invoicesQuery.isLoading || patientsQuery.isLoading || dashboardQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Billing</h1>
          <p className="text-sm text-muted-foreground">Invoices and payment tracking</p>
        </div>
        <NewInvoiceDialog />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatsCard title="Total Billed" value={`Rs ${totals.revenue.toLocaleString()}`} change="All invoices" changeType="neutral" icon={IndianRupee} />
        <StatsCard title="Paid" value={`Rs ${totals.paid.toLocaleString()}`} change="Settled invoices" changeType="positive" icon={Receipt} />
        <StatsCard title="Pending / Overdue" value={`Rs ${totals.pending.toLocaleString()}`} change="Action required" changeType={totals.pending > 0 ? "negative" : "neutral"} icon={Receipt} />
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading">Revenue (last 6 months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(value) => `Rs ${Math.round(value / 1000)}k`} />
              <Tooltip formatter={(value: number) => [`Rs ${value.toLocaleString()}`, "Revenue"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {invoices.map((invoice) => (
          <Card key={invoice.id} className="border-border/50 transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Receipt className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{invoice.patientName}</p>
                    <p className="text-xs text-muted-foreground">{invoice.id} · {invoice.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-heading font-bold">Rs {invoice.total.toLocaleString()}</p>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
              <div className="mt-3 border-t border-border/50 pt-3">
                <div className="space-y-1">
                  {invoice.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.description} {item.toothNumber ? `(Tooth #${item.toothNumber})` : ""}</span>
                      <span>Rs {item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  {invoice.status !== "Paid" && (
                    <Button size="sm" variant="outline" onClick={() => updateInvoice.mutate({ id: invoice.id, payload: { status: "Paid" } })}>
                      Mark paid
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteInvoice.mutate(invoice.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
};

export default Billing;
