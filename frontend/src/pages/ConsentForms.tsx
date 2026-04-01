import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileCheck, FilePen, Plus, CheckCircle2 } from 'lucide-react';
import { ConsentForm } from '@/types';
import { mockPatients, mockDoctors } from '@/data/mockData';
import { toast } from 'sonner';

const PROCEDURE_OPTIONS = [
  'Tooth Extraction',
  'Root Canal Treatment',
  'Dental Implant',
  'Orthodontic Treatment',
  'Crown & Bridge',
  'Scaling & Root Planing',
  'Wisdom Tooth Surgery',
  'Cosmetic Procedures',
  'General Anaesthesia',
  'Pediatric Sedation',
];

const initialForms: ConsentForm[] = [
  { id: 'CF001', patientId: 'P003', patientName: 'Rahul Verma', procedureType: 'Root Canal Treatment', dentistName: 'Dr. Anjali Desai', date: '2026-03-18', signed: true, signedAt: '2026-03-18 09:15' },
  { id: 'CF002', patientId: 'P001', patientName: 'Aarav Sharma', procedureType: 'Scaling & Root Planing', dentistName: 'Dr. Priya Sharma', date: '2026-03-15', signed: true, signedAt: '2026-03-15 09:05' },
  { id: 'CF003', patientId: 'P002', patientName: 'Priya Patel', procedureType: 'Orthodontic Treatment', dentistName: 'Dr. Rajesh Mehta', date: '2026-03-17', signed: true, signedAt: '2026-03-17 10:00' },
  { id: 'CF004', patientId: 'P004', patientName: 'Sneha Gupta', procedureType: 'Crown & Bridge', dentistName: 'Dr. Priya Sharma', date: '2026-03-20', signed: false },
];

const ConsentForms: React.FC = () => {
  const [forms, setForms] = useState<ConsentForm[]>(initialForms);

  const signForm = (id: string) => {
    setForms((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, signed: true, signedAt: new Date().toISOString().replace('T', ' ').slice(0, 16) }
          : f,
      ),
    );
    toast.success('Consent form signed digitally');
  };

  const CreateFormDialog = () => {
    const [patientId, setPatientId] = useState(mockPatients[0]?.id || '');
    const [dentistName, setDentistName] = useState(mockDoctors[0]?.name || '');
    const [procedure, setProcedure] = useState(PROCEDURE_OPTIONS[0]);
    const patient = mockPatients.find((p) => p.id === patientId);

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button><Plus className="h-4 w-4 mr-1" /> New Consent</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Create Consent Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mockPatients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Procedure</Label>
              <Select value={procedure} onValueChange={setProcedure}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROCEDURE_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dentist</Label>
              <Select value={dentistName} onValueChange={setDentistName}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mockDoctors.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-border/50 bg-secondary/15 p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Consent Statement</p>
              <p>I, {patient?.name || '___'}, hereby give my informed consent for <strong>{procedure}</strong> to be performed by <strong>{dentistName}</strong>.</p>
              <p>I acknowledge that I have been informed of the nature of the procedure, its risks, benefits, and alternatives. I understand that no guarantee of results has been made.</p>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  if (!patient) return;
                  const id = `CF${String(Math.floor(Math.random() * 900) + 100)}`;
                  setForms((prev) => [{
                    id,
                    patientId: patient.id,
                    patientName: patient.name,
                    procedureType: procedure,
                    dentistName,
                    date: new Date().toISOString().slice(0, 10),
                    signed: false,
                  }, ...prev]);
                  toast.success('Consent form created — awaiting signature');
                }}
              >
                Create Form
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Consent Forms</h1>
          <p className="text-sm text-muted-foreground">Digital consent management for dental procedures</p>
        </div>
        <CreateFormDialog />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border/50 bg-success/5 p-4 flex items-center gap-3">
          <FileCheck className="h-8 w-8 text-success" />
          <div>
            <p className="text-xs text-muted-foreground">Signed</p>
            <p className="text-xl font-heading font-bold text-success">{forms.filter((f) => f.signed).length}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-warning/5 p-4 flex items-center gap-3">
          <FilePen className="h-8 w-8 text-warning" />
          <div>
            <p className="text-xs text-muted-foreground">Awaiting Signature</p>
            <p className="text-xl font-heading font-bold text-warning">{forms.filter((f) => !f.signed).length}</p>
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-secondary/15 p-4 flex items-center gap-3">
          <FileCheck className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Total Forms</p>
            <p className="text-xl font-heading font-bold">{forms.length}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Dentist</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <p className="font-medium">{f.patientName}</p>
                      <p className="text-xs text-muted-foreground">{f.id}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{f.procedureType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.dentistName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.date}</TableCell>
                    <TableCell>
                      {f.signed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-success/10 text-success border-success/20">
                          <CheckCircle2 className="h-3 w-3" /> Signed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-warning/10 text-warning border-warning/20">
                          Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!f.signed && (
                        <Button size="sm" variant="outline" onClick={() => signForm(f.id)}>
                          <FilePen className="h-3 w-3 mr-1" /> Sign Now
                        </Button>
                      )}
                      {f.signed && f.signedAt && (
                        <span className="text-xs text-muted-foreground">{f.signedAt}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ConsentForms;
