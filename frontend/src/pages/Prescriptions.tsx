import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, MessageCircle, Plus, Printer, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const Prescriptions: React.FC = () => {
  const printRef = useRef<HTMLDivElement | null>(null);
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
  const createPrescription = useMutation({
    mutationFn: api.createPrescription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      toast.success("Prescription saved");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to save prescription"),
  });

  const patients = patientsQuery.data || [];
  const bootstrap = bootstrapQuery.data;
  const savedPrescriptions = prescriptionsQuery.data || [];

  const [patientId, setPatientId] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [templateId, setTemplateId] = useState("none");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState([{ name: "", dosage: "", frequency: "", duration: "" }]);

  const patient = useMemo(() => patients.find((item) => item.id === patientId), [patientId, patients]);

  const applyTemplate = (value: string) => {
    setTemplateId(value);
    const template = bootstrap?.prescriptionTemplates.find((item) => item.id === value);
    if (!template) return;
    setMedicines(template.medicines.map((item) => ({ ...item })));
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
          <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> Print</Button>
          <Button variant="outline" onClick={() => toast.message("Share flow would generate a PDF link.")}>
            <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
          </Button>
          <Button
            onClick={() => {
              if (!patient) {
                toast.error("Select a patient");
                return;
              }
              if (medicines.some((item) => !item.name.trim())) {
                toast.error("Select medicines before saving");
                return;
              }
              createPrescription.mutate({
                patientId,
                patientName: patient.name,
                doctorName,
                date,
                medicines,
                notes,
              });
            }}
            disabled={createPrescription.isPending}
          >
            <Plus className="mr-1 h-4 w-4" /> {createPrescription.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="border-border/50">
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
                    {bootstrap.prescriptionTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-heading font-semibold">Medicines</p>
                <Button size="sm" variant="outline" onClick={() => setMedicines((current) => [...current, { name: "", dosage: "", frequency: "", duration: "" }])}>
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
              {medicines.map((medicine, index) => (
                <div key={index} className="rounded-lg border border-border/50 bg-secondary/20 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Medicine</Label>
                      <Select value={medicine.name} onValueChange={(value) => setMedicines((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, name: value } : item)))}>
                        <SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger>
                        <SelectContent>
                          {bootstrap.medicines.map((item) => (
                            <SelectItem key={item.id} value={`${item.name} ${item.strength}`}>{item.name} {item.strength} ({item.form})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                  <p className="text-xl font-heading font-bold">SmartDental Prescription</p>
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
                  <p className="text-sm font-medium">Rx</p>
                </div>
                <div className="space-y-3 p-4">
                  {medicines.map((medicine, index) => (
                    <div key={index}>
                      <p className="font-medium">{medicine.name || "-"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{medicine.dosage || "-"} · {medicine.frequency || "-"} · {medicine.duration || "-"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-border/50 p-4">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{notes || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default Prescriptions;
