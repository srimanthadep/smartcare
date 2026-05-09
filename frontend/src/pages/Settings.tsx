import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Mail, MessageCircle, Plug, ShieldCheck } from 'lucide-react';

const Settings: React.FC = () => {
  const [integrations, setIntegrations] = useState({
    sms: true,
    payments: false,
    sso: false,
  });

  const [emailStatus, setEmailStatus] = useState({ enabled: true });

  const [waStatus, setWaStatus] = useState<{ status: string; qr: string | null }>({ status: 'disconnected', qr: null });
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    document.title = 'Settings | Siara Dental';
    fetchWaStatus();
    fetchEmailStatus();
  }, []);

  const fetchEmailStatus = async () => {
    try {
      const res = await api.getEmailStatus();
      setEmailStatus(res);
    } catch (err) {
      console.error('Failed to fetch Email status', err);
    }
  };

  const fetchWaStatus = async () => {
    try {
      const res = await api.getWhatsAppStatus();
      setWaStatus(res);
    } catch (err) {
      console.error('Failed to fetch WA status', err);
    }
  };

  const handleWaToggle = async (checked: boolean) => {
    if (checked) {
      setIsConnecting(true);
      try {
        await api.connectWhatsApp();
        setIsWaModalOpen(true);
        startQrStream();
      } catch (err) {
        toast.error('Failed to initiate connection');
        setIsConnecting(false);
      }
    } else {
      try {
        await api.disconnectWhatsApp();
        setWaStatus({ status: 'disconnected', qr: null });
        toast.success('WhatsApp disconnected');
      } catch (err) {
        toast.error('Failed to disconnect');
      }
    }
  };

  const startQrStream = () => {
    const token = sessionStorage.getItem('smartcare_token');
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
    const es = new EventSource(`${apiBaseUrl}/api/whatsapp/qr-stream?token=${token}`);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setWaStatus(data);

      if (data.status === 'connected') {
        es.close();
        setIsWaModalOpen(false);
        setIsConnecting(false);
        toast.success('WhatsApp connected successfully!');
      }
    };

    es.onerror = () => {
      es.close();
      if (waStatus.status !== 'connected') {
        setIsConnecting(false);
        // We don't automatically close the modal here to give user a chance to retry or see the error
      }
    };

    return es;
  };

  const handleEmailToggle = async (checked: boolean) => {
    try {
      const res = await api.toggleEmailStatus(checked);
      setEmailStatus(res);
      toast.success(`Email service ${checked ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to toggle Email service');
    }
  };

  const integrationRows: Array<{ key: string; label: string; desc: string }> = [
    { key: 'sms', label: 'SMS gateway', desc: 'Transactional SMS for reminders' },
    { key: 'payments', label: 'Payments', desc: 'UPI/card payment links for invoices' },
    { key: 'sso', label: 'SSO', desc: 'Single sign-on for enterprise clinics' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration and integrations</p>
      </div>

      <Tabs defaultValue="integrations">
        <TabsList>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="abha">ABHA</TabsTrigger>
          <TabsTrigger value="external">External systems</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Plug className="h-4 w-4" /> Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Specialized WhatsApp Row */}
              <div className="flex items-start justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex gap-3">
                  <div className="mt-1 h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-primary">WhatsApp Automation</p>
                      <Badge variant={waStatus.status === 'connected' ? 'success' : 'secondary'} className="text-[10px] h-4">
                        {waStatus.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Automatic patient welcome and invoice delivery via WhatsApp</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isConnecting && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  <Switch
                    checked={waStatus.status === 'connected' || waStatus.status === 'awaiting_qr'}
                    onCheckedChange={handleWaToggle}
                    disabled={isConnecting}
                  />
                </div>
              </div>

              {/* Email Service Row */}
              <div className="flex items-start justify-between gap-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex gap-3">
                  <div className="mt-1 h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-700">Email Service (Resend)</p>
                    <p className="text-sm text-muted-foreground mt-1">Automatic email delivery for reports and invoices via Resend API</p>
                  </div>
                </div>
                <Switch
                  checked={emailStatus.enabled}
                  onCheckedChange={handleEmailToggle}
                />
              </div>

              {integrationRows.map((i) => (
                <div key={i.key} className="flex items-start justify-between gap-4 rounded-lg border border-border/50 bg-secondary/15 p-4">
                  <div>
                    <p className="font-medium">{i.label}</p>
                    <p className="text-sm text-muted-foreground mt-1">{i.desc}</p>
                  </div>
                  <Switch
                    checked={(integrations as any)[i.key]}
                    onCheckedChange={(v) => setIntegrations((prev) => ({ ...prev, [i.key]: v }))}
                  />
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={() => toast.success('Settings saved')}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abha" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> ABHA integration (placeholder)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/50 bg-secondary/15 p-4">
                <p className="font-medium">Status</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This is a placeholder UI for ABHA (Ayushman Bharat Health Account) workflows.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">Consent</Badge>
                  <Badge variant="secondary" className="text-xs">ABDM APIs</Badge>
                  <Badge variant="outline" className="text-xs">Not configured</Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input placeholder="ABDM client id (mock)" />
                </div>
                <div className="space-y-2">
                  <Label>Client secret</Label>
                  <Input placeholder="ABDM client secret (mock)" type="password" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => toast.message('Connection test', { description: 'Would validate credentials and fetch token.' })}>
                  Test connection
                </Button>
                <Button onClick={() => toast.success('ABHA settings saved')}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="external" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading">External systems</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'LIS (Lab Information System)', desc: 'Send orders, receive results' },
                { name: 'PACS (Imaging)', desc: 'View imaging studies (DICOM) via links' },
                { name: 'Accounting', desc: 'Export invoices to external accounting tools' },
              ].map((x) => (
                <div key={x.name} className="rounded-lg border border-border/50 bg-secondary/15 p-4">
                  <p className="font-medium">{x.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{x.desc}</p>
                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => toast.message('Configure', { description: x.name })}>
                      Configure
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isWaModalOpen} onOpenChange={(open) => {
        if (!open) {
          handleWaToggle(false);
          setIsWaModalOpen(false);
          setIsConnecting(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Open WhatsApp on your phone → Linked Devices → Link a Device
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            {waStatus.qr ? (
              <div className="p-2 bg-white rounded-xl shadow-inner border-2 border-primary/10">
                <img src={waStatus.qr} alt="WhatsApp QR Code" className="w-64 h-64" />
              </div>
            ) : (
              <div className="w-64 h-64 flex flex-col items-center justify-center bg-secondary/20 rounded-xl border-2 border-dashed border-border">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-xs text-muted-foreground">Generating QR code...</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-sm font-medium">{waStatus.status === 'awaiting_qr' ? 'Waiting for scan...' : 'Connecting...'}</p>
              <p className="text-[10px] text-muted-foreground mt-1">This will automatically close once connected.</p>
            </div>
          </div>
          <div className="flex justify-center">
            <Button variant="ghost" onClick={() => {
              handleWaToggle(false);
              setIsWaModalOpen(false);
            }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default Settings;

