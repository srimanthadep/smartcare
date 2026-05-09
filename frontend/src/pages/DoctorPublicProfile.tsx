import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockDoctorAvailability, mockDoctors } from '@/data/mockData';
import { CalendarPlus, MapPin, Phone, Smile } from 'lucide-react';

const DoctorPublicProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const doctor = useMemo(() => mockDoctors.find((d) => d.id === id) || mockDoctors[0], [id]);
  const slots = useMemo(() => mockDoctorAvailability.filter((s) => s.doctorId === doctor.id), [doctor.id]);

  useEffect(() => {
    if (doctor.name) {
      document.title = `${doctor.name} | Siara Dental`;
    } else {
      document.title = "Doctor Profile | Siara Dental";
    }
  }, [doctor]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">{doctor.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Smile className="h-4 w-4" /> {doctor.department}
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">15+ years</Badge>
            <Badge variant="outline" className="text-xs">4.8 rating</Badge>
            <Badge variant="secondary" className="text-xs">English · Hindi</Badge>
          </div>
        </div>
        <Button asChild>
          <Link to={`/book?doctor=${encodeURIComponent(doctor.name)}`}>
            <CalendarPlus className="h-4 w-4 mr-1" /> Book appointment
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              {doctor.name} is a specialist in {doctor.department} providing patient-first dental care with modern digital workflows.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/50 p-4">
                <p className="font-medium text-foreground">Clinic</p>
                <p className="mt-1 flex items-center gap-2"><MapPin className="h-4 w-4" /> Siara Dental Clinic, Mumbai</p>
              </div>
              <div className="rounded-lg border border-border/50 p-4">
                <p className="font-medium text-foreground">Contact</p>
                <p className="mt-1 flex items-center gap-2"><Phone className="h-4 w-4" /> +91 90000 00000</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No slots published</p>
            ) : (
              slots.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-md border border-border/50 bg-secondary/15 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{s.day}</span>
                  <span className="font-medium">{s.start}–{s.end}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading">Reviews</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: 'A.', text: 'Very attentive and explained everything clearly.' },
            { name: 'P.', text: 'Booking was smooth and consultation was helpful.' },
            { name: 'R.', text: 'Great clinic experience. Quick check-in.' },
          ].map((r) => (
            <div key={r.name} className="rounded-lg border border-border/50 bg-secondary/15 p-4">
              <p className="font-medium">{r.name}</p>
              <p className="text-sm text-muted-foreground mt-2">{r.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DoctorPublicProfile;

