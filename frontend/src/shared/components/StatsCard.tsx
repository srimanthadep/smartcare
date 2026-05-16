import React from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, LucideIcon, Minus } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from '@/shared/lib/utils';

type ChangeType = "positive" | "negative" | "neutral";

interface StatsCardProps {
  title: React.ReactNode;
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
          "relative h-full overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
          className
        )}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-primary/40 to-primary/10" />
        <CardContent className="relative flex h-full min-h-[132px] flex-col p-5">
          <div className="mb-4 pr-14 flex-1">
            <div className="min-h-[60px] space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground leading-tight">
                {title}
              </p>
              <h3 className="text-[clamp(18px,2.1vw,24px)] font-semibold leading-tight text-foreground">
                {value}
              </h3>
            </div>
          </div>

          <div className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>

          <div className="flex min-h-[20px] items-center gap-2 overflow-hidden">
            {change ? (
              <div
                className={cn(
                  "inline-flex max-w-[65%] items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  changeMap[changeType]
                )}
              >
                {iconMap[changeType]}
                <span className="truncate">{change}</span>
              </div>
            ) : (
              <div className="h-5" />
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StatsCard;
