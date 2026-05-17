import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Shield, Bell, Database, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';

const AdminSettings: React.FC = () => {
  React.useEffect(() => { document.title = 'Admin Settings | Admin'; }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Admin Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration and preferences</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Info className="h-4 w-4 text-primary" />Application Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">App Name</span><span className="font-medium">Siara Dental</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Version</span><span>1.0.0</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Environment</span><span className="capitalize">{import.meta.env.MODE}</span></div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />Security Settings</CardTitle>
            <CardDescription className="text-xs">Manage security policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Roles Available</span><span>Admin, Doctor, Receptionist</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Session Management</span><span className="text-success">Active</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Audit Logging</span><span className="text-success">Active</span></div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Bell className="h-4 w-4 text-primary" />Notification Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Security Alerts</span><span className="text-success">Enabled</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Backup Alerts</span><span className="text-success">Enabled</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Login Monitoring</span><span className="text-success">Enabled</span></div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Database className="h-4 w-4 text-primary" />Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Soft Delete</span><span className="text-success">Enabled</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Audit Trail</span><span className="text-success">Active</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Automated Backups</span><span className="text-success">Configured</span></div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default AdminSettings;
