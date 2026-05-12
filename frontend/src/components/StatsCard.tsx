import React from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, LucideIcon, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ChangeType = "positive" | "negative" | "neutral";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: ChangeType;
  icon: LucideIcon;
  className?: string;
}

const changeMap: Record<ChangeType, string> = {
  positive: "text-success bg-success/10 border-success/20",
  negative: "text-destructive bg-destructive/10 border-destructive/20",
  neutral: "text-muted-foreground bg-secondary border-border/70",
};

const iconMap: Record<ChangeType, React.ReactNode> = {
  positive: <ArrowUpRight className="h-3.5 w-3.5" />,
  negative: <ArrowDownRight className="h-3.5 w-3.5" />,
  neutral: <Minus className="h-3.5 w-3.5" />,
};

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
          className
        )}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-primary/40 to-primary/10" />
        <CardContent className="relative p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
              <h3 className="text-2xl font-semibold text-foreground">
                {value}
              </h3>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-1 overflow-hidden">
            {change ? (
              <div
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                  changeMap[changeType]
                )}
              >
                {iconMap[changeType]}
                <span>{change}</span>
              </div>
            ) : (
              <div className="h-5" />
            )}

            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
              Updated just now
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StatsCard;
