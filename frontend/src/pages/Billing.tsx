import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, Plus, Printer, Trash2, Calendar, FileDown, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/StatusBadge";
import { Patient, InvoiceLineItem, Invoice, Procedure } from "@/types";
import { pdfService } from "@/lib/pdfService";
import { cn } from "@/lib/utils";
import { ProcedureSettingsModal } from "@/components/ProcedureSettingsModal";

const Billing: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get("patientId");
  const editId = searchParams.get("editId");
  const queryClient = useQueryClient();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [patientId, setPatientId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<InvoiceLineItem[]>([{ description: "", amount: 0, toothNumber: "" }]);
  const [status, setStatus] = useState<"Pending" | "Paid" | "Overdue">("Pending");

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
  const procedures = proceduresQuery.data?.data || [];
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
        setStatus(inv.status);
      }
    }
  }, [editId, allInvoices]);

  useEffect(() => {
    document.title = "Billing | Siara Dental";
  }, []);

  const total = useMemo(() => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [items]);

  const patientInvoices = useMemo(() => {
    if (!patientId) return [];
    return allInvoices.filter(i => i.patientId === patientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [patientId, allInvoices]);

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

    const payload = {
      patientId,
      patientName: patient.name,
      date,
      items: validItems,
      total,
      status
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

      {/* Main Split View */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
            
            <div className="flex justify-end pt-2">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold font-heading text-primary">₹{total.toLocaleString()}</p>
              </div>
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
                  <div className="w-1/2 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>₹0</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center py-1">
                      <span className="font-bold text-lg">Total</span>
                      <span className="font-bold text-xl text-primary">₹{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* History (Bottom) */}
      <div className="pt-6">
        <h2 className="text-xl font-heading font-bold mb-4">
          {patient ? `Billing History for ${patient.name}` : "Recent Invoices"}
        </h2>
        
        {!patientId ? (
          <Card className="border-border/50 bg-secondary/10">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-1">Select a Patient</h3>
              <p className="text-muted-foreground max-w-sm">
                Select a patient from the form above to view their complete billing history and past invoices.
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
                        <p className="text-sm font-medium">{invoice.id}</p>
                        <p className="text-xs text-muted-foreground">{new Date(invoice.date).toLocaleDateString('en-GB')} · {invoice.items.length} item(s)</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-heading font-bold">₹{invoice.total.toLocaleString()}</p>
                      <StatusBadge status={invoice.status} />
                      
                      <div className="flex gap-2 ml-2">
                        {/* Only show Edit button if it's not the currently editing one */}
                        {editId !== invoice.id && (
                          <Button size="sm" variant="outline" onClick={() => {
                            setPatientId(invoice.patientId);
                            setDate(invoice.date);
                            setItems(invoice.items);
                            setStatus(invoice.status);
                            // To properly edit, we should update the URL.
                            window.history.pushState({}, '', `?patientId=${invoice.patientId}&editId=${invoice.id}`);
                          }}>
                            Edit
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-primary/30"
                          onClick={() => pdfService.generateInvoicePDF(patient, invoice)}
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive px-2" onClick={() => {
                          if (window.confirm("Are you sure you want to delete this invoice?")) {
                            deleteInvoice.mutate(invoice.id);
                          }
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Billing;
