import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, User, Phone, Mail, MapPin, HeartPulse, ShieldAlert, History } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PatientEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
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
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => api.getPatient(id!),
    enabled: !!id,
  });

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
      });
    }
  }, [data]);

  const updatePatient = useMutation({
    mutationFn: (payload: any) => api.updatePatient(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      toast.success("Patient details updated successfully");
      navigate(`/patients/${id}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update patient");
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updatePatient.isPending}>
            <Save className="mr-2 h-4 w-4" /> {updatePatient.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12 bg-muted/50 p-1">
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
                    <Input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input id="age" type="number" value={form.age} onChange={(e) => updateField("age", parseInt(e.target.value))} required />
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
                    <Input id="phone" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email Address</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Residential Address</Label>
                  <Textarea id="address" value={form.address} onChange={(e) => updateField("address", e.target.value)} rows={3} />
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
    </motion.div>
  );
};

export default PatientEdit;
