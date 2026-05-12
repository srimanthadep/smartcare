import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, Plus, Printer, Trash2, Calendar, FileDown, Check, ChevronsUpDown, Undo2, CheckCircle, MoreHorizontal, Eye, MessageCircle, Mail, Edit3, ChevronDown, CreditCard } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/StatusBadge";
import { Patient, InvoiceLineItem, Invoice, Procedure } from "@/types";
import { pdfService } from "@/lib/pdfService";
import { cn } from "@/lib/utils";
import { ProcedureSettingsModal } from "@/components/ProcedureSettingsModal";

const Billing: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlPatientId = searchParams.get("patientId");
  const [isPartialPaymentOpen, setIsPartialPaymentOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null);
  const [additionalPayment, setAdditionalPayment] = useState("");

  const editId = searchParams.get("editId");
  const queryClient = useQueryClient();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [patientId, setPatientId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<InvoiceLineItem[]>([{ description: "", amount: 0, toothNumber: "" }]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [status, setStatus] = useState<"Pending" | "Paid" | "Overdue" | "Partially Paid">("Pending");

  const patientsQuery = useQuery({
    queryKey: ["patients", "billing-options"],
    queryFn: () => api.getPatients({}),
  });

  const invoicesQuery = useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.getInvoices(),
  });

  const proceduresQuery = useQuery({
    queryKey: ["procedures"],
    queryFn: () => api.getProcedures(),
  });

  const patients = patientsQuery.data || [];
  const allInvoices = invoicesQuery.data || [];
  const procedures = (proceduresQuery.data || []) as any[];
  const patient = patients.find((p) => p.id === patientId);

  // Initialize from URL params
  useEffect(() => {
    if (urlPatientId && patients.length > 0 && !patientId) {
      setPatientId(urlPatientId);
    }
  }, [urlPatientId, patients]);

  // Load invoice if editing
  useEffect(() => {
    if (editId && allInvoices.length > 0) {
      const inv = allInvoices.find(i => i.id === editId);
      if (inv) {
        setPatientId(inv.patientId);
        setDate(inv.date);
        setItems(inv.items.length > 0 ? inv.items : [{ description: "", amount: 0, toothNumber: "" }]);
        setPaidAmount(inv.paidAmount || 0);
        setStatus(inv.status);
      }
    }
  }, [editId, allInvoices]);

  useEffect(() => {
    document.title = "Billing | Siara Dental";
  }, []);

  const total = useMemo(() => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [items]);

  const patientInvoices = useMemo(() => {
    const sortedAll = [...allInvoices].sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.id.localeCompare(a.id); // Fallback to ID descending for same-day invoices
    });
    if (!patientId) return sortedAll.slice(0, 15);
    return sortedAll.filter(i => i.patientId === patientId);
  }, [patientId, allInvoices]);
  const invoiceSummary = useMemo(
    () => ({
      total: patientInvoices.reduce((sum, item) => sum + Number(item.total || 0), 0),
      pending: patientInvoices
        .filter((item) => item.status === "Pending" || item.status === "Partially Paid")
        .reduce((sum, item) => sum + Number((item.total || 0) - (item.paidAmount || 0)), 0),
      paid: patientInvoices.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0),
      overdue: patientInvoices.filter((item) => item.status === "Overdue").length,
    }),
    [patientInvoices],
  );

  const createInvoice = useMutation({
    mutationFn: (payload: any) => api.createInvoice(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created successfully");
      resetForm();
    },
  });

  const updateInvoice = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.updateInvoice(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice updated successfully");
    },
  });

  const updateInvoiceStatus = useMutation({
    mutationFn: ({ invId, status }: { invId: string; status: "Paid" | "Pending" | "Overdue" }) => {
      const invoice = allInvoices?.find(i => i.id === invId);
      const remaining = (invoice?.total || 0) - (invoice?.paidAmount || 0);

      const payload: any = { status };
      if (status === "Paid") {
        payload.paidAmount = invoice?.total || 0;
        payload.payments = [...(invoice?.payments || []), {
          date: new Date().toLocaleDateString('en-CA'),
          amount: remaining
        }];
      } else if (status === "Pending") {
        payload.paidAmount = 0;
        payload.payments = [];
      }

      return api.updateInvoice(invId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteInvoice = useMutation({
    mutationFn: api.deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice removed");
    },
  });

  const resetForm = () => {
    setItems([{ description: "", amount: 0, toothNumber: "" }]);
    setDate(new Date().toISOString().split("T")[0]);
    setPaidAmount(0);
    setStatus("Pending");
  };

  const handleSave = () => {
    if (!patientId || !patient) {
      toast.error("Please select a patient");
      return;
    }

    const validItems = items.filter(item => item.description.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Please add at least one procedure");
      return;
    }

    const calculatedStatus = paidAmount >= total ? "Paid" : paidAmount > 0 ? "Partially Paid" : "Pending";

    const payload = {
      patientId,
      patientName: patient.name,
      date,
      items: validItems,
      total,
      paidAmount,
      status: calculatedStatus
    };

    if (editId) {
      updateInvoice.mutate({ id: editId, payload });
    } else {
      createInvoice.mutate(payload);
    }
  };

  const updateItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    setItems(current => current.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeItem = (index: number) => {
    setItems(current => current.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems(current => [...current, { description: "", amount: 0, toothNumber: "" }]);
  };

  if (patientsQuery.isLoading || invoicesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Billing</h1>
          <p className="text-sm text-muted-foreground">Create invoices and track payments</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProcedureSettingsModal />
          <Button
            variant="outline"
            onClick={() => {
              if (!patient) {
                toast.error("Select a patient to generate PDF");
                return;
              }
              pdfService.generateInvoicePDF(patient, {
                id: editId || "DRAFT",
                patientId,
                patientName: patient.name,
                date,
                items,
                total,
                status
              } as Invoice);
            }}
          >
            <Printer className="mr-1 h-4 w-4" /> Print PDF
          </Button>
          <Button
            onClick={handleSave}
            disabled={createInvoice.isPending || updateInvoice.isPending}
          >
            <Plus className="mr-1 h-4 w-4" /> {(createInvoice.isPending || updateInvoice.isPending) ? "Saving..." : (editId ? "Update" : "Save")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:hidden">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-semibold">₹{invoiceSummary.total.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-semibold">₹{invoiceSummary.pending.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Paid</p><p className="text-lg font-semibold">₹{invoiceSummary.paid.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Overdue</p><p className="text-lg font-semibold">{invoiceSummary.overdue}</p></CardContent></Card>
      </div>

      <div className="space-y-3 md:hidden">
        {patientInvoices.map((invoice) => (
          <Card key={invoice.id} className="border-border/50">
            <CardContent className="space-y-2 p-3">
              <p className="font-medium">{invoice.patientName || "Patient"}</p>
              <p className="text-xs text-muted-foreground">{invoice.id}</p>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">₹{invoice.total.toLocaleString()}</p>
                <StatusBadge status={invoice.status} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate(`/billing?patientId=${invoice.patientId}`)}>View</Button>
                <Button size="sm" variant="outline" onClick={() => navigate(`/billing?patientId=${invoice.patientId}&editId=${invoice.id}`)}>Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Split View */}
      <div className="hidden grid-cols-1 gap-4 xl:grid xl:grid-cols-2">
        {/* Editor (Left) */}
        <Card className="border-border/50">
          <CardContent className="space-y-5 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full justify-start text-left font-normal"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Procedures List */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="font-heading font-semibold text-primary">Procedures</p>
              </div>

              {items.map((item, index) => (
                <div key={index} className="rounded-lg border border-border/50 bg-secondary/20 p-4 relative group">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 sm:col-span-7 space-y-2">
                      <Label>Description</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal bg-background"
                          >
                            {item.description || "Select or type procedure..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search procedures..."
                              value={item.description}
                              onValueChange={(val) => updateItem(index, "description", val)}
                            />
                            <CommandList>
                              <CommandEmpty>
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start text-sm"
                                  onClick={() => {
                                    // Just close popover, value is already in input
                                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                                  }}
                                >
                                  Use custom: "{item.description}"
                                </Button>
                              </CommandEmpty>
                              <CommandGroup heading="Standard Procedures">
                                {procedures.map((proc: any) => (
                                  <CommandItem
                                    key={proc.id}
                                    value={proc.name}
                                    onSelect={() => {
                                      updateItem(index, "description", proc.name);
                                      updateItem(index, "amount", proc.price);
                                      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        item.description === proc.name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-1 items-center justify-between">
                                      <span>{proc.name}</span>
                                      <span className="text-xs text-muted-foreground">₹{proc.price}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="col-span-6 sm:col-span-2 space-y-2">
                      <Label>Tooth</Label>
                      <Input
                        value={item.toothNumber || ""}
                        onChange={(e) => updateItem(index, "toothNumber", e.target.value)}
                        placeholder="e.g. 14"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3 space-y-2">
                      <Label>Amount (₹)</Label>
                      <Input
                        type="number"
                        value={item.amount || ""}
                        onChange={(e) => updateItem(index, "amount", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  {items.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                size="sm"
                variant="outline"
                className="w-full border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 text-primary py-6"
                onClick={addItem}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Another Procedure
              </Button>
            </div>

            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <Label className="text-emerald-600 font-bold">Amount Paid (Advance)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <Input
                      type="number"
                      className="pl-7 bg-emerald-50/30 border-emerald-100"
                      value={paidAmount || ""}
                      onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Balance Due</p>
                  <p className={`text-2xl font-bold ${total - paidAmount > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                    ₹{(total - paidAmount).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-lg font-bold pt-4 border-t border-border/50">
              <span className="text-muted-foreground">Grand Total</span>
              <span className="text-2xl font-heading text-primary">₹{total.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Preview (Right) */}
        <div className="hidden xl:block">
          <div className="sticky top-4">
            <Card className="border-border/50 shadow-sm overflow-hidden bg-white dark:bg-card">
              <div className="bg-primary/5 p-6 border-b border-border/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-heading font-bold text-primary">INVOICE</h2>
                    <p className="text-sm text-muted-foreground mt-1">DRAFT / PREVIEW</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">Siara Dental</p>
                    <p className="text-sm text-muted-foreground">Omini Hospital Road, New Nagole</p>
                    <p className="text-sm text-muted-foreground">Hyderabad, Telangana 500035</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Bill To</p>
                    {patient ? (
                      <>
                        <p className="font-bold text-base">{patient.name}</p>
                        <p className="text-sm text-muted-foreground">ID: {patient.id}</p>
                        <p className="text-sm text-muted-foreground">{patient.phone}</p>
                      </>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">Select a patient...</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="mb-3">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Invoice Date</p>
                      <p className="text-sm font-medium">{new Date(date).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                      <StatusBadge status={status} />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <div className="grid grid-cols-12 gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                    <div className="col-span-7">Description</div>
                    <div className="col-span-2 text-center">Tooth</div>
                    <div className="col-span-3 text-right">Amount</div>
                  </div>
                  <div className="space-y-2">
                    {items.filter(i => i.description || i.amount > 0).length > 0 ? (
                      items.filter(i => i.description || i.amount > 0).map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 text-sm p-2 rounded-md even:bg-secondary/20">
                          <div className="col-span-7 font-medium">{item.description || "-"}</div>
                          <div className="col-span-2 text-center text-muted-foreground">{item.toothNumber || "-"}</div>
                          <div className="col-span-3 text-right font-medium">₹{item.amount.toLocaleString()}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground italic border border-dashed rounded-md">
                        No procedures added yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex justify-end">
                  <div className="w-1/2 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">₹{total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 font-medium font-bold">Amount Paid</span>
                      <span className="font-bold text-emerald-600">₹{paidAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t-2 border-primary">
                      <span className="text-base font-bold uppercase tracking-tight text-foreground">Balance Due</span>
                      <span className="text-xl font-bold text-primary">₹{(total - paidAmount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* History (Bottom) */}
      <div className="hidden pt-6 md:block">
        <h2 className="text-xl font-heading font-bold mb-4">
          {patient ? `Billing History for ${patient.name}` : "Recent Invoices"}
        </h2>

        {patientInvoices.length === 0 ? (
          <Card className="border-border/50 bg-secondary/10">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">
                {patientId ? "No Invoices for this Patient" : "No Invoices Found"}
              </h3>
              <p className="text-muted-foreground max-w-sm">
                {patientId
                  ? "This patient doesn't have any billing history recorded yet."
                  : "There are no invoices recorded in the system yet."}
              </p>
            </CardContent>
          </Card>
        ) : patientInvoices.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-8 text-center text-muted-foreground">
              No previous invoices found for this patient.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {patientInvoices.map((invoice) => (
              <Card key={invoice.id} className="border-border/50 transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Receipt className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{!patientId ? `${invoice.patientName || 'Patient'} · ` : ""}{invoice.id}</p>
                        <p className="text-xs text-muted-foreground">{new Date(invoice.date).toLocaleDateString('en-GB')} · {invoice.items.length} item(s)</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right mr-4">
                        <p className="text-base font-bold">₹{invoice.total.toLocaleString()}</p>
                        <StatusBadge status={invoice.status} />
                      </div>

                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          {invoice.status === "Paid" ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-[10px] px-2 text-amber-600 border-amber-200 hover:bg-amber-50 mr-2"
                                  onClick={() => updateInvoiceStatus.mutate({ invId: invoice.id, status: "Pending" })}
                                  disabled={updateInvoiceStatus.isPending}
                                >
                                  <Undo2 className="mr-1 h-3 w-3" /> Undo
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Mark as Pending</p></TooltipContent>
                            </Tooltip>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  className="h-8 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 mr-2 text-white"
                                  disabled={updateInvoiceStatus.isPending || updateInvoice.isPending}
                                >
                                  <CheckCircle className="mr-1 h-3 w-3" /> Mark Payment <ChevronDown className="ml-1 h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => updateInvoiceStatus.mutate({ invId: invoice.id, status: "Paid" })}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Full Payment
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedInvoiceForPayment(invoice);
                                  setAdditionalPayment("");
                                  setIsPartialPaymentOpen(true);
                                }}>
                                  <CreditCard className="mr-2 h-4 w-4 text-primary" /> Partial Payment
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          {editId !== invoice.id && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                                  setPatientId(invoice.patientId);
                                  setDate(invoice.date);
                                  setItems(invoice.items);
                                  setPaidAmount(invoice.paidAmount || 0);
                                  setStatus(invoice.status);
                                  window.history.pushState({}, '', `?patientId=${invoice.patientId}&editId=${invoice.id}`);
                                }}>
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Edit Invoice</p></TooltipContent>
                            </Tooltip>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                                pdfService.generateInvoicePDF({ name: invoice.patientName, id: invoice.patientId, phone: invoice.patientPhone } as any, invoice);
                              }}>
                                <FileDown className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Download PDF</p></TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                                toast.promise(api.sendInvoiceWhatsapp(invoice.id), {
                                  loading: 'Sending...',
                                  success: 'Sent!',
                                  error: 'Error'
                                });
                              }}>
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Send via WhatsApp</p></TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                                toast.promise(api.sendInvoiceEmail(invoice.id), {
                                  loading: 'Sending...',
                                  success: 'Sent!',
                                  error: 'Error'
                                });
                              }}>
                                <Mail className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Send via Email</p></TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => {
                                if (window.confirm("Delete this invoice?")) deleteInvoice.mutate(invoice.id);
                              }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Delete Invoice</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
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
                      {invoice.status === "Partially Paid" && (
                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-dashed border-border/50">
                          <span className="text-xs font-bold text-destructive uppercase tracking-wider">Remaining Balance Due</span>
                          <span className="text-base font-bold text-destructive">
                            ₹{(invoice.total - (invoice.paidAmount || 0)).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {/* Partial Payment Dialog */}
            <Dialog open={isPartialPaymentOpen} onOpenChange={setIsPartialPaymentOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Record Partial Payment
                  </DialogTitle>
                </DialogHeader>
                {selectedInvoiceForPayment && (
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-muted-foreground uppercase text-[10px] font-bold">Invoice ID</p>
                        <p className="font-medium">{selectedInvoiceForPayment.id}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-muted-foreground uppercase text-[10px] font-bold">Total Bill</p>
                        <p className="font-medium">₹{selectedInvoiceForPayment.total.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-emerald-600 uppercase text-[10px] font-bold">Already Paid</p>
                        <p className="font-medium text-emerald-600">₹{(selectedInvoiceForPayment.paidAmount || 0).toLocaleString()}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-destructive uppercase text-[10px] font-bold">Balance Due</p>
                        <p className="font-medium text-destructive">₹{(selectedInvoiceForPayment.total - (selectedInvoiceForPayment.paidAmount || 0)).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <Label htmlFor="amount" className="text-sm font-bold">Additional Amount to Pay (₹)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                        <Input
                          id="amount"
                          type="number"
                          className="pl-7 text-lg font-bold"
                          placeholder="Enter amount..."
                          value={additionalPayment}
                          onChange={(e) => setAdditionalPayment(e.target.value)}
                          autoFocus
                        />
                      </div>
                      {additionalPayment && !isNaN(Number(additionalPayment)) && (
                        <p className="text-xs text-muted-foreground italic">
                          New Balance will be: <span className="font-bold text-primary">₹{(selectedInvoiceForPayment.total - (selectedInvoiceForPayment.paidAmount || 0) - Number(additionalPayment)).toLocaleString()}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPartialPaymentOpen(false)}>Cancel</Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => {
                      if (!additionalPayment || isNaN(Number(additionalPayment))) {
                        toast.error("Please enter a valid amount");
                        return;
                      }
                      const newPaid = (selectedInvoiceForPayment.paidAmount || 0) + Number(additionalPayment);
                      const newStatus = newPaid >= selectedInvoiceForPayment.total ? "Paid" : "Partially Paid";

                      const newPayments = [
                        ...(selectedInvoiceForPayment.payments || []),
                        { date: new Date().toLocaleDateString('en-CA'), amount: Number(additionalPayment) }
                      ];

                      updateInvoice.mutate({
                        id: selectedInvoiceForPayment.id,
                        payload: {
                          paidAmount: newPaid,
                          status: newStatus,
                          payments: newPayments
                        }
                      }, {
                        onSuccess: () => {
                          setIsPartialPaymentOpen(false);
                          setAdditionalPayment("");
                        }
                      });
                    }}
                    disabled={updateInvoice.isPending}
                  >
                    Confirm Payment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Billing;
