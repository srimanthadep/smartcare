import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Invoice, InvoiceLineItem } from "@/types";

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

interface InvoiceEditModalProps {
  invoice?: Invoice | null;
  patientId?: string;
  patientName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InvoiceEditModal: React.FC<InvoiceEditModalProps> = ({ 
  invoice, 
  patientId: propPatientId, 
  patientName: propPatientName, 
  open, 
  onOpenChange 
}) => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"Paid" | "Pending" | "Overdue">("Pending");
  const [items, setItems] = useState<InvoiceLineItem[]>([{ description: CDT_CODES[0].description, amount: CDT_CODES[0].amount, toothNumber: "" }]);

  useEffect(() => {
    if (invoice) {
      setDate(invoice.date);
      setStatus(invoice.status);
      setItems(invoice.items);
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setStatus("Pending");
      setItems([{ description: CDT_CODES[0].description, amount: CDT_CODES[0].amount, toothNumber: "" }]);
    }
  }, [invoice, open]);

  const createInvoice = useMutation({
    mutationFn: api.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (invoice?.patientId || propPatientId) {
        queryClient.invalidateQueries({ queryKey: ["invoices", invoice?.patientId || propPatientId] });
      }
      toast.success("Invoice created");
      onOpenChange(false);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to create invoice"),
  });

  const updateInvoice = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Invoice> }) => api.updateInvoice(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (invoice?.patientId) {
        queryClient.invalidateQueries({ queryKey: ["invoices", invoice.patientId] });
      }
      toast.success("Invoice updated");
      onOpenChange(false);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to update invoice"),
  });

  const total = items.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);

  const handleSubmit = () => {
    if (!invoice && !propPatientId) {
      toast.error("Patient information missing");
      return;
    }

    if (items.some((item) => !item.description.trim())) {
      toast.error("Add descriptions for all items");
      return;
    }

    const payload = {
      patientId: invoice?.patientId || propPatientId!,
      patientName: invoice?.patientName || propPatientName!,
      date,
      items,
      total,
      status,
    };

    if (invoice) {
      updateInvoice.mutate({ id: invoice.id, payload });
    } else {
      createInvoice.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-screen h-screen max-w-none overflow-y-auto rounded-none md:max-h-[90vh] md:max-w-2xl md:rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </div>
            <DialogTitle className="font-heading text-xl">
              {invoice ? `Edit Invoice #${invoice.id}` : "Create New Invoice"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Patient</Label>
              <Input 
                value={invoice?.patientName || propPatientName || "Unknown"} 
                disabled 
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
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

          <div className="space-y-3 rounded-lg border border-border/50 p-4">
            <div className="flex items-center justify-between">
              <p className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground">Dental Procedures</p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setItems((current) => [...current, { description: CDT_CODES[0].description, amount: CDT_CODES[0].amount, toothNumber: "" }])}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Procedure
              </Button>
            </div>
            
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-12">
                  <div className="space-y-1.5 sm:col-span-5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Procedure (CDT)</Label>
                    <Select 
                      value={item.description} 
                      onValueChange={(val) => {
                        const selected = CDT_CODES.find(c => c.description === val);
                        setItems(current => current.map((row, i) => i === index ? { ...row, description: val, amount: selected?.amount || 0 } : row));
                      }}
                    >
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CDT_CODES.map(c => <SelectItem key={c.code} value={c.description}>{c.description}</SelectItem>)}
                        <SelectItem value="Custom">Other / Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tooth #</Label>
                    <Input 
                      showVoice={false}
                      placeholder="e.g. 46" 
                      value={item.toothNumber} 
                      onChange={(e) => setItems(current => current.map((row, i) => i === index ? { ...row, toothNumber: e.target.value } : row))} 
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-4">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Amount (₹)</Label>
                    <Input 
                      type="number" 
                      autoComplete="off"
                      value={item.amount} 
                      onChange={(e) => setItems((current) => current.map((row, i) => (i === index ? { ...row, amount: Number(e.target.value) } : row)))} 
                      className="h-9"
                    />
                  </div>
                  <div className="flex sm:col-span-1 sm:justify-end">
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="ghost" 
                      className="h-9 w-9 text-destructive hover:bg-destructive/10" 
                      onClick={() => setItems((current) => current.filter((_, i) => i !== index))} 
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sticky bottom-0 flex items-center justify-between border-t border-border/50 bg-background pt-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold">Total Amount</p>
              <p className="text-2xl font-heading font-bold text-primary">₹{total.toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createInvoice.isPending || updateInvoice.isPending}
                className="px-8"
              >
                {invoice ? "Update Invoice" : "Create Invoice"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceEditModal;
