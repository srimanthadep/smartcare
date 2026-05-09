import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { mockDoctors } from '@/data/mockData';
import { CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams, Link } from 'react-router-dom';

const PublicBooking: React.FC = () => {
  const [params] = useSearchParams();
  const preselect = params.get('doctor') || '';
  const [doctorName, setDoctorName] = useState(preselect || mockDoctors[0]?.name || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('2026-03-19');
  const [time, setTime] = useState('10:00');
  const [reason, setReason] = useState('Consultation');

  useEffect(() => {
    document.title = "Book Appointment | Siara Dental";
  }, []);

  const doctor = useMemo(() => mockDoctors.find((d) => d.name === doctorName), [doctorName]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Book an appointment</h1>
          <p className="text-sm text-muted-foreground">Professional dental services</p>
        </div>
        <Button asChild variant="outline">
          <Link to={doctor ? `/doctors/${doctor.id}` : '/doctors/D001'}>View doctor</Link>
        </Button>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading">Booking details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select value={doctorName} onValueChange={setDoctorName}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mockDoctors.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name} · {d.department}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Symptoms, concerns, past history (optional)" />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (!name.trim() || !phone.trim()) {
                  toast.error('Please enter your name and phone');
                  return;
                }
                toast.success('Appointment request submitted', { description: `${date} ${time} with ${doctorName}` });
              }}
            >
              <CalendarPlus className="h-4 w-4 mr-1" /> Confirm booking
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PublicBooking;

