import React, { useState, useEffect, useRef } from "react";
declare global {
  interface Window {
    google: any;
  }
}
declare const google: any;
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AutocorrectTextarea } from "@/components/AutocorrectTextarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const PatientRegistration: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    document.title = "Register Patient | Siara Dental";
  }, []);

  const bootstrapQuery = useQuery({
    queryKey: ["bootstrap"],
    queryFn: api.getBootstrap,
  });
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
    chiefComplaint: "",
  });
  const [bookAppointment, setBookAppointment] = useState(true);

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
        consultationFee: Number(form.consultationFee),
        chiefComplaint: form.chiefComplaint
      }),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient registered successfully");

      if (bookAppointment) {
        const bootstrap = bootstrapQuery.data;
        const doctorName = bootstrap?.doctors[0]?.name || "Dr. Saikiran";
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        try {
          await api.createAppointment({
            patientId: data.id,
            patientName: data.name,
            doctorName: doctorName,
            date: today,
            time: currentTime,
            type: "Consultation",
            status: "Scheduled",
            reason: form.chiefComplaint || "New patient consultation",
          });
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
          toast.success("Appointment booked automatically");
        } catch (error) {
          console.error("Auto-booking error:", error);
          toast.error("Failed to book automatic appointment");
        }
      }

      navigate("/patients");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to register patient");
    },
  });

  const updateField = (key: keyof typeof form, value: string) => {
    let finalValue = value;
    const capitalizeFields: (keyof typeof form)[] = ["name", "address", "chiefComplaint", "allergies", "conditions", "notes", "dentalHistory"];

    if (capitalizeFields.includes(key)) {
      const minorWords = ["a", "an", "the", "and", "as", "at", "but", "by", "for", "if", "in", "nor", "of", "on", "or", "so", "to", "up", "yet"];
      finalValue = value.split(' ').map((word, index) => {
        if (index > 0 && minorWords.includes(word.toLowerCase())) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      }).join(' ');
    }

    setForm((current) => ({ ...current, [key]: finalValue }));
  };

  useEffect(() => {
    if (step === 1 && addressInputRef.current && !autocompleteRef.current) {
      const loadGoogleMaps = () => {
        if (!window.google || !window.google.maps || !window.google.maps.places) {
          console.warn("Google Maps API not loaded yet");
          return;
        }

        autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
          types: ["address"],
          componentRestrictions: { country: "in" },
          bounds: new window.google.maps.LatLngBounds(
            { lat: 16.9, lng: 78.1 },
            { lat: 17.8, lng: 79.1 }
          ),
        });

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current?.getPlace();
          if (place && place.formatted_address) {
            updateField("address", place.formatted_address);
          }
        });
      };

      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setTimeout(loadGoogleMaps, 500);
        };
        document.head.appendChild(script);
      } else {
        setTimeout(loadGoogleMaps, 500);
      }

      return () => {
        if (autocompleteRef.current) {
          window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
          autocompleteRef.current = null;
        }
      };
    }
  }, [step]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    createPatient.mutate();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-2xl space-y-3 pb-20 md:space-y-6 md:pb-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
            <h1 className="text-lg font-heading font-bold md:text-2xl">Register Patient</h1>
          <p className="text-sm text-muted-foreground">Step {step} of 3</p>
        </div>
      </div>

      <div className="flex gap-2">
        {[1, 2, 3].map((value) => (
          <div key={value} className={`h-1.5 flex-1 rounded-full transition-colors ${value <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <form ref={formRef} onSubmit={handleSubmit}>
        {step === 1 && (
          <Card className="border-border/50">
            <CardHeader><CardTitle className="font-heading text-lg">Demographics & Contact</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" autocomplete="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Enter full name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age (Years)</Label>
                  <Input id="age" name="age" type="number" autoComplete="off" value={form.age} onChange={(event) => updateField("age", event.target.value)} placeholder="e.g. 25" required />
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
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" autocomplete="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="+91 XXXXX XXXXX" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="space-y-1">
                    <Input
                      id="email"
                      name="email"
                      autocomplete="email"
                      type="email"
                      value={form.email}
                      onChange={(event) => {
                        const val = event.target.value;
                        if (val.endsWith("@")) {
                          updateField("email", val + "gmail.com");
                        } else {
                          updateField("email", val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && form.email && !form.email.includes("@")) {
                          e.preventDefault();
                          updateField("email", form.email + "@gmail.com");
                        }
                      }}
                      placeholder="patient@email.com"
                    />
                    {form.email && !form.email.includes("@") && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2 py-0"
                        onClick={() => updateField("email", form.email + "@gmail.com")}
                      >
                        + @gmail.com
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input 
                  id="address"
                  name="address"
                  autocomplete="street-address"
                  ref={addressInputRef}
                  value={form.address} 
                  onChange={(event) => updateField("address", event.target.value)} 
                  placeholder="Start typing your address..." 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-destructive font-bold">Chief Complaint</Label>
                <AutocorrectTextarea
                  value={form.chiefComplaint}
                  onChange={(event) => updateField("chiefComplaint", event.target.value)}
                  placeholder="Why is the patient visiting the clinic? (e.g., Severe toothache, Bleeding gums)"
                  className="border-destructive/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-primary font-bold">Consultation Fee (₹)</Label>
                <Input
                  type="number"
                  autoComplete="off"
                  value={form.consultationFee}
                  onChange={(event) => updateField("consultationFee", event.target.value)}
                  placeholder="300"
                  required
                  className="border-primary/30"
                />
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={() => setStep(2)}>Next</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
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
                <AutocorrectTextarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Additional notes" />
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
                <AutocorrectTextarea value={form.dentalHistory} onChange={(event) => updateField("dentalHistory", event.target.value)} placeholder="Previous procedures: Root canals, extractions, braces, etc." />
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
              <div className="flex items-center justify-between border-t border-border/50 pt-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="book-appointment"
                    checked={bookAppointment}
                    onCheckedChange={setBookAppointment}
                  />
                  <Label htmlFor="book-appointment" className="cursor-pointer">Book appointment after registration</Label>
                </div>
                <div className="hidden gap-2 md:flex">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>Previous</Button>
                  <Button type="submit" disabled={createPatient.isPending}>
                    <Save className="mr-1 h-4 w-4" /> {createPatient.isPending ? "Saving..." : "Register Patient"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </form>
      {step === 3 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 flex gap-2 border-t border-border bg-background p-3 md:hidden">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>Previous</Button>
          <Button type="button" className="flex-1" onClick={() => formRef.current?.requestSubmit()} disabled={createPatient.isPending}>
            <Save className="mr-1 h-4 w-4" /> {createPatient.isPending ? "Saving..." : "Register"}
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default PatientRegistration;
