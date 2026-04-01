import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plug, ShieldCheck } from 'lucide-react';

const Settings: React.FC = () => {
  const [integrations, setIntegrations] = useState({
    whatsapp: false,
    sms: true,
    email: true,
    payments: false,
    sso: false,
  });
  type IntegrationKey = keyof typeof integrations;
  const integrationRows: Array<{ key: IntegrationKey; label: string; desc: string }> = [
    { key: 'whatsapp', label: 'WhatsApp provider', desc: 'Templates, opt-in, delivery tracking' },
    { key: 'sms', label: 'SMS gateway', desc: 'Transactional SMS for reminders' },
    { key: 'email', label: 'Email service', desc: 'Reports and invoice emails' },
    { key: 'payments', label: 'Payments', desc: 'UPI/card payment links for invoices' },
    { key: 'sso', label: 'SSO', desc: 'Single sign-on for enterprise clinics' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration and integrations (mock)</p>
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
              {integrationRows.map((i) => (
                <div key={i.key} className="flex items-start justify-between gap-4 rounded-lg border border-border/50 bg-secondary/15 p-4">
                  <div>
                    <p className="font-medium">{i.label}</p>
                    <p className="text-sm text-muted-foreground mt-1">{i.desc}</p>
                  </div>
                  <Switch
                    checked={integrations[i.key]}
                    onCheckedChange={(v) => setIntegrations((prev) => ({ ...prev, [i.key]: v }))}
                  />
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={() => toast.success('Settings saved (mock)')}>Save</Button>
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
                <Button variant="outline" onClick={() => toast.message('Mock test', { description: 'Would validate credentials and fetch token.' })}>
                  Test connection
                </Button>
                <Button onClick={() => toast.success('ABHA settings saved (mock)')}>Save</Button>
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
                    <Button variant="outline" size="sm" onClick={() => toast.message('Mock configure', { description: x.name })}>
                      Configure
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default Settings;

