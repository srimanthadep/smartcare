import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Activity, AlertTriangle, ArrowLeft, Droplets, FileText, Pill, Smile, Receipt, Trash2, Eye, Edit3, Mail, FileDown, Download, MessageCircle, ClipboardList, PlusCircle, Undo2, MoreHorizontal, CheckCircle, ChevronDown, CreditCard, Save, X } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { pdfService } from "@/lib/pdfService";
import { exportService } from "@/lib/exportService";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EditableField from "@/components/EditableField";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AutocorrectTextarea } from "@/components/AutocorrectTextarea";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DentalChart from "@/components/DentalChart";
import { ToothRecord } from "@/types";
import InvoiceModal from "@/components/InvoiceModal";
import InvoiceEditModal from "@/components/InvoiceEditModal";
import { Invoice } from "@/types";

const PatientProfile: React.FC = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isPartialPaymentOpen, setIsPartialPaymentOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any>(null);
  const [additionalPayment, setAdditionalPayment] = useState("");
  const queryClient = useQueryClient();
  
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => api.getPatient(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (data?.patient.name) {
      document.title = `${data.patient.name} | Siara Dental`;
    } else {
      document.title = "Patient Profile | Siara Dental";
    }
  }, [data]);

  const updatePatient = useMutation({
    mutationFn: (payload: Record<string, string>) => api.updatePatient(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient updated");
    },
    onError: (mutationError) => {
      toast.error(mutationError instanceof Error ? mutationError.message : "Unable to update patient");
    },
  });

  const deletePatient = useMutation({
    mutationFn: (patientId: string) => api.deletePatient(patientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient deleted successfully");
      navigate("/patients");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete patient");
    },
  });

  const deletePrescription = useMutation({
    mutationFn: (prescriptionId: string) => api.deletePrescription(prescriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions", id] });
      toast.success("Prescription deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete prescription");
    },
  });

  const { data: dentalChartData, isLoading: isLoadingChart } = useQuery({
    queryKey: ["dental-chart", id],
    queryFn: () => api.getDentalChart(id),
    enabled: !!id,
  });

  const { data: invoices, error: invoiceError, refetch: refetchInvoices } = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => api.getInvoices({ patientId: id }),
    enabled: !!id,
  });

  const { data: treatmentPlans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["treatment-plans", id],
    queryFn: () => api.getTreatmentPlans(id),
    enabled: !!id,
  });

  if (invoiceError) {
    console.error(`Invoice fetch error for ${id}:`, invoiceError);
  }

  const { data: prescriptions } = useQuery({
    queryKey: ["prescriptions", id],
    queryFn: () => api.getPrescriptions(id),
    enabled: !!id,
  });

  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);

  const updateDentalChart = useMutation({
    mutationFn: (teeth: ToothRecord[]) => api.updateDentalChart(id, teeth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dental-chart", id] });
      toast.success("Dental chart updated");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Unable to update dental chart");
    },
  });

  const updateInvoiceStatus = useMutation({
    mutationFn: ({ invId, status }: { invId: string; status: "Paid" | "Pending" | "Overdue" }) => {
      const invoice = invoices?.find(i => i.id === invId);
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
      queryClient.invalidateQueries({ queryKey: ["invoices", id] });
      toast.success("Invoice status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteInvoice = useMutation({
    mutationFn: (invId: string) => api.deleteInvoice(invId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", id] });
      toast.success("Invoice deleted");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete invoice");
    },
  });

  // Inline editing states
  const [editingConditions, setEditingConditions] = useState(false);
  const [conditionsDraft, setConditionsDraft] = useState("");
  
  const [editingAllergies, setEditingAllergies] = useState(false);
  const [allergiesDraft, setAllergiesDraft] = useState("");

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  const [editingDentalHistory, setEditingDentalHistory] = useState(false);
  const [dentalHistoryDraft, setDentalHistoryDraft] = useState("");

  useEffect(() => {
    if (data?.patient) {
      setConditionsDraft(data.patient.conditions.join(", "));
      setAllergiesDraft(data.patient.allergies.join(", "));
      setNotesDraft(data.patient.notes || "");
      setDentalHistoryDraft(data.patient.dentalHistory?.history || "");
    }
  }, [data?.patient]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Header Skeleton */}
        <div className="-mx-4 border-b border-border/60 bg-background px-4 py-3 md:-mx-6 md:px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>

        {/* Contact Info Grid Skeleton */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-4 border-b border-border/50 pb-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-28" />
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="border-border/50">
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-full rounded-full" />
              <Skeleton className="h-8 w-3/4 rounded-full" />
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-full rounded-full" />
              <Skeleton className="h-8 w-1/2 rounded-full" />
            </CardContent>
          </Card>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="py-4 text-sm text-destructive">
          Failed to load patient: {error instanceof Error ? error.message : "Unknown error"}
        </CardContent>
      </Card>
    );
  }

  const { patient, diagnoses, reports } = data;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="-mx-4 border-b border-border/60 bg-background px-4 py-3 md:-mx-6 md:px-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/patients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="truncate text-lg font-heading font-bold">{patient.name}</h1>
              <StatusBadge status={patient.status} />
              <Badge variant="outline" className="text-xs">Blood {patient.bloodGroup}</Badge>
              {patient.allergies.slice(0, 2).map((allergy) => (
                <Badge key={allergy} variant="secondary" className="text-xs">{allergy}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{patient.id} · {patient.age} years · {patient.gender} · Registered {patient.registeredOn}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(`/patients?editId=${id}`)}>
            Edit Profile
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" /> Export Record
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                toast.promise(
                  Promise.resolve(exportService.exportPatientToPDF(patient, dentalChartData?.teeth || [], invoices || [], prescriptions || [], diagnoses || [])),
                  { loading: 'Generating PDF...', success: 'PDF Exported Successfully!', error: 'Failed to export PDF' }
                );
              }}>
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                toast.promise(
                  Promise.resolve(exportService.exportPatientToExcel(patient, dentalChartData?.teeth || [], invoices || [], prescriptions || [], diagnoses || [])),
                  { loading: 'Generating Excel...', success: 'Excel Exported Successfully!', error: 'Failed to export Excel' }
                );
              }}>
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => {
              if (window.confirm("Are you sure you want to delete this patient?")) {
                deletePatient.mutate(id!);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <EditableField label="Phone" value={patient.phone} onSave={(value) => updatePatient.mutate({ phone: value })} />
        <EditableField label="Email" value={patient.email} type="email" onSave={(value) => updatePatient.mutate({ email: value })} />
        <EditableField label="Address" value={patient.address} onSave={(value) => updatePatient.mutate({ address: value })} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="dental-chart">Dental Chart</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="treatment-plans">Treatment Plans</TabsTrigger>
          <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
          <TabsTrigger value="allergies">Allergies</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-heading"><Activity className="h-4 w-4" /> Conditions</CardTitle>
                  {!editingConditions ? null : (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingConditions(false)}>
                        <X className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => {
                        const arr = conditionsDraft.split(",").map(s => s.trim()).filter(Boolean);
                        updatePatient.mutate({ conditions: arr as any });
                        setEditingConditions(false);
                      }}>
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent 
                className={!editingConditions ? "cursor-pointer hover:bg-secondary/10 transition-colors rounded-b-lg min-h-[60px]" : ""}
                onClick={() => !editingConditions && setEditingConditions(true)}
              >
                {editingConditions ? (
                  <Input 
                    value={conditionsDraft} 
                    onChange={(e) => {
                      const minorWords = ["a", "an", "the", "and", "as", "at", "but", "by", "for", "if", "in", "nor", "of", "on", "or", "so", "to", "up", "yet"];
                      let val = e.target.value;
                      val = val.split(' ').map((word, index) => {
                        if (index > 0 && minorWords.includes(word.toLowerCase())) {
                          return word.toLowerCase();
                        }
                        return word.charAt(0).toUpperCase() + word.slice(1);
                      }).join(' ');
                      setConditionsDraft(val);
                    }}
                    placeholder="Enter conditions separated by commas..."
                    className="h-8 text-xs"
                    autoFocus
                  />
                ) : patient.conditions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.conditions.map((condition) => (
                      <span key={condition} className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary">{condition}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No conditions recorded. Click to add.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-heading"><AlertTriangle className="h-4 w-4 text-warning" /> Allergies</CardTitle>
                  {!editingAllergies ? null : (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingAllergies(false)}>
                        <X className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => {
                        const arr = allergiesDraft.split(",").map(s => s.trim()).filter(Boolean);
                        updatePatient.mutate({ allergies: arr as any });
                        setEditingAllergies(false);
                      }}>
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent 
                className={!editingAllergies ? "cursor-pointer hover:bg-secondary/10 transition-colors rounded-b-lg min-h-[60px]" : ""}
                onClick={() => !editingAllergies && setEditingAllergies(true)}
              >
                {editingAllergies ? (
                  <Input 
                    value={allergiesDraft} 
                    onChange={(e) => {
                      const minorWords = ["a", "an", "the", "and", "as", "at", "but", "by", "for", "if", "in", "nor", "of", "on", "or", "so", "to", "up", "yet"];
                      let val = e.target.value;
                      val = val.split(' ').map((word, index) => {
                        if (index > 0 && minorWords.includes(word.toLowerCase())) {
                          return word.toLowerCase();
                        }
                        return word.charAt(0).toUpperCase() + word.slice(1);
                      }).join(' ');
                      setAllergiesDraft(val);
                    }}
                    placeholder="Enter allergies separated by commas..."
                    className="h-8 text-xs"
                    autoFocus
                  />
                ) : patient.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies.map((allergy) => (
                      <span key={allergy} className="rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-xs text-destructive">{allergy}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No known allergies. Click to add.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-heading"><ClipboardList className="h-4 w-4 text-primary" /> Dental History</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {patient.dentalHistory ? (
                  <>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground text-xs uppercase font-semibold">Oral Hygiene:</span>
                      <span className="font-medium">{patient.dentalHistory.hygiene || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1">
                      <span className="text-muted-foreground text-xs uppercase font-semibold">Tobacco Use:</span>
                      <span className="font-medium text-destructive">{patient.dentalHistory.tobacco || "No"}</span>
                    </div>
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Relevant History/Complaints:</span>
                      <p className="rounded-md bg-secondary/30 p-2 italic text-xs leading-relaxed">{patient.dentalHistory.history || "No notes provided."}</p>
                    </div>
                  </>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground italic">No dental history recorded.</p>
                )}
              </CardContent>
            </Card>



            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-heading"><FileText className="h-4 w-4 text-primary" /> Clinical Notes</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-[10px] text-primary"
                      onClick={async () => {
                        if (!patient.notes) return;
                        toast.promise(api.refineClinicalNotes(patient.notes), {
                          loading: 'Refining notes...',
                          success: (res: any) => {
                            updatePatient.mutate({ notes: res.data });
                            return 'Notes refined!';
                          },
                          error: 'Failed to refine notes'
                        });
                      }}
                    >
                      <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>✨</motion.span> Refine
                    </Button>
                    {!editingNotes ? null : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingNotes(false)}>
                          <X className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => {
                          updatePatient.mutate({ notes: notesDraft });
                          setEditingNotes(false);
                        }}>
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent 
                className={!editingNotes ? "cursor-pointer hover:bg-secondary/10 transition-colors rounded-b-lg min-h-[100px]" : ""}
                onClick={() => !editingNotes && setEditingNotes(true)}
              >
                {editingNotes ? (
                  <AutocorrectTextarea 
                    value={notesDraft}
                    onChange={(e) => {
                      const minorWords = ["a", "an", "the", "and", "as", "at", "but", "by", "for", "if", "in", "nor", "of", "on", "or", "so", "to", "up", "yet"];
                      let val = e.target.value;
                      val = val.split(' ').map((word, index) => {
                        if (index > 0 && minorWords.includes(word.toLowerCase())) {
                          return word.toLowerCase();
                        }
                        return word.charAt(0).toUpperCase() + word.slice(1);
                      }).join(' ');
                      setNotesDraft(val);
                    }}
                    className="min-h-[100px] text-sm"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{patient.notes || "No additional notes recorded. Click to edit."}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dental-chart" className="mt-4 space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-heading"><Smile className="h-4 w-4" /> Interactive Dental Chart</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingChart ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <DentalChart 
                  teeth={dentalChartData?.teeth || []} 
                  onTeethChange={(newTeeth) => updateDentalChart.mutate(newTeeth)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-4 space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-heading"><Receipt className="h-4 w-4 text-primary" /> Patient Invoices</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => refetchInvoices()}>
                    Refresh
                  </Button>
                  <Button size="sm" onClick={() => setIsNewInvoiceOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> New Invoice
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {invoices && invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border/50 p-4 transition-colors hover:bg-secondary/20">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Receipt className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{inv.id}</p>
                          <p className="text-xs text-muted-foreground">{inv.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right mr-4">
                          <p className="text-base font-bold">₹{inv.total.toLocaleString()}</p>
                          <StatusBadge status={inv.status} />
                          {inv.status === "Partially Paid" && (
                            <p className="text-xs font-bold text-destructive mt-1">
                              Due: ₹{(inv.total - (inv.paidAmount || 0)).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            {inv.status === "Paid" ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="h-8 text-[10px] px-2 text-amber-600 border-amber-200 hover:bg-amber-50 mr-2"
                                    onClick={() => updateInvoiceStatus.mutate({ invId: inv.id, status: "Pending" })}
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
                                    disabled={updateInvoiceStatus.isPending}
                                  >
                                    <CheckCircle className="mr-1 h-3 w-3" /> Mark Payment <ChevronDown className="ml-1 h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => updateInvoiceStatus.mutate({ invId: inv.id, status: "Paid" })}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Full Payment
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedInvoiceForPayment(inv);
                                    setAdditionalPayment("");
                                    setIsPartialPaymentOpen(true);
                                  }}>
                                    <CreditCard className="mr-2 h-4 w-4 text-primary" /> Partial Payment
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewingInvoice(inv)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>View Details</p></TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingInvoice(inv)}>
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Edit Invoice</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => pdfService.generateInvoicePDF(patient, inv)}>
                                  <FileDown className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Download PDF</p></TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                                  toast.promise(api.sendInvoiceWhatsapp(inv.id), {
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
                                  toast.promise(api.sendInvoiceEmail(inv.id), {
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
                                  if (window.confirm("Delete this invoice?")) deleteInvoice.mutate(inv.id);
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
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground italic">No invoices recorded for this patient.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-4 space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base font-heading"><ClipboardList className="h-4 w-4 text-primary" /> Patient Prescriptions</CardTitle>
                <Button size="sm" onClick={() => navigate(`/prescriptions?patientId=${id}`)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> New Prescription
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {prescriptions && prescriptions.length > 0 ? (
                <div className="space-y-3">
                  {prescriptions.map((px) => (
                    <div key={px.id} className="flex items-center justify-between rounded-lg border border-border/50 p-4 transition-colors hover:bg-secondary/20">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <ClipboardList className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Prescription - {new Date(px.date).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">{px.doctorName || "Dr. Saikiran"}</p>
                          {px.nextVisitDate && (
                            <p className="mt-1 text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-sm inline-block">
                              Follow-up: {new Date(px.nextVisitDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-medium">{px.medicines.length} Medicines</p>
                          <p className="text-[10px] text-muted-foreground">{px.id}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/prescriptions?editId=${px.id}`)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>View Prescription</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(`/prescriptions?editId=${px.id}`)}>
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Edit Prescription</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8"
                                  onClick={() => pdfService.generatePrescriptionPDF(patient, px)}
                                >
                                  <FileDown className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Download PDF</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8"
                                  onClick={() => {
                                    toast.promise(api.sendPrescriptionWhatsapp(px.id), {
                                      loading: 'Sending...',
                                      success: 'Sent!',
                                      error: 'Error'
                                    });
                                  }}
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Send via WhatsApp</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8"
                                  onClick={() => {
                                    toast.promise(api.sendPrescriptionEmail(px.id), {
                                      loading: 'Sending...',
                                      success: 'Sent!',
                                      error: 'Error'
                                    });
                                  }}
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Send via Email</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this prescription?")) {
                                      deletePrescription.mutate(px.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Delete Prescription</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground italic">No prescriptions recorded for this patient.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treatment-plans" className="mt-4 space-y-4">
          <TreatmentPlansSection patientId={id} patientName={patient.name} />
        </TabsContent>

        <TabsContent value="diagnoses" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-heading"><Smile className="h-4 w-4" /> Diagnoses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {diagnoses.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No diagnoses recorded</div>
              ) : (
                diagnoses.map((diagnosis) => (
                  <div key={diagnosis.id} className="rounded-lg border border-border/50 bg-secondary/25 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{diagnosis.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{diagnosis.icd10 ? `ICD-10 ${diagnosis.icd10} · ` : ""}{diagnosis.recordedOn}</p>
                      </div>
                      <Badge variant={diagnosis.status === "Active" ? "default" : "secondary"} className="text-xs">{diagnosis.status}</Badge>
                    </div>
                    {diagnosis.notes && <p className="mt-2 text-sm text-muted-foreground">{diagnosis.notes}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allergies" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-6">
              {patient.allergies.length > 0 ? (
                <div className="space-y-3">
                  {patient.allergies.map((allergy) => (
                    <div key={allergy} className="flex items-center gap-3 rounded-lg border border-destructive/10 bg-destructive/5 p-3">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium">{allergy}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No known allergies</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medications" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-6">
              {patient.medications.length > 0 ? (
                <div className="space-y-3">
                  {patient.medications.map((medication, index) => (
                    <div key={`${medication.name}-${index}`} className="rounded-lg border border-border/50 bg-secondary/40 p-4">
                      <p className="font-medium">{medication.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground"><Pill className="mr-1 inline h-4 w-4" /> {medication.dosage} · {medication.frequency}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No active medications</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
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
      <InvoiceEditModal
        open={isNewInvoiceOpen}
        onOpenChange={setIsNewInvoiceOpen}
        patientId={id}
        patientName={patient.name}
      />
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

                api.updateInvoice(selectedInvoiceForPayment.id, { 
                  paidAmount: newPaid, 
                  status: newStatus,
                  payments: newPayments
                }).then(() => {
                  queryClient.invalidateQueries({ queryKey: ["invoices"] });
                  queryClient.invalidateQueries({ queryKey: ["invoices", id] });
                  toast.success("Payment recorded");
                  setIsPartialPaymentOpen(false);
                  setAdditionalPayment("");
                }).catch((err) => {
                  toast.error(err instanceof Error ? err.message : "Failed to record payment");
                });
              }}
            >
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

interface TreatmentPhase {
  id: string;
  name: string;
  description: string;
  toothNumbers: number[];
  estimatedCost: number;
  status: 'Planned' | 'In Progress' | 'Completed';
  scheduledDate?: string;
  completedDate?: string;
}

interface TreatmentPlan {
  id: string;
  patientId: string;
  patientName: string;
  dentistName: string;
  createdDate: string;
  totalCost: number;
  status: 'Active' | 'Completed' | 'On Hold';
  notes: string;
  phases: TreatmentPhase[];
}

interface TreatmentPlansSectionProps {
  patientId: string;
  patientName: string;
}

const TreatmentPlansSection: React.FC<TreatmentPlansSectionProps> = ({ patientId, patientName }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["treatment-plans", patientId],
    queryFn: () => api.getTreatmentPlans(patientId),
  });

  const [showDialog, setShowDialog] = useState(false);
  const [newPlan, setNewPlan] = useState({ notes: '', dentistName: 'Dr. Saikiran', phases: [] as TreatmentPhase[] });
  const [newPhase, setNewPhase] = useState({ name: '', description: '', cost: 1000 });

  const generateAIPlanMutation = useMutation({
    mutationFn: (findings: string) => api.generateAITreatmentPlan(findings),
    onSuccess: (res: any) => {
      const suggested = res.data;
      setNewPlan({
        ...newPlan,
        notes: suggested.notes || newPlan.notes,
        phases: suggested.phases.map((p: any) => ({
          id: `PH_${Date.now()}_${Math.random()}`,
          name: p.name,
          description: p.items.join(', '),
          estimatedCost: parseInt(p.estimatedCost.replace(/[^0-9]/g, '')) || 0,
          status: 'Planned',
          toothNumbers: []
        }))
      });
      toast.success("AI Suggested a Treatment Plan!");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "AI failed to suggest a plan"),
  });

  const { data: tpTemplates = [] } = useQuery({
    queryKey: ["treatment-plan-templates"],
    queryFn: () => api.getTreatmentPlanTemplates(),
  });

  const saveAsTemplateMutation = useMutation({
    mutationFn: (payload: any) => api.createTreatmentPlanTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatment-plan-templates"] });
      toast.success('Template saved successfully');
    },
  });

  const applyTemplate = (templateId: string) => {
    const template = tpTemplates.find(t => t.id === templateId);
    if (template) {
      setNewPlan({
        ...newPlan,
        notes: template.notes || newPlan.notes,
        phases: [...template.phases].map(p => ({ ...p, id: `PH_${Date.now()}_${Math.random()}` }))
      });
      toast.success(`Template "${template.name}" applied`);
    }
  };

  const createPlanMutation = useMutation({
    mutationFn: (payload: any) => api.createTreatmentPlan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatment-plans", patientId] });
      setShowDialog(false);
      setNewPlan({ notes: '', dentistName: 'Dr. Saikiran', phases: [] });
      toast.success('Treatment plan created');
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: any }) => api.updateTreatmentPlan(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatment-plans", patientId] });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => api.deleteTreatmentPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatment-plans", patientId] });
      toast.success('Treatment plan deleted');
    },
  });

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const addPlan = () => {
    if (newPlan.phases.length === 0) {
      toast.error('Add at least one phase to the plan');
      return;
    }
    if (editingPlanId) {
      updatePlanMutation.mutate({
        id: editingPlanId,
        payload: {
          notes: newPlan.notes,
          phases: newPlan.phases,
          totalCost: newPlan.phases.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
        }
      });
    } else {
      createPlanMutation.mutate({
        patientId,
        dentistName: newPlan.dentistName,
        notes: newPlan.notes,
        phases: newPlan.phases,
        totalCost: newPlan.phases.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
        status: 'Active',
      });
    }
  };

  const addPhase = () => {
    if (!newPhase.name.trim()) {
      toast.error('Enter phase name');
      return;
    }
    const phase: TreatmentPhase = {
      id: `PH_${Date.now()}`,
      name: newPhase.name,
      description: newPhase.description,
      toothNumbers: [],
      estimatedCost: newPhase.cost,
      status: 'Planned',
    };
    setNewPlan({ ...newPlan, phases: [...newPlan.phases, phase] });
    setNewPhase({ name: '', description: '', cost: 1000 });
    toast.success('Phase added');
  };

  const updatePhaseStatus = (plan: TreatmentPlan, phaseId: string, status: TreatmentPhase['status']) => {
    const updatedPhases = plan.phases.map(ph =>
      ph.id === phaseId
        ? { ...ph, status, completedDate: status === 'Completed' ? new Date().toISOString().slice(0, 10) : undefined }
        : ph
    );
    
    updatePlanMutation.mutate({
      id: plan.id,
      payload: { phases: updatedPhases }
    });
    toast.success(`Phase marked as ${status}`);
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-heading font-semibold">Treatment Plans</h3>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New Plan</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">{editingPlanId ? 'Edit Treatment Plan' : 'Create Treatment Plan'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2 items-end p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-bold uppercase text-primary">Load Quick Template</Label>
                  <Select onValueChange={applyTemplate}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select a treatment template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tpTemplates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                      {tpTemplates.length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground italic">
                          No templates saved yet
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-white"
                  disabled={newPlan.phases.length === 0}
                  onClick={() => {
                    const name = prompt("Enter template name:");
                    if (name) {
                      saveAsTemplateMutation.mutate({ name, phases: newPlan.phases, notes: newPlan.notes });
                    }
                  }}
                >
                  <Save className="mr-2 h-4 w-4" /> Save current as Template
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Clinical Notes / Findings</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] text-primary"
                    disabled={!newPlan.notes || generateAIPlanMutation.isPending}
                    onClick={() => generateAIPlanMutation.mutate(newPlan.notes)}
                  >
                    {generateAIPlanMutation.isPending ? "Suggesting..." : "✨ AI Suggest Plan"}
                  </Button>
                </div>
                <Textarea
                  value={newPlan.notes}
                  onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
                  placeholder="Paste clinical findings here and click AI Suggest..."
                  className="min-h-20"
                />
              </div>

              <div className="rounded-lg border border-border/50 p-4 space-y-3">
                <p className="font-heading font-semibold text-sm">Treatment Phases ({newPlan.phases.length})</p>
                <div className="space-y-2">
                  <Input
                    placeholder="Phase name (e.g., Root Canal Treatment)"
                    value={newPhase.name}
                    onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
                  />
                  <Textarea
                    placeholder="Phase description"
                    value={newPhase.description}
                    onChange={(e) => setNewPhase({ ...newPhase, description: e.target.value })}
                    className="min-h-16"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Cost"
                      value={newPhase.cost}
                      onChange={(e) => setNewPhase({ ...newPhase, cost: Number(e.target.value) })}
                    />
                    <Button onClick={addPhase} variant="outline">Add Phase</Button>
                  </div>
                </div>

                {newPlan.phases.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {newPlan.phases.map((phase, i) => (
                      <div key={phase.id} className="flex items-center justify-between rounded-md bg-secondary/20 px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">{i + 1}. {phase.name}</p>
                          <p className="text-xs text-muted-foreground">₹{phase.estimatedCost}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setNewPlan({ ...newPlan, phases: newPlan.phases.filter(p => p.id !== phase.id) })}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={addPlan} className="flex-1" disabled={createPlanMutation.isPending || updatePlanMutation.isPending}>
                  {editingPlanId ? (updatePlanMutation.isPending ? 'Updating...' : 'Update Plan') : (createPlanMutation.isPending ? 'Creating...' : 'Create Plan')}
                </Button>
                <Button variant="outline" onClick={() => { setShowDialog(false); setEditingPlanId(null); setNewPlan({ notes: '', dentistName: 'Dr. Saikiran', phases: [] }); }}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {plans.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <ClipboardList className="mx-auto h-8 w-8 opacity-20 mb-2" />
            No treatment plans created yet
          </CardContent>
        </Card>
      ) : (
        plans.map(plan => (
          <Card key={plan.id} className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{plan.notes || 'Untitled Plan'}</CardTitle>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-bold text-primary mr-2">₹{(plan.totalCost || 0).toLocaleString()}</p>
                  <Badge variant={plan.status === 'Active' ? 'default' : plan.status === 'Completed' ? 'secondary' : 'outline'}>
                    {plan.status}
                  </Badge>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => {
                      // If it's generated from a prescription, navigate there
                      const pxMatch = plan.notes?.match(/Prescription (PR\d+)/);
                      if (pxMatch) {
                        navigate(`/prescriptions?editId=${pxMatch[1]}`);
                      } else {
                        setNewPlan({ notes: plan.notes, dentistName: plan.dentistName, phases: [...plan.phases] });
                        setEditingPlanId(plan.id);
                        setShowDialog(true);
                      }
                    }}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this treatment plan?")) {
                        deletePlanMutation.mutate(plan.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Created {plan.createdDate} by {plan.dentistName}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {plan.phases.map((phase, i) => (
                  <div key={phase.id} className="rounded-lg border border-border/50 bg-secondary/20 p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{i + 1}. {phase.name}</p>
                        {phase.description && <p className="text-xs text-muted-foreground mt-1">{phase.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">₹{phase.estimatedCost}</p>
                      </div>
                      <Select 
                        value={phase.status} 
                        onValueChange={(value) => updatePhaseStatus(plan, phase.id, value as TreatmentPhase['status'])}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Planned">Planned</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default PatientProfile;
