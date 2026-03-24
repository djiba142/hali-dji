import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  variant?: 'default' | 'primary' | 'warning' | 'critical' | 'success';
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground',
  warning: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white',
  critical: 'bg-gradient-to-br from-red-500 to-red-600 text-white',
  success: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
};

const iconStyles = {
  default: 'bg-secondary text-foreground',
  primary: 'bg-white/20 text-white',
  warning: 'bg-white/20 text-white',
  critical: 'bg-white/20 text-white',
  success: 'bg-white/20 text-white',
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const isColored = variant !== 'default';

  return (
    <div className={cn(
      "stat-card relative overflow-hidden",
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={cn(
            "text-sm font-medium mb-1",
            isColored ? "text-white/80" : "text-muted-foreground"
          )}>
            {title}
          </p>
          <p className={cn(
            "text-3xl font-bold font-display tracking-tight",
            isColored ? "text-white" : "text-foreground"
          )}>
            {value}
          </p>
          {subtitle && (
            <p className={cn(
              "text-sm mt-1",
              isColored ? "text-white/70" : "text-muted-foreground"
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-sm font-medium",
              trend.positive 
                ? (isColored ? "text-white" : "text-emerald-600") 
                : (isColored ? "text-white" : "text-red-600")
            )}>
              <span>{trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className={isColored ? "text-white/60" : "text-muted-foreground"}>vs hier</span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          iconStyles[variant]
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {/* Decorative element */}
      {isColored && (
        <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
      )}
    </div>
  );
}
