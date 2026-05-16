import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Switch } from '@/shared/ui/switch';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { toast } from 'sonner';
import { api, BackupSettings } from '@/shared/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { DatabaseBackup, Loader2, Mail, MessageCircle, Plug, ShieldCheck, User, Camera, Type, Stethoscope, Plus, Trash2, Pencil } from 'lucide-react';
import { useAuth } from '@/shared/contexts/AuthContext';
import { supabase } from '@/shared/lib/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { cn } from '@/shared/lib/utils';
import { safeLocalStorageParse } from '@/shared/lib/storage';

const Settings: React.FC = () => {
  const { user, refreshUser } = useAuth();
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
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    enabled: true,
    intervalDays: 1,
    startDate: null,
    lastBackupAt: null,
  });
  const [isBackupSaving, setIsBackupSaving] = useState(false);
  
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isDoctorDialogOpen, setIsDoctorDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    specialization: '',
    department: '',
    phone: '',
    email: ''
  });
  const [deleteDoctorId, setDeleteDoctorId] = useState<string | null>(null);
  const [isDeletingDoctor, setIsDeletingDoctor] = useState(false);
  
  const [typingSettings, setTypingSettings] = useState(() => 
    safeLocalStorageParse('smartcare_settings', { autocorrectEnabled: true })
  );

  useEffect(() => {
    localStorage.setItem('smartcare_settings', JSON.stringify(typingSettings));
  }, [typingSettings]);

  useEffect(() => {
    document.title = 'Settings | Siara Dental';
    fetchWaStatus();
    fetchEmailStatus();
    fetchBackupSettings();
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const data = await api.getDoctors();
      setDoctors(data);
    } catch (err) {
      console.error('Failed to fetch doctors', err);
    }
  };

  const handleDoctorSave = async () => {
    if (!doctorForm.name) {
      toast.error('Doctor name is required');
      return;
    }
    try {
      if (editingDoctor) {
        await api.updateDoctor(editingDoctor.id, doctorForm);
        toast.success('Doctor updated');
      } else {
        await api.createDoctor(doctorForm);
        toast.success('Doctor added');
      }
      setIsDoctorDialogOpen(false);
      setEditingDoctor(null);
      setDoctorForm({ name: '', specialization: '', department: '', phone: '', email: '' });
      fetchDoctors();
    } catch (err) {
      toast.error('Failed to save doctor');
    }
  };

  const handleDoctorDelete = async (id: string) => {
    setIsDeletingDoctor(true);
    try {
      await api.deleteDoctor(id);
      toast.success('Doctor deleted');
      fetchDoctors();
      setDeleteDoctorId(null);
    } catch (err) {
      toast.error('Failed to delete doctor');
    } finally {
      setIsDeletingDoctor(false);
    }
  };

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

  const fetchBackupSettings = async () => {
    try {
      const res = await api.getBackupSettings();
      setBackupSettings(res);
    } catch (err) {
      console.error('Failed to fetch backup settings', err);
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
      await refreshUser();
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
      await refreshUser();
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

  const saveBackupSettings = async (
    updates: Partial<Pick<BackupSettings, 'enabled' | 'intervalDays' | 'startDate'>>,
    successMessage: string
  ) => {
    const nextInterval = updates.intervalDays ?? backupSettings.intervalDays;
    if (nextInterval < 1 || nextInterval > 365) {
      toast.error('Backup interval must be between 1 and 365 days');
      return;
    }

    setIsBackupSaving(true);
    try {
      const res = await api.updateBackupSettings(updates);
      setBackupSettings(res);
      toast.success(successMessage);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update backup settings');
    } finally {
      setIsBackupSaving(false);
    }
  };

  const handleBackupPresetChange = (value: string) => {
    if (value === 'custom') return;
    setBackupSettings((prev) => ({ ...prev, intervalDays: Number(value) }));
  };

  const backupPresetValue = ['1', '2', '3', '5', '7', '10'].includes(String(backupSettings.intervalDays))
    ? String(backupSettings.intervalDays)
    : 'custom';

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
        <TabsList className="w-full justify-start gap-1 overflow-x-auto whitespace-nowrap md:w-auto">
          <TabsTrigger value="profile" className="shrink-0">Profile</TabsTrigger>
          <TabsTrigger value="integrations" className="shrink-0">Integrations</TabsTrigger>
          <TabsTrigger value="typing" className="shrink-0">Typing</TabsTrigger>
          <TabsTrigger value="doctors" className="shrink-0">Doctors</TabsTrigger>
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
                      <Badge variant={waStatus.status === 'connected' ? 'default' : 'secondary'} className={cn("text-[10px] h-4", waStatus.status === 'connected' && "bg-emerald-500 hover:bg-emerald-600 text-white")}>
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

              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700">
                      <DatabaseBackup className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-emerald-800">Automated data backup</p>
                        <Badge variant={backupSettings.enabled ? 'default' : 'secondary'} className={cn("h-4 text-[10px]", backupSettings.enabled && "bg-emerald-500 hover:bg-emerald-600 text-white")}>
                          {backupSettings.enabled ? 'enabled' : 'off'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Email a full database backup at 2:00 AM IST on the selected schedule.
                      </p>
                      {backupSettings.lastBackupAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Last sent: {new Date(backupSettings.lastBackupAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isBackupSaving && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    <Switch
                      checked={backupSettings.enabled}
                      disabled={isBackupSaving}
                      onCheckedChange={(checked) => saveBackupSettings(
                        { enabled: checked },
                        `Automated backup ${checked ? 'enabled' : 'disabled'}`
                      )}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_120px_1fr_auto] md:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="backup-preset">Frequency</Label>
                    <Select
                      value={backupPresetValue}
                      onValueChange={handleBackupPresetChange}
                      disabled={!backupSettings.enabled || isBackupSaving}
                    >
                      <SelectTrigger id="backup-preset" className="bg-background">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Every day</SelectItem>
                        <SelectItem value="2">Every 2 days</SelectItem>
                        <SelectItem value="3">Every 3 days</SelectItem>
                        <SelectItem value="5">Every 5 days</SelectItem>
                        <SelectItem value="7">Every 7 days</SelectItem>
                        <SelectItem value="10">Every 10 days</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backup-interval">Days</Label>
                    <Input
                      id="backup-interval"
                      type="number"
                      autoComplete="off"
                      min={1}
                      max={365}
                      value={backupSettings.intervalDays}
                      disabled={!backupSettings.enabled || isBackupSaving}
                      onChange={(e) => setBackupSettings((prev) => ({
                        ...prev,
                        intervalDays: Math.max(1, Number(e.target.value) || 1),
                      }))}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backup-start-date">Start date</Label>
                    <Input
                      id="backup-start-date"
                      type="date"
                      value={backupSettings.startDate || ''}
                      disabled={!backupSettings.enabled || isBackupSaving}
                      onChange={(e) => setBackupSettings((prev) => ({
                        ...prev,
                        startDate: e.target.value || null,
                      }))}
                      className="bg-background"
                    />
                  </div>
                  <Button
                    disabled={!backupSettings.enabled || isBackupSaving}
                    onClick={() => saveBackupSettings(
                      {
                        intervalDays: backupSettings.intervalDays,
                        startDate: backupSettings.startDate,
                      },
                      'Backup schedule saved'
                    )}
                  >
                    Save
                  </Button>
                </div>
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

        <TabsContent value="typing" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Type className="h-4 w-4" /> Typing & Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border/50 bg-secondary/15 p-4">
                <div className="flex gap-3">
                  <div className="mt-1 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Intelligent Clinical Autocorrect</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Automatically fix spelling errors for medical and dental terms. 
                      High-confidence matches are corrected silently, while others show suggestions.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={typingSettings.autocorrectEnabled}
                  onCheckedChange={(v) => setTypingSettings((prev: any) => ({ ...prev, autocorrectEnabled: v }))}
                />
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong>How it works:</strong> Our spellchecker uses a local Web Worker and a custom medical dictionary 
                  (200+ specialized terms) to provide instant corrections without any data leaving your browser. 
                  Offline-ready and privacy-compliant.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="doctors" className="mt-4">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" /> Manage Doctors
              </CardTitle>
              <Button size="sm" onClick={() => {
                setEditingDoctor(null);
                setDoctorForm({ name: '', specialization: '', department: '', phone: '', email: '' });
                setIsDoctorDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-1" /> Add Doctor
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {doctors.length === 0 ? (
                  <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-sm">
                    No doctors added yet.
                  </div>
                ) : (
                  doctors.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-secondary/15">
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.specialization} • {doc.department}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingDoctor(doc);
                          setDoctorForm({
                            name: doc.name,
                            specialization: doc.specialization,
                            department: doc.department,
                            phone: doc.phone || '',
                            email: doc.email || ''
                          });
                          setIsDoctorDialogOpen(true);
                        }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteDoctorId(doc.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDoctorDialogOpen} onOpenChange={setIsDoctorDialogOpen}>
        <DialogContent className="h-screen w-full overflow-hidden rounded-none border-white/60 bg-white/95 p-0 shadow-[0_20px_60px_rgba(26,18,14,0.16)] backdrop-blur-xl sm:h-auto sm:max-w-md sm:rounded-[30px]">
          <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-secondary/50 via-white to-secondary/30 px-6 py-4">
            <DialogHeader className="space-y-1">
              <DialogTitle className="font-heading text-xl font-semibold">{editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {editingDoctor ? 'Update professional information for the doctor.' : 'Register a new doctor for clinical operations.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-4 p-6">
            <div className="grid gap-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
              <Input 
                value={doctorForm.name} 
                onChange={e => setDoctorForm({...doctorForm, name: e.target.value})}
                placeholder="Dr. John Doe"
                className="rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Specialization</Label>
                <Input 
                  value={doctorForm.specialization} 
                  onChange={e => setDoctorForm({...doctorForm, specialization: e.target.value})}
                  placeholder="Dentist"
                  className="rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Department</Label>
                <Input 
                  value={doctorForm.department} 
                  onChange={e => setDoctorForm({...doctorForm, department: e.target.value})}
                  placeholder="Orthodontics"
                  className="rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</Label>
                <Input 
                  value={doctorForm.phone} 
                  onChange={e => setDoctorForm({...doctorForm, phone: e.target.value})}
                  placeholder="9876543210"
                  className="rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input 
                  value={doctorForm.email} 
                  onChange={e => setDoctorForm({...doctorForm, email: e.target.value})}
                  placeholder="doctor@example.com"
                  className="rounded-xl border-border/60 bg-muted/30 focus:bg-background transition-colors"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 bg-secondary/15 px-6 py-4 border-t border-border/60">
            <Button variant="outline" onClick={() => setIsDoctorDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleDoctorSave} className="rounded-xl shadow-sm shadow-primary/20">Save Doctor</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isWaModalOpen} onOpenChange={(open) => {
        if (!open) {
          handleWaToggle(false);
          setIsWaModalOpen(false);
          setIsConnecting(false);
        }
      }}>
        <DialogContent className="h-screen w-full rounded-none sm:h-auto sm:max-w-md sm:rounded-xl">
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
      <AlertDialog open={!!deleteDoctorId} onOpenChange={(open) => !open && setDeleteDoctorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Doctor?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this doctor? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingDoctor}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDoctorId && handleDoctorDelete(deleteDoctorId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingDoctor}
            >
              {isDeletingDoctor ? "Deleting..." : "Delete Doctor"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default Settings;
