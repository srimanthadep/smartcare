import React, { useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, MessageCircle, Plus, Printer, Share2, Trash2, Sparkles, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { MedicineCombobox } from "@/components/MedicineCombobox";
import PrescriptionTemplateModal from "@/components/PrescriptionTemplateModal";
import { pdfService } from "@/lib/pdfService";

const Prescriptions: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get("patientId");
  const editId = searchParams.get("editId");
  const printRef = useRef<HTMLDivElement | null>(null);
  const nextVisitInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  const patientsQuery = useQuery({
    queryKey: ["patients", "prescriptions-options"],
    queryFn: () => api.getPatients({}),
  });
  const bootstrapQuery = useQuery({
    queryKey: ["bootstrap"],
    queryFn: api.getBootstrap,
  });
  const prescriptionsQuery = useQuery({
    queryKey: ["prescriptions"],
    queryFn: () => api.getPrescriptions(),
  });
  const templatesQuery = useQuery({
    queryKey: ["prescription-templates"],
    queryFn: api.getTemplates,
  });

  const createPrescription = useMutation({
    mutationFn: api.createPrescription,
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      toast.success("Prescription saved");
      if (res && res.id) {
        navigate(`/prescriptions?editId=${res.id}`, { replace: true });
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to save prescription"),
  });

  const updatePrescription = useMutation({
    mutationFn: (payload: any) => api.updatePrescription(editId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      toast.success("Prescription updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to update prescription"),
  });

  const generateAI = useMutation({
    mutationFn: api.generateAIPrescription,
    onSuccess: (res) => {
      if (res.data.diagnosis) {
        setDiagnosis(res.data.diagnosis);
      }
      if (res.data.medicines && res.data.medicines.length > 0) {
        setMedicines(res.data.medicines);
      }
      if (res.data.notes) {
        setNotes(res.data.notes);
      }
      toast.success("AI suggested prescription loaded. Please review carefully.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "AI generation failed"),
  });

  const patients = patientsQuery.data || [];
  const bootstrap = bootstrapQuery.data;
  const savedPrescriptions = prescriptionsQuery.data || [];

  const [patientId, setPatientId] = useState(urlPatientId || "");
  const [doctorName, setDoctorName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [templateId, setTemplateId] = useState("none");
  const [notes, setNotes] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [medicines, setMedicines] = useState([{ name: "", dosage: "", frequency: "", duration: "" }]);

  const patient = useMemo(() => patients.find((item) => item.id === patientId), [patientId, patients]);

  useEffect(() => {
    document.title = "Prescriptions | Siara Dental";
  }, []);

  useEffect(() => {
    if (patient && !editId) {
      setChiefComplaint(patient.chiefComplaint || "");
    }
  }, [patient, editId]);

  useEffect(() => {
    if (editId && savedPrescriptions.length > 0) {
      const px = savedPrescriptions.find(p => p.id === editId);
      if (px) {
        setPatientId(px.patientId);
        setDoctorName(px.doctorName);
        setDate(px.date);
        setMedicines(px.medicines);
        setNotes(px.notes);
        setChiefComplaint(px.chiefComplaint || "");
        setDiagnosis(px.diagnosis || "");
        setNextVisitDate(px.nextVisitDate || "");
      }
    }
  }, [editId, savedPrescriptions]);

  const handleSave = () => {
    if (!patient) {
      toast.error("Select a patient");
      return;
    }
    if (medicines.some((item) => !item.name.trim())) {
      toast.error("Select medicines before saving");
      return;
    }
    
    const payload = {
      patientId,
      patientName: patient.name,
      doctorName,
      date,
      medicines,
      notes,
      chiefComplaint,
      diagnosis,
      nextVisitDate
    };

    if (editId) {
      updatePrescription.mutate(payload);
    } else {
      createPrescription.mutate(payload);
    }
  };

  const applyTemplate = (value: string) => {
    setTemplateId(value);
    const template = templatesQuery.data?.data?.find((item: any) => item.id === value);
    if (!template) return;
    setMedicines(template.medicines.map((item: any) => ({ ...item })));
    setNotes(template.notes || "");
    toast.message(`Template applied: ${template.name}`);
  };

  if (patientsQuery.isLoading || bootstrapQuery.isLoading || prescriptionsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!bootstrap) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="py-4 text-sm text-destructive">Failed to load prescription data.</CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Prescriptions</h1>
          <p className="text-sm text-muted-foreground">Create, print and track prescriptions</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PrescriptionTemplateModal />
          <Button 
            variant="outline" 
            onClick={() => {
              if (!patient) {
                toast.error("Select a patient to generate PDF");
                return;
              }
              pdfService.generatePrescriptionPDF(patient, {
                id: editId || "DRAFT",
                patientId,
                patientName: patient.name,
                doctorName,
                date,
                medicines,
                notes,
                chiefComplaint,
                diagnosis,
                nextVisitDate
              });
            }}
          >
            <Printer className="mr-1 h-4 w-4" /> Print PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              if (!editId) {
                toast.error("Please save the prescription before sending via WhatsApp");
                return;
              }
              toast.promise(api.sendPrescriptionWhatsapp(editId), {
                loading: 'Sending prescription via WhatsApp...',
                success: 'Prescription sent successfully!',
                error: 'Failed to send WhatsApp message'
              });
            }}
          >
            <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
          </Button>
          <Button
            onClick={handleSave}
            disabled={createPrescription.isPending || updatePrescription.isPending}
          >
            <Plus className="mr-1 h-4 w-4" /> {(createPrescription.isPending || updatePrescription.isPending) ? "Saving..." : (editId ? "Update" : "Save")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className={cn("border-border/50 transition-colors duration-300", generateAI.isSuccess && "border-amber-500/50")}>
          {generateAI.isSuccess && (
            <div className="bg-amber-500/10 text-amber-600 px-5 py-3 text-sm font-medium border-b border-amber-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Suggested Prescription — Doctor Approval Required
            </div>
          )}
          <CardContent className="space-y-5 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name} ({item.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Doctor</Label>
                <Select value={doctorName} onValueChange={setDoctorName}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    {bootstrap.doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.name}>{doctor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={templateId} onValueChange={(value) => (value === "none" ? setTemplateId("none") : applyTemplate(value))}>
                  <SelectTrigger><SelectValue placeholder="Choose template" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {templatesQuery.data?.data?.map((template: any) => (
                      <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-destructive font-bold">1. Chief Complaint</Label>
                <Textarea 
                  value={chiefComplaint} 
                  onChange={(e) => setChiefComplaint(e.target.value)} 
                  placeholder="e.g. Severe toothache, Bleeding gums"
                  className="border-destructive/20"
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-bold">2. Diagnosis</Label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="group flex items-center gap-2 border border-amber-200 bg-amber-50/50 hover:bg-amber-100/80 transition-all duration-300 px-4 h-8 rounded-full shadow-sm shadow-amber-200/20 cursor-pointer relative"
                    >
                      <span className="text-[9px] uppercase font-bold text-amber-600/80 tracking-tight leading-none">Next Visit</span>
                      <span className="text-[11px] font-bold text-amber-900 min-w-[70px] text-center">
                        {nextVisitDate ? new Date(nextVisitDate).toLocaleDateString('en-GB').replace(/\//g, '-') : 'dd-mm-yyyy'}
                      </span>
                      <Input 
                        type="date" 
                        value={nextVisitDate} 
                        onChange={(e) => setNextVisitDate(e.target.value)} 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full p-0 border-none"
                      />
                    </div>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="h-8 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all duration-300 rounded-full px-3 border-none text-[10px] font-bold uppercase tracking-tight"
                      onClick={() => {
                        if (!patientId) {
                          toast.error("Please select a patient first.");
                          return;
                        }
                        if (!chiefComplaint.trim()) {
                          toast.error("Please enter a chief complaint first.");
                          return;
                        }
                        generateAI.mutate({ patientId, context: chiefComplaint });
                      }}
                      disabled={generateAI.isPending}
                    >
                      <Sparkles className="mr-2 h-3.5 w-3.5 text-indigo-200" /> 
                      {generateAI.isPending ? "Generating..." : "Auto Generate"}
                    </Button>
                  </div>
                </div>
                <Textarea 
                  value={diagnosis} 
                  onChange={(e) => setDiagnosis(e.target.value)} 
                  placeholder="e.g. Acute Pulpitis, Periodontitis"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="font-heading font-semibold text-primary">3. Medicines</p>
              </div>
              {medicines.map((medicine, index) => (
                <div key={index} className="rounded-lg border border-border/50 bg-secondary/20 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Medicine</Label>
                      <MedicineCombobox 
                        value={medicine.name}
                        onChange={(value, selectedMedicine) => {
                          setMedicines((current) => current.map((item, itemIndex) => {
                            if (itemIndex === index) {
                              const updates: any = { name: value };
                              if (selectedMedicine) {
                                if (selectedMedicine.strength) updates.dosage = selectedMedicine.strength;
                                if (selectedMedicine.frequency) updates.frequency = selectedMedicine.frequency;
                                if (selectedMedicine.duration) updates.duration = selectedMedicine.duration;
                              }
                              return { ...item, ...updates };
                            }
                            return item;
                          }));
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dosage</Label>
                      <Input value={medicine.dosage} onChange={(event) => setMedicines((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, dosage: event.target.value } : item)))} placeholder="e.g. 1 tab" />
                    </div>
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Input value={medicine.frequency} onChange={(event) => setMedicines((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, frequency: event.target.value } : item)))} placeholder="e.g. BID" />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Input value={medicine.duration} onChange={(event) => setMedicines((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, duration: event.target.value } : item)))} placeholder="e.g. 5 days" />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setMedicines((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={medicines.length === 1}>
                      <Trash2 className="mr-1 h-4 w-4" /> Remove
                    </Button>
                  </div>
                </div>
              ))}

              <Button 
                size="sm" 
                variant="outline" 
                className="w-full border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5 text-primary py-6"
                onClick={() => setMedicines((current) => [...current, { name: "", dosage: "", frequency: "", duration: "" }])}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Another Medicine
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Advice, follow-up, warnings..." />
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => toast.message("Share flow would generate a secure PDF link.")}>
                <Share2 className="mr-1 h-4 w-4" /> Share
              </Button>
              <p className="text-xs text-muted-foreground">{savedPrescriptions.length} prescriptions saved</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-0">
            <div ref={printRef} className="p-6 print:p-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-heading font-bold">Siara Dental Prescription</p>
                  <p className="mt-1 text-sm text-muted-foreground">For clinical use</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{doctorName || "Select doctor"}</p>
                  <p className="text-xs text-muted-foreground">{date}</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/50 p-4">
                  <p className="text-xs text-muted-foreground">Patient</p>
                  <p className="mt-1 font-medium">{patient?.name || "-"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{patient ? `${patient.id} · ${patient.age}y · ${patient.gender}` : "Select a patient"}</p>
                </div>
                <div className="rounded-lg border border-border/50 p-4">
                  <p className="text-xs text-muted-foreground">Allergies</p>
                  <p className="mt-1 text-sm">{patient?.allergies?.length ? patient.allergies.join(", ") : "No known allergies"}</p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-border/50">
                <div className="flex items-center gap-2 bg-secondary/40 px-4 py-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Prescription (Rx)</p>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">1. Chief Complaint</p>
                    <p className="mt-1 text-sm font-medium text-destructive">{chiefComplaint || "-"}</p>
                  </div>
                  
                  <Separator className="opacity-50" />
                  
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">2. Diagnosis</p>
                    <p className="mt-1 text-sm">{diagnosis || "-"}</p>
                  </div>

                  <Separator className="opacity-50" />

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">3. Medicines</p>
                    <div className="mt-2 space-y-3">
                      {medicines.map((medicine, index) => (
                        <div key={index}>
                          <p className="font-medium text-sm">{medicine.name || "-"}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{medicine.dosage || "-"} · {medicine.frequency || "-"} · {medicine.duration || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-border/50 p-4">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{notes || "-"}</p>
              </div>

              {nextVisitDate && (
                <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-600/70 font-bold">Next Visit Schedule</p>
                    <p className="text-sm font-semibold text-amber-700">{new Date(nextVisitDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default Prescriptions;
