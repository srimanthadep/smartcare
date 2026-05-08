import React, { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const PatientRegistration: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "Male",
    bloodGroup: "A+",
    phone: "",
    email: "",
    address: "",
    allergies: "",
    conditions: "",
    notes: "",
    // Billing specific
    consultationFee: "300",
    // Dental specific
    lastDentalVisit: "",
    oralHygiene: "Good",
    dentalHistory: "",
    tobaccoUse: "No",
  });

  const createPatient = useMutation({
    mutationFn: () =>
      api.createPatient({
        name: form.name,
        age: Number(form.age),
        gender: form.gender as "Male" | "Female" | "Other",
        phone: form.phone,
        email: form.email,
        bloodGroup: form.bloodGroup,
        address: form.address,
        allergies: form.allergies.split(",").map((item) => item.trim()).filter(Boolean),
        conditions: form.conditions.split(",").map((item) => item.trim()).filter(Boolean),
        medications: [],
        notes: form.notes,
        // In a real app we'd add these to the patient object or a separate table
        dentalHistory: {
          lastVisit: form.lastDentalVisit,
          hygiene: form.oralHygiene,
          history: form.dentalHistory,
          tobacco: form.tobaccoUse,
        },
        consultationFee: Number(form.consultationFee)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient registered successfully");
      navigate("/patients");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to register patient");
    },
  });

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    createPatient.mutate();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-heading font-bold">Register Patient</h1>
          <p className="text-sm text-muted-foreground">Step {step} of 4</p>
        </div>
      </div>

      <div className="flex gap-2">
        {[1, 2, 3, 4].map((value) => (
          <div key={value} className={`h-1.5 flex-1 rounded-full transition-colors ${value <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <Card className="border-border/50">
            <CardHeader><CardTitle className="font-heading text-lg">Demographics</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Enter full name" required />
                </div>
                <div className="space-y-2">
                  <Label>Age (Years)</Label>
                  <Input type="number" value={form.age} onChange={(event) => updateField("age", event.target.value)} placeholder="e.g. 25" required />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(value) => updateField("gender", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <Select value={form.bloodGroup} onValueChange={(value) => updateField("bloodGroup", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((value) => (
                        <SelectItem key={value} value={value}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-primary font-bold">Consultation Fee (Rs)</Label>
                  <Input 
                    type="number" 
                    value={form.consultationFee} 
                    onChange={(event) => updateField("consultationFee", event.target.value)} 
                    placeholder="300" 
                    required 
                    className="border-primary/30"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={() => setStep(2)}>Next</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-border/50">
            <CardHeader><CardTitle className="font-heading text-lg">Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="+91 XXXXX XXXXX" required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="patient@email.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea value={form.address} onChange={(event) => updateField("address", event.target.value)} placeholder="Full address" />
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>Previous</Button>
                <Button type="button" onClick={() => setStep(3)}>Next</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-border/50">
            <CardHeader><CardTitle className="font-heading text-lg">Medical Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Known Allergies</Label>
                <Input value={form.allergies} onChange={(event) => updateField("allergies", event.target.value)} placeholder="e.g. Penicillin, Dust" />
              </div>
              <div className="space-y-2">
                <Label>Existing Conditions</Label>
                <Input value={form.conditions} onChange={(event) => updateField("conditions", event.target.value)} placeholder="e.g. Diabetes, Hypertension" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Additional notes" />
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>Previous</Button>
                <Button type="button" onClick={() => setStep(4)}>Next</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="border-border/50">
            <CardHeader><CardTitle className="font-heading text-lg">Dental History & Habits</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Last Dental Visit</Label>
                  <Input type="date" value={form.lastDentalVisit} onChange={(event) => updateField("lastDentalVisit", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Oral Hygiene</Label>
                  <Select value={form.oralHygiene} onValueChange={(value) => updateField("oralHygiene", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>Dental History</Label>
                <Textarea value={form.dentalHistory} onChange={(event) => updateField("dentalHistory", event.target.value)} placeholder="Previous procedures: Root canals, extractions, braces, etc." />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tobacco Use</Label>
                  <Select value={form.tobaccoUse} onValueChange={(value) => updateField("tobaccoUse", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No">No</SelectItem>
                      <SelectItem value="Occasional">Occasional</SelectItem>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Smokeless Tobacco">Smokeless Tobacco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(3)}>Previous</Button>
                <Button type="submit" disabled={createPatient.isPending}>
                  <Save className="mr-1 h-4 w-4" /> {createPatient.isPending ? "Saving..." : "Register Patient"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      </form>
    </motion.div>
  );
};

export default PatientRegistration;
