import React from "react";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeStyles = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.02em] shadow-sm",
  {
    variants: {
      tone: {
        neutral: "border-border/70 bg-white/80 text-muted-foreground",
        info: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
        warning:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
        danger:
          "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300",
        violet:
          "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300",
        orange:
          "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  }
);

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "violet" | "orange";

const STATUS_TONE_MAP: Record<string, Tone> = {
  Active: "success",
  Inactive: "neutral",
  Critical: "danger",

  Pending: "warning",
  Paid: "success",
  "Partially Paid": "info",
  Overdue: "danger",

  Scheduled: "info",
  Cancelled: "danger",
  Completed: "success",

  Waiting: "warning",
  "In Triage": "violet",
  "In Chair": "info",
  "X-Ray": "orange",
  Billing: "warning",

  Checkup: "info",
  "Root Canal": "danger",
  Extraction: "danger",
  Orthodontics: "violet",
  Cosmetic: "orange",
  Consultation: "neutral",
  Prosthodontics: "violet",
  Filling: "info",
  Emergency: "danger",
  "Follow-up": "success",
};

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const label = status || "Unknown";
  const tone = STATUS_TONE_MAP[label] ?? "neutral";

  return (
    <span className={cn(badgeStyles({ tone }), className)}>
      <span
        className={cn(
          "mr-1.5 h-1.5 w-1.5 rounded-full",
          tone === "success" && "bg-emerald-500",
          tone === "warning" && "bg-amber-500",
          tone === "danger" && "bg-rose-500",
          tone === "info" && "bg-sky-500",
          tone === "violet" && "bg-violet-500",
          tone === "orange" && "bg-orange-500",
          tone === "neutral" && "bg-slate-400"
        )}
      />
      {label}
    </span>
  );
};

export default StatusBadge;