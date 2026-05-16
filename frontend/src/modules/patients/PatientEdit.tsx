import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, User, Phone, Mail, MapPin, HeartPulse, ShieldAlert, History } from "lucide-react";
import { api } from '@/shared/lib/api';
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { toast } from "sonner";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Trash2 } from "lucide-react";

const PatientEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    age: 0,
    gender: "Male",
    bloodGroup: "A+",
    phone: "",
    email: "",
    address: "",
    allergies: "",
    conditions: "",
    notes: "",
    status: "Active",
    // Dental specific
    lastDentalVisit: "",
    oralHygiene: "Good",
    dentalHistory: "",
    tobaccoUse: "No",
    chiefComplaint: "",
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["patients", id],
    queryFn: () => api.getPatient(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,   // 2 minutes
    gcTime: 5 * 60 * 1000,      // 5 minutes
  });

  useEffect(() => {
    if (data?.patient.name) {
      document.title = `Edit ${data.patient.name} | Siara Dental`;
    } else {
      document.title = "Edit Patient | Siara Dental";
    }
  }, [data]);

  useEffect(() => {
    if (data?.patient) {
      const p = data.patient;
      setForm({
        name: p.name || "",
        age: p.age || 0,
        gender: p.gender || "Male",
        bloodGroup: p.bloodGroup || "A+",
        phone: p.phone || "",
        email: p.email || "",
        address: p.address || "",
        allergies: Array.isArray(p.allergies) ? p.allergies.join(", ") : "",
        conditions: Array.isArray(p.conditions) ? p.conditions.join(", ") : "",
        notes: p.notes || "",
        status: p.status || "Active",
        lastDentalVisit: p.dentalHistory?.lastVisit || "",
        oralHygiene: p.dentalHistory?.hygiene || "Good",
        dentalHistory: p.dentalHistory?.history || "",
        tobaccoUse: p.dentalHistory?.tobacco || "No",
        chiefComplaint: p.chiefComplaint || "",
      });
    }
  }, [data]);

  const updatePatient = useMutation({
    mutationFn: (payload: any) => api.updatePatient(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient details updated successfully");
      navigate(`/patients/${id}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update patient");
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

  const updateField = (key: string, value: any) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    
    const payload = {
      ...form,
      allergies: form.allergies.split(",").map((item) => item.trim()).filter(Boolean),
      conditions: form.conditions.split(",").map((item) => item.trim()).filter(Boolean),
      dentalHistory: {
        lastVisit: form.lastDentalVisit,
        hygiene: form.oralHygiene,
        history: form.dentalHistory,
        tobacco: form.tobaccoUse,
      }
    };
    
    updatePatient.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Patient Not Found</h2>
        <Button onClick={() => navigate("/patients")} className="mt-4">Back to Directory</Button>
      </div>
    );
  }

  return (
    <>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold">Edit Patient Profile</h1>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">{id}</p>
          </div>
        </div>
        <div className="hidden gap-2 md:flex">
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updatePatient.isPending}>
            <Save className="mr-2 h-4 w-4" /> {updatePatient.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid h-12 w-full grid-cols-3 overflow-x-auto bg-muted/50 p-1">
          <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <User className="h-4 w-4 mr-2" /> General
          </TabsTrigger>
          <TabsTrigger value="medical" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <HeartPulse className="h-4 w-4 mr-2" /> Medical
          </TabsTrigger>
          <TabsTrigger value="dental" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <History className="h-4 w-4 mr-2" /> Dental
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit} className="mt-6">
          <TabsContent value="general" className="space-y-6 m-0">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </div>
                <CardDescription>Basic demographics and contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" autocomplete="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input id="age" name="age" type="number" autoComplete="off" value={form.age} onChange={(e) => updateField("age", parseInt(e.target.value))} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => updateField("gender", v)}>
                      <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Patient Status</Label>
                    <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                      <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Phone Number</Label>
                    <Input id="phone" name="phone" autocomplete="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email Address</Label>
                    <Input id="email" name="email" autocomplete="email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Residential Address</Label>
                  <Textarea id="address" name="address" autocomplete="street-address" value={form.address} onChange={(e) => updateField("address", e.target.value)} rows={3} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chiefComplaint" className="flex items-center gap-2 text-destructive font-bold"><ShieldAlert className="h-3.5 w-3.5" /> Chief Complaint</Label>
                  <Textarea id="chiefComplaint" value={form.chiefComplaint} onChange={(e) => updateField("chiefComplaint", e.target.value)} rows={2} className="border-destructive/30" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medical" className="space-y-6 m-0">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-lg">Medical Conditions & Alerts</CardTitle>
                </div>
                <CardDescription>Critical health information and allergies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bloodGroup">Blood Group</Label>
                    <Select value={form.bloodGroup} onValueChange={(v) => updateField("bloodGroup", v)}>
                      <SelectTrigger id="bloodGroup"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Known Allergies</Label>
                  <Input id="allergies" value={form.allergies} onChange={(e) => updateField("allergies", e.target.value)} placeholder="Comma separated: Penicillin, Latex, etc." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conditions">Existing Conditions</Label>
                  <Input id="conditions" value={form.conditions} onChange={(e) => updateField("conditions", e.target.value)} placeholder="Comma separated: Diabetes, Hypertension, etc." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Clinical Notes</Label>
                  <Textarea id="notes" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={4} placeholder="General observation notes..." />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dental" className="space-y-6 m-0">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg">Dental History</CardTitle>
                </div>
                <CardDescription>Past procedures and hygiene habits</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lastVisit">Last Dental Visit</Label>
                    <Input id="lastVisit" type="date" value={form.lastDentalVisit} onChange={(e) => updateField("lastDentalVisit", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hygiene">Oral Hygiene Rating</Label>
                    <Select value={form.oralHygiene} onValueChange={(v) => updateField("oralHygiene", v)}>
                      <SelectTrigger id="hygiene"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tobacco">Tobacco Use</Label>
                  <Select value={form.tobaccoUse} onValueChange={(v) => updateField("tobaccoUse", v)}>
                    <SelectTrigger id="tobacco"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="Occasional">Occasional</SelectItem>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Smokeless Tobacco">Smokeless Tobacco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="history">Dental Procedures History</Label>
                  <Textarea id="history" value={form.dentalHistory} onChange={(e) => updateField("dentalHistory", e.target.value)} rows={5} placeholder="Root canals, extractions, braces, etc." />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </form>
      </Tabs>
      <div className="fixed bottom-16 left-0 right-0 z-40 flex gap-2 border-t border-border bg-background p-3 md:hidden">
        <Button variant="destructive" size="icon" onClick={() => setShowDeleteDialog(true)}>
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={updatePatient.isPending}>
          <Save className="mr-2 h-4 w-4" /> {updatePatient.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </motion.div>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the patient profile
              for <span className="font-bold text-foreground">{form.name}</span> and all associated clinical data, 
              prescriptions, and billing history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePatient.mutate(id!)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePatient.isPending ? "Deleting..." : "Delete Patient"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PatientEdit;
