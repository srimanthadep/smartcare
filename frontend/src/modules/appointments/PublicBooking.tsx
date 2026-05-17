import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { mockDoctors } from '@/shared/data/mockData';
import { CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '@/shared/lib/api';
import { Doctor } from '@/shared/types';

const PublicBooking: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const preselect = params.get('doctor') || '';
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorName, setDoctorName] = useState(preselect || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('10:00');
  const [reason, setReason] = useState('Consultation');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Book Appointment | Siara Dental";
    
    // Fetch real doctors
    api.getPublicDoctors()
      .then(data => {
        setDoctors(data);
        if (!preselect && data.length > 0) {
          setDoctorName(data[0].name);
        }
      })
      .catch(err => {
        console.error('Failed to fetch doctors:', err);
        toast.error('Could not load doctor list');
      });
  }, [preselect]);

  const doctor = useMemo(() => doctors.find((d) => d.name === doctorName), [doctors, doctorName]);

  const handleBooking = async () => {
    if (!name.trim() || !phone.trim() || !doctorName) {
      toast.error('Please enter your name, phone and select a doctor');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createPublicAppointment({
        name,
        phone,
        doctorName,
        date,
        time,
        reason,
        notes
      });
      toast.success('Appointment request submitted!', { 
        description: `Your appointment with ${doctorName} on ${date} at ${time} has been scheduled.` 
      });
      // Clear form or redirect
      setName('');
      setPhone('');
      setNotes('');
    } catch (err: any) {
      console.error('Booking failed:', err);
      toast.error(err.message || 'Failed to book appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

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
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name} {d.specialization ? `· ${d.specialization}` : ''}</SelectItem>
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
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Symptoms, concerns, past history (optional)" 
            />
          </div>

          <div className="flex justify-end">
            <Button
              disabled={isSubmitting}
              onClick={handleBooking}
            >
              <CalendarPlus className="h-4 w-4 mr-1" /> 
              {isSubmitting ? 'Processing...' : 'Confirm booking'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PublicBooking;

