import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { mockPatients } from '@/data/mockData';
import { Bell, MessageCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

type Reminder = {
  id: string;
  patientId: string;
  patientName: string;
  channel: 'WhatsApp' | 'SMS' | 'Email';
  when: string;
  message: string;
  enabled: boolean;
};

const initial: Reminder[] = [
  { id: 'N001', patientId: 'P001', patientName: 'Aarav Sharma', channel: 'WhatsApp', when: '2026-03-19 09:00', message: 'Reminder: Follow-up appointment tomorrow at 09:00.', enabled: true },
  { id: 'N002', patientId: 'P003', patientName: 'Rahul Verma', channel: 'SMS', when: '2026-03-18 18:00', message: 'Please collect your X-ray report from SmartDental.', enabled: true },
  { id: 'N003', patientId: 'P002', patientName: 'Priya Patel', channel: 'Email', when: '2026-03-20 10:00', message: 'Your spirometry report is available on the portal.', enabled: false },
];

const Notifications: React.FC = () => {
  const [reminders, setReminders] = useState<Reminder[]>(initial);
  const enabledCount = useMemo(() => reminders.filter((r) => r.enabled).length, [reminders]);

  const CreateReminderDialog = () => {
    const [patientId, setPatientId] = useState(mockPatients[0]?.id || 'P001');
    const [channel, setChannel] = useState<Reminder['channel']>('WhatsApp');
    const [when, setWhen] = useState('2026-03-19 09:00');
    const [message, setMessage] = useState('Reminder: Your appointment is scheduled.');

    const patient = mockPatients.find((p) => p.id === patientId);

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button><Plus className="h-4 w-4 mr-1" /> New reminder</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Create reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mockPatients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as Reminder['channel'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>When</Label>
                <Input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="YYYY-MM-DD HH:mm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Input value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  if (!patient) return;
                  const id = `N${String(Math.floor(Math.random() * 900) + 100)}`;
                  setReminders((prev) => [
                    { id, patientId: patient.id, patientName: patient.name, channel, when, message, enabled: true },
                    ...prev,
                  ]);
                  toast.success('Reminder created (mock)');
                }}
              >
                Create
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
          <h1 className="text-2xl font-heading font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">{enabledCount} active reminders</p>
        </div>
        <CreateReminderDialog />
      </div>

      <Tabs defaultValue="reminders">
        <TabsList>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="portal">Patient portal</TabsTrigger>
        </TabsList>

        <TabsContent value="reminders" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Bell className="h-4 w-4" /> Reminder management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reminders.map((r) => (
                <div key={r.id} className="rounded-lg border border-border/50 bg-secondary/15 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{r.patientName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{r.when} · {r.channel}</p>
                      <p className="text-sm text-muted-foreground mt-2">{r.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={r.enabled}
                        onCheckedChange={(v) => setReminders((prev) => prev.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)))}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.message('Mock send', { description: `Sent via ${r.channel}` })}
                      >
                        Send now
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-success/15 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-lg">WhatsApp communication (mock)</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure templates, opt-in and delivery status with a real WhatsApp provider.
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => toast.message('Mock connect', { description: 'This would open provider setup.' })}>
                  Connect provider
                </Button>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                {['Appointment reminder', 'Lab ready', 'Payment link'].map((t) => (
                  <div key={t} className="rounded-lg border border-border/50 bg-secondary/15 p-4">
                    <p className="font-medium">{t}</p>
                    <p className="text-xs text-muted-foreground mt-1">Template · Approved (mock)</p>
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => toast.message('Mock preview', { description: t })}>Preview</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portal" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-8">
              <p className="font-heading font-semibold text-lg">Patient portal simulation</p>
              <p className="text-sm text-muted-foreground mt-1">
                A lightweight portal experience for reports, appointments and payments (mock).
              </p>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border/50 bg-secondary/15 p-4">
                  <p className="font-medium">Reports</p>
                  <p className="text-xs text-muted-foreground mt-1">Preview available reports and downloads</p>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => toast.message('Mock portal', { description: 'Open Reports' })}>Open</Button>
                  </div>
                </div>
                <div className="rounded-lg border border-border/50 bg-secondary/15 p-4">
                  <p className="font-medium">Appointments</p>
                  <p className="text-xs text-muted-foreground mt-1">Upcoming and reschedule request</p>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => toast.message('Mock portal', { description: 'Open Appointments' })}>Open</Button>
                  </div>
                </div>
                <div className="rounded-lg border border-border/50 bg-secondary/15 p-4">
                  <p className="font-medium">Payments</p>
                  <p className="text-xs text-muted-foreground mt-1">Invoices and status tracking</p>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => toast.message('Mock portal', { description: 'Open Payments' })}>Open</Button>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Portal</Badge>
                <Badge variant="outline" className="text-xs">OAuth / ABHA-ready placeholder</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default Notifications;

