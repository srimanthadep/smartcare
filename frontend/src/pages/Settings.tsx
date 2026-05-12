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
import { Loader2, Mail, MessageCircle, Plug, ShieldCheck, User, Camera, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const Settings: React.FC = () => {
  const { user, setUser } = useAuth();
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || ''
  });
  const [isUploading, setIsUploading] = useState(false);

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

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const res = await api.updateProfile({ avatar: publicUrl });
      setProfileData(prev => ({ ...prev, avatar: publicUrl }));
      if (setUser) setUser(res.user);
      toast.success('Profile picture updated');
    } catch (err: any) {
      console.error('Upload failed', err);
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfileSave = async () => {
    try {
      const res = await api.updateProfile({
        name: profileData.name,
        email: profileData.email
      });
      if (setUser) setUser(res.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Failed to update profile');
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
    const token = localStorage.getItem('smartcare_token');
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
        <p className="text-sm text-muted-foreground">System configuration and profile management</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="abha">ABHA</TabsTrigger>
          <TabsTrigger value="external">External systems</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Personal Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-8 py-4">
                <div className="relative group">
                  <Avatar className="h-28 w-28 border-4 border-background ring-2 ring-primary/10 shadow-lg transition-all group-hover:ring-primary/30">
                    <AvatarImage src={profileData.avatar} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-3xl font-semibold text-primary-foreground">
                      {profileData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <label 
                    htmlFor="avatar-upload" 
                    className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-all backdrop-blur-[2px]",
                      isUploading && "opacity-100 bg-black/60"
                    )}
                  >
                    {isUploading ? (
                      <Loader2 className="h-7 w-7 animate-spin" />
                    ) : (
                      <>
                        <Camera className="h-7 w-7 mb-1.5" />
                        <span className="text-xs font-medium">Update Photo</span>
                      </>
                    )}
                    <input 
                      id="avatar-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleAvatarUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
                <div className="flex-1 space-y-5 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                      <Label htmlFor="profile-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                      <Input 
                        id="profile-name"
                        value={profileData.name} 
                        onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))}
                        className="rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
                        placeholder="Dr. Saikiran Reddy"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <Label htmlFor="profile-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                      <Input 
                        id="profile-email"
                        type="email"
                        value={profileData.email} 
                        onChange={e => setProfileData(p => ({ ...p, email: e.target.value }))}
                        className="rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
                        placeholder="doctor@siaradental.com"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleProfileSave} className="rounded-xl px-6 shadow-sm shadow-primary/20">
                      Save Profile Changes
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Plug className="h-4 w-4" /> Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                <Button onClick={() => toast.success('Settings saved')}>Save Integrations</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abha" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> ABHA integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/50 bg-secondary/15 p-4">
                <p className="font-medium">Status</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ABHA (Ayushman Bharat Health Account) workflows for ABDM compliance.
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
                  <Input placeholder="ABDM client id" />
                </div>
                <div className="space-y-2">
                  <Label>Client secret</Label>
                  <Input placeholder="ABDM client secret" type="password" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => toast.message('Connection test', { description: 'Validating ABDM credentials...' })}>
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
