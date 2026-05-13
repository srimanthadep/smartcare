import React, { useMemo, useRef, useState, useEffect } from "react";
import { Medication } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, MessageCircle, Plus, Printer, Search, Share2, Trash2, Sparkles, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { AutocorrectTextarea } from "@/components/AutocorrectTextarea";
import { MedicineCombobox } from "@/components/MedicineCombobox";
import { PatientCombobox } from "@/components/PatientCombobox";
import PrescriptionTemplateModal from "@/components/PrescriptionTemplateModal";
import { pdfService } from "@/lib/pdfService";

const Prescriptions: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get("patientId");
  const editId = searchParams.get("editId");
  const printRef = useRef<HTMLDivElement | null>(null);
  const editorSectionRef = useRef<HTMLDivElement | null>(null);
  const nextVisitInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [patientId, setPatientId] = useState(urlPatientId || "");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const patientDetailsQuery = useQuery({
    queryKey: ["patients", patientId],
    queryFn: () => api.getPatient(patientId),
    enabled: !!patientId && !selectedPatient,
  });

  const patient = selectedPatient || patientDetailsQuery.data?.patient;
  const bootstrapQuery = useQuery({
    queryKey: ["bootstrap"],
    queryFn: api.getBootstrap,
  });
  const prescriptionsQuery = useQuery({
    queryKey: ["prescriptions"],
    queryFn: () => api.getPrescriptions(),
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
        if (typeof res.data.diagnosis === 'object' && res.data.diagnosis) {
          const d = res.data.diagnosis as any;
          setDiagnosis(`Primary: ${d.primary || 'N/A'}\nDifferential: ${d.differential || 'N/A'}\nNotes: ${d.notes || ''}`.trim());
        } else {
          setDiagnosis(res.data.diagnosis as string);
        }
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

  const bootstrap = bootstrapQuery.data;
  const savedPrescriptions = prescriptionsQuery.data || [];

  const [doctorName, setDoctorName] = useState("");
  const [listQuery, setListQuery] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [templateId, setTemplateId] = useState("none");
  const [notes, setNotes] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<Medication[]>([{ name: "", dosage: "", frequency: "", duration: "" }]);
  const filteredPrescriptions = useMemo(() => {
    const query = listQuery.trim().toLowerCase();
    if (!query) {
      return savedPrescriptions;
    }
    return savedPrescriptions.filter((item) => {
      const patientName = (item.patientName ?? "").toLowerCase();
      const id = (item.id ?? "").toLowerCase();
      return patientName.includes(query) || id.includes(query);
    });
  }, [savedPrescriptions, listQuery]);


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
        setTreatmentPlan(px.treatmentPlan || []);
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
      nextVisitDate,
      treatmentPlan
    };

    if (editId) {
      updatePrescription.mutate(payload);
    } else {
      createPrescription.mutate(payload);
    }
  };

  const applyTemplate = (value: string) => {
    setTemplateId(value);
    const template = bootstrap?.prescriptionTemplates?.find((item: any) => item.id === value);
    if (!template) return;
    setMedicines(template.medicines.map((item: any) => ({ ...item })));
    setNotes(template.notes || "");
    toast.message(`Template applied: ${template.name}`);
  };

  if (bootstrapQuery.isLoading || prescriptionsQuery.isLoading || (!!patientId && !patient && patientDetailsQuery.isLoading)) {
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
                nextVisitDate,
                treatmentPlan
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

      <div className="sticky top-16 z-20 md:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
            placeholder="Search prescriptions..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredPrescriptions.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No prescriptions found. Use the form below to create a new prescription.
            </CardContent>
          </Card>
        ) : (
          filteredPrescriptions.map((item) => (
            <Card key={item.id} className="border-border/50">
              <CardContent className="space-y-2 p-3">
                <p className="font-medium">{item.patientName}</p>
                <p className="text-xs text-muted-foreground">{item.date}</p>
                <p className="text-xs text-muted-foreground">{item.medicines.length} medicines</p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/prescriptions?editId=${item.id}`)}>
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      toast.promise(api.sendPrescriptionWhatsapp(item.id), {
                        loading: "Sending prescription via WhatsApp...",
                        success: "Prescription sent successfully!",
                        error: "Failed to send WhatsApp message",
                      })
                    }
                  >
                    WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div ref={editorSectionRef} className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
                <PatientCombobox
                  value={patientId}
                  initialLabel={patient?.name}
                  onSelect={(p) => {
                    setPatientId(p.id);
                    setSelectedPatient(p);
                  }}
                />
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
                    {bootstrap.prescriptionTemplates?.map((template: any) => (
                      <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-primary font-bold">1. Chief Complaint</Label>
                <AutocorrectTextarea
                  value={chiefComplaint}
                  onChange={(e) => {
                    const minorWords = ["a", "an", "the", "and", "as", "at", "but", "by", "for", "if", "in", "nor", "of", "on", "or", "so", "to", "up", "yet"];
                    let val = e.target.value;
                    val = val.split(' ').map((word, index) => {
                      if (index > 0 && minorWords.includes(word.toLowerCase())) {
                        return word.toLowerCase();
                      }
                      return word.charAt(0).toUpperCase() + word.slice(1);
                    }).join(' ');
                    setChiefComplaint(val);
                  }}
                  placeholder="e.g. Severe toothache, Bleeding gums"
                  className="border-destructive/20"
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-primary font-bold">2. Diagnosis</Label>
                  <div className="flex items-center gap-2">
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
                <AutocorrectTextarea
                  value={diagnosis}
                  onChange={(e) => {
                    const minorWords = ["a", "an", "the", "and", "as", "at", "but", "by", "for", "if", "in", "nor", "of", "on", "or", "so", "to", "up", "yet"];
                    let val = e.target.value;
                    val = val.split(' ').map((word, index) => {
                      if (index > 0 && minorWords.includes(word.toLowerCase())) {
                        return word.toLowerCase();
                      }
                      return word.charAt(0).toUpperCase() + word.slice(1);
                    }).join(' ');
                    setDiagnosis(val);
                  }}
                  placeholder="e.g. Acute Pulpitis, Periodontitis"
                />
              </div>
            </div>

            <Separator />

            {/* 3. Treatment Plan */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-primary">3. Treatment Plan</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] uppercase font-bold"
                  onClick={() => setTreatmentPlan([...treatmentPlan, { id: `TP-${Date.now()}`, name: "", description: "", estimatedCost: 0, status: "Planned", toothNumbers: [] }])}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Phase
                </Button>
              </div>

              <AnimatePresence>
                {treatmentPlan.map((phase, idx) => (
                  <motion.div
                    key={phase.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3 border rounded-lg bg-indigo-50/30 space-y-3 relative"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 text-destructive hover:bg-destructive/10"
                      onClick={() => setTreatmentPlan(treatmentPlan.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>

                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-12 sm:col-span-8">
                        <Input
                          placeholder="Phase Name (e.g. Root Canal Treatment)"
                          value={phase.name}
                          onChange={(e) => {
                            const minorWords = ["a", "an", "the", "and", "as", "at", "but", "by", "for", "if", "in", "nor", "of", "on", "or", "so", "to", "up", "yet"];
                            let val = e.target.value;
                            val = val.split(' ').map((word, index) => {
                              if (index > 0 && minorWords.includes(word.toLowerCase())) {
                                return word.toLowerCase();
                              }
                              return word.charAt(0).toUpperCase() + word.slice(1);
                            }).join(' ');
                            setTreatmentPlan(treatmentPlan.map((p, i) => i === idx ? { ...p, name: val } : p));
                          }}
                          className="h-8 text-sm font-medium"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-4">
                        <Input
                          type="number"
                          placeholder="Cost"
                          value={phase.estimatedCost || ""}
                          onChange={(e) => setTreatmentPlan(treatmentPlan.map((p, i) => i === idx ? { ...p, estimatedCost: Number(e.target.value) } : p))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="col-span-12">
                        <Input
                          placeholder="Description / Tooth Numbers"
                          value={phase.description}
                          onChange={(e) => {
                            const minorWords = ["a", "an", "the", "and", "as", "at", "but", "by", "for", "if", "in", "nor", "of", "on", "or", "so", "to", "up", "yet"];
                            let val = e.target.value;
                            val = val.split(' ').map((word, index) => {
                              if (index > 0 && minorWords.includes(word.toLowerCase())) {
                                return word.toLowerCase();
                              }
                              return word.charAt(0).toUpperCase() + word.slice(1);
                            }).join(' ');
                            setTreatmentPlan(treatmentPlan.map((p, i) => i === idx ? { ...p, description: val } : p));
                          }}
                          className="h-8 text-xs bg-white/50"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {treatmentPlan.length === 0 && (
                <div className="text-center py-4 border border-dashed rounded-lg text-muted-foreground text-xs">
                  No treatment phases added. Recommended for complex procedures.
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Label className="text-primary font-bold">4. Medicines</Label>
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
                      <Input value={medicine.dosage} onChange={(event) => {
                        const minorWords = ["a", "an", "the", "and", "as", "at", "but", "by", "for", "if", "in", "nor", "of", "on", "or", "so", "to", "up", "yet"];
                        let val = event.target.value;
                        val = val.split(' ').map((word, index) => {
                          if (index > 0 && minorWords.includes(word.toLowerCase())) {
                            return word.toLowerCase();
                          }
                          return word.charAt(0).toUpperCase() + word.slice(1);
                        }).join(' ');
                        setMedicines((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, dosage: val } : item)));
                      }} placeholder="e.g. 1 tab" />
                    </div>
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Input value={medicine.frequency} onChange={(event) => {
                        const minorWords = ["a", "an", "the", "and", "as", "at", "but", "by", "for", "if", "in", "nor", "of", "on", "or", "so", "to", "up", "yet"];
                        let val = event.target.value;
                        val = val.split(' ').map((word, index) => {
                          if (index > 0 && minorWords.includes(word.toLowerCase())) {
                            return word.toLowerCase();
                          }
                          return word.charAt(0).toUpperCase() + word.slice(1);
                        }).join(' ');
                        setMedicines((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, frequency: val } : item)));
                      }} placeholder="e.g. BID" />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Input value={medicine.duration} onChange={(event) => {
                        const minorWords = ["a", "an", "the", "and", "as", "at", "but", "by", "for", "if", "in", "nor", "of", "on", "or", "so", "to", "up", "yet"];
                        let val = event.target.value;
                        val = val.split(' ').map((word, index) => {
                          if (index > 0 && minorWords.includes(word.toLowerCase())) {
                            return word.toLowerCase();
                          }
                          return word.charAt(0).toUpperCase() + word.slice(1);
                        }).join(' ');
                        setMedicines((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, duration: val } : item)));
                      }} placeholder="e.g. 5 days" />
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

            <div className="pt-2">
              <Label className="text-primary font-bold block mb-3">5. Next Visit & Notes</Label>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Schedule Follow-up</Label>
                    <div className="relative mt-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal rounded-xl border-amber-200 bg-amber-50/30 hover:bg-amber-50/50 transition-colors pl-10",
                              !nextVisitDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-600" />
                            {nextVisitDate ? format(new Date(nextVisitDate), "PPP") : <span>Pick a follow-up date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-white/60" align="start">
                          <Calendar
                            mode="single"
                            selected={nextVisitDate ? new Date(nextVisitDate) : undefined}
                            onSelect={(date) => setNextVisitDate(date ? format(date, "yyyy-MM-dd") : "")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-8">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Clinical Advice</Label>
                    <AutocorrectTextarea
                      value={notes}
                      onChange={(event) => {
                        const minorWords = ["a", "an", "the", "and", "as", "at", "but", "by", "for", "if", "in", "nor", "of", "on", "or", "so", "to", "up", "yet"];
                        let val = event.target.value;
                        val = val.split(' ').map((word, index) => {
                          if (index > 0 && minorWords.includes(word.toLowerCase())) {
                            return word.toLowerCase();
                          }
                          return word.charAt(0).toUpperCase() + word.slice(1);
                        }).join(' ');
                        setNotes(val);
                      }}
                      placeholder="Advice, follow-up, warnings..."
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              </div>
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

                  {treatmentPlan.length > 0 && (
                    <>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">3. Treatment Plan</p>
                        <div className="mt-2 space-y-2">
                          {treatmentPlan.map((phase, i) => (
                            <div key={i} className="flex justify-between items-start border-l-2 border-indigo-500 pl-3 py-1">
                              <div>
                                <p className="text-sm font-semibold">{phase.name || "Unnamed Phase"}</p>
                                {phase.description && <p className="text-[11px] text-muted-foreground">{phase.description}</p>}
                              </div>
                              <p className="text-sm font-bold text-indigo-700">₹{phase.estimatedCost?.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Separator className="opacity-50" />
                    </>
                  )}

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">4. Medicines</p>
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

      <Button
        size="icon"
        className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg md:hidden"
        onClick={() => editorSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
      >
        <Plus className="h-5 w-5" />
      </Button>
    </motion.div>
  );
};

export default Prescriptions;
