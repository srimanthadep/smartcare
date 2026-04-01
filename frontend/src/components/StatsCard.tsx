import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, changeType = 'neutral', icon: Icon, iconColor }) => {
  return (
    <Card className="border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-heading font-bold text-foreground">{value}</p>
            {change && (
              <p className={cn(
                'text-xs font-medium',
                changeType === 'positive' && 'text-success',
                changeType === 'negative' && 'text-destructive',
                changeType === 'neutral' && 'text-muted-foreground',
              )}>
                {change}
              </p>
            )}
          </div>
          <div className={cn('p-2.5 rounded-lg', iconColor || 'bg-primary/10')}>
            <Icon className={cn('h-5 w-5', iconColor ? 'text-primary-foreground' : 'text-primary')} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
