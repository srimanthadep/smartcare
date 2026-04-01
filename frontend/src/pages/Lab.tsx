import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockDoctors, mockLabCatalog, mockLabOrders, mockPatients, type LabOrder, type LabTest } from '@/data/mockData';
import { Scan, Plus, Upload } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { toast } from 'sonner';

const Lab: React.FC = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | LabTest['category']>('all');
  const [cart, setCart] = useState<LabTest[]>([]);
  const [orders, setOrders] = useState<LabOrder[]>(mockLabOrders);

  const filteredCatalog = useMemo(() => {
    return mockLabCatalog
      .filter((t) => (category === 'all' ? true : t.category === category))
      .filter((t) => t.name.toLowerCase().includes(query.toLowerCase()) || t.id.toLowerCase().includes(query.toLowerCase()));
  }, [category, query]);

  const cartTotal = cart.reduce((sum, t) => sum + t.price, 0);

  const CreateOrderDialog = () => {
    const [patientId, setPatientId] = useState(mockPatients[0]?.id || 'P001');
    const [doctorName, setDoctorName] = useState(mockDoctors[0]?.name || 'Dr. Nisha Kapoor');
    const [priority, setPriority] = useState<'Routine' | 'Urgent'>('Routine');
    const [date, setDate] = useState('2026-03-18');
    const [notes, setNotes] = useState('');

    const patient = mockPatients.find((p) => p.id === patientId);

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button disabled={cart.length === 0}><Plus className="h-4 w-4 mr-1" /> Create order</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">New lab order</DialogTitle>
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
                <Label>Doctor</Label>
                <Select value={doctorName} onValueChange={setDoctorName}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mockDoctors.map((d) => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Routine">Routine</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Clinical notes, fasting status, etc." />
              </div>
            </div>

            <div className="rounded-lg border border-border/50 p-4">
              <p className="text-sm font-medium">Tests ({cart.length})</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {cart.map((t) => (
                  <Badge key={t.id} variant="secondary" className="cursor-pointer" onClick={() => setCart((prev) => prev.filter((x) => x.id !== t.id))}>
                    {t.name}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-heading font-bold">₹{cartTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  if (!patient) return;
                  const id = `LAB${String(Math.floor(Math.random() * 900) + 100)}`;
                  setOrders((prev) => [
                    {
                      id,
                      patientId: patient.id,
                      patientName: patient.name,
                      doctorName,
                      date,
                      status: 'Ordered',
                      priority,
                      tests: cart,
                    },
                    ...prev,
                  ]);
                  setCart([]);
                  toast.success('Lab order created (mock)');
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
          <h1 className="text-2xl font-heading font-bold">X-Ray & Imaging</h1>
          <p className="text-sm text-muted-foreground">Order dental imaging, track reports and uploads</p>
        </div>
        <CreateOrderDialog />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Catalog */}
        <Card className="border-border/50 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Test catalog</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tests…" className="sm:col-span-2" />
              <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="X-Ray">X-Ray</SelectItem>
                  <SelectItem value="Imaging">Imaging</SelectItem>
                  <SelectItem value="Diagnostic">Diagnostic</SelectItem>
                  <SelectItem value="Pathology">Pathology</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>TAT</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCatalog.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.id}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.category}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.tatHours}h</TableCell>
                      <TableCell className="text-right font-medium">₹{t.price}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (cart.some((x) => x.id === t.id)) return;
                            setCart((prev) => [...prev, t]);
                          }}
                          disabled={cart.some((x) => x.id === t.id)}
                        >
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Cart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Scan className="h-4 w-4" /> Order cart
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Add tests to create an order</div>
            ) : (
              <>
                <div className="space-y-2">
                  {cart.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-md border border-border/50 bg-secondary/20 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.category}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCart((prev) => prev.filter((x) => x.id !== t.id))}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-heading font-bold">₹{cartTotal.toLocaleString()}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading">Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <p className="font-medium">{o.id}</p>
                      <p className="text-xs text-muted-foreground">{o.date} · {o.tests.length} tests</p>
                    </TableCell>
                    <TableCell>{o.patientName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{o.doctorName}</TableCell>
                    <TableCell><Badge variant={o.priority === 'Urgent' ? 'destructive' : 'secondary'}>{o.priority}</Badge></TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-right">
                      {o.reportUrl ? (
                        <Button size="sm" variant="outline" onClick={() => window.open(o.reportUrl, '_blank')}>
                          View
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, status: 'Reported', reportUrl: '/placeholder.svg' } : x)));
                            toast.success('Report uploaded (mock)');
                          }}
                        >
                          <Upload className="h-4 w-4 mr-1" /> Upload
                        </Button>
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

export default Lab;

