import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IndianRupee, Plus, Receipt, FileDown } from "lucide-react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";
import InvoiceModal from "@/components/InvoiceModal";
import InvoiceEditModal from "@/components/InvoiceEditModal";
import { Invoice, Patient } from "@/types";
import { pdfService } from "@/lib/pdfService";
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



const Billing: React.FC = () => {
  const queryClient = useQueryClient();
  const invoicesQuery = useQuery({
    queryKey: ["invoices"],
    queryFn: api.getInvoices,
  });
  
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Billing | Siara Dental";
  }, []);

  const patientsQuery = useQuery({
    queryKey: ["patients", "billing-options"],
    queryFn: () => api.getPatients({}),
  });
  
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.getDashboard,
  });

  const invoices = invoicesQuery.data || [];
  const patients = patientsQuery.data || [];
  const revenueTrend = dashboardQuery.data?.revenueTrend || [];

  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get("patientId");

  useEffect(() => {
    if (urlPatientId && patients.length > 0) {
      const p = patients.find(p => p.id === urlPatientId);
      if (p) {
        setSelectedPatient(p);
        setShowEditModal(true);
      }
    }
  }, [urlPatientId, patients]);

  const totals = useMemo(() => {
    const revenue = invoices.reduce((sum, item) => sum + item.total, 0);
    const pending = invoices.filter((item) => item.status !== "Paid").reduce((sum, item) => sum + item.total, 0);
    const paid = invoices.filter((item) => item.status === "Paid").reduce((sum, item) => sum + item.total, 0);
    return { revenue, pending, paid };
  }, [invoices]);

  const updateInvoice = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Invoice> }) => api.updateInvoice(id, payload),
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
        <Button onClick={() => setIsNewInvoiceOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> New Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatsCard title="Total Billed" value={`₹${totals.revenue.toLocaleString()}`} change="All invoices" changeType="neutral" icon={IndianRupee} />
        <StatsCard title="Paid" value={`₹${totals.paid.toLocaleString()}`} change="Settled invoices" changeType="positive" icon={Receipt} />
        <StatsCard title="Pending / Overdue" value={`₹${totals.pending.toLocaleString()}`} change="Action required" changeType={totals.pending > 0 ? "negative" : "neutral"} icon={Receipt} />
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
              <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} />
              <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
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
                  <p className="text-lg font-heading font-bold">₹{invoice.total.toLocaleString()}</p>
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
              <div className="mt-3 border-t border-border/50 pt-3">
                <div className="space-y-1">
                  {invoice.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.description} {item.toothNumber ? `(Tooth #${item.toothNumber})` : ""}</span>
                      <span>₹{item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewingInvoice(invoice)}>
                    View Details
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingInvoice(invoice)}>
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-primary/30"
                    onClick={() => {
                      const patient = patients.find(p => p.id === invoice.patientId);
                      if (patient) pdfService.generateInvoicePDF(patient, invoice);
                      else toast.error("Patient details not found");
                    }}
                  >
                    <FileDown className="mr-1 h-3.5 w-3.5" /> PDF
                  </Button>
                  {invoice.status !== "Paid" && (
                    <Button size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/5" onClick={() => updateInvoice.mutate({ id: invoice.id, payload: { status: "Paid" } })}>
                      Mark paid
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/5" onClick={() => setInvoiceToDelete(invoice.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <InvoiceModal 
        invoice={viewingInvoice} 
        open={!!viewingInvoice} 
        onOpenChange={(open) => !open && setViewingInvoice(null)} 
      />

      <InvoiceEditModal
        invoice={editingInvoice}
        open={!!editingInvoice}
        onOpenChange={(open) => !open && setEditingInvoice(null)}
      />

      {isNewInvoiceOpen && (
        <PatientSelector 
          patients={patients} 
          onSelect={(p) => {
            setIsNewInvoiceOpen(false);
            setEditingInvoice(null);
            setSelectedPatient(p);
            setShowEditModal(true);
          }}
          onClose={() => setIsNewInvoiceOpen(false)}
        />
      )}

      {showEditModal && (
        <InvoiceEditModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          patientId={selectedPatient?.id}
          patientName={selectedPatient?.name}
        />
      )}

      <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The invoice will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (invoiceToDelete) {
                  deleteInvoice.mutate(invoiceToDelete);
                  setInvoiceToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteInvoice.isPending ? "Removing..." : "Remove Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

const PatientSelector = ({ patients, onSelect, onClose }: { patients: Patient[], onSelect: (p: Patient) => void, onClose: () => void }) => (
  <Dialog open onOpenChange={onClose}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Create New Invoice</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label>Select Patient</Label>
          <Select onValueChange={(val) => onSelect(patients.find(p => p.id === val)!)}>
            <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
            <SelectContent>
              {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.id})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default Billing;
