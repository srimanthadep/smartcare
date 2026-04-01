import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  Active: 'bg-success/10 text-success border-success/20',
  Inactive: 'bg-muted text-muted-foreground border-border',
  Critical: 'bg-destructive/10 text-destructive border-destructive/20',
  Scheduled: 'bg-info/10 text-info border-info/20',
  'In Progress': 'bg-warning/10 text-warning border-warning/20',
  Completed: 'bg-success/10 text-success border-success/20',
  Cancelled: 'bg-muted text-muted-foreground border-border',
  Paid: 'bg-success/10 text-success border-success/20',
  Pending: 'bg-warning/10 text-warning border-warning/20',
  Overdue: 'bg-destructive/10 text-destructive border-destructive/20',
  // Dental procedure types
  Checkup: 'bg-primary/10 text-primary border-primary/20',
  'Root Canal': 'bg-destructive/10 text-destructive border-destructive/20',
  Extraction: 'bg-destructive/10 text-destructive border-destructive/20',
  Orthodontics: 'bg-info/10 text-info border-info/20',
  Cosmetic: 'bg-success/10 text-success border-success/20',
  Consultation: 'bg-primary/10 text-primary border-primary/20',
  Prosthodontics: 'bg-info/10 text-info border-info/20',
  Filling: 'bg-warning/10 text-warning border-warning/20',
  Emergency: 'bg-destructive/10 text-destructive border-destructive/20',
  'Follow-up': 'bg-muted text-muted-foreground border-border',
  // Dental queue statuses
  Waiting: 'bg-warning/10 text-warning border-warning/20',
  'In Chair': 'bg-primary/10 text-primary border-primary/20',
  'X-Ray': 'bg-info/10 text-info border-info/20',
  'In Triage': 'bg-warning/10 text-warning border-warning/20',
  Billing: 'bg-success/10 text-success border-success/20',
  // Lab order statuses
  Ordered: 'bg-info/10 text-info border-info/20',
  'Sample Collected': 'bg-warning/10 text-warning border-warning/20',
  Processing: 'bg-warning/10 text-warning border-warning/20',
  Reported: 'bg-success/10 text-success border-success/20',
  Routine: 'bg-muted text-muted-foreground border-border',
  Urgent: 'bg-destructive/10 text-destructive border-destructive/20',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        statusStyles[status] || 'bg-muted text-muted-foreground border-border',
        className,
      )}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
