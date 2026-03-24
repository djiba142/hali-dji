import { cn } from '@/lib/utils';
import { StockLevel } from '@/types';

interface StockIndicatorProps {
  percentage: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function getStockLevel(percentage: number): StockLevel {
  if (percentage < 10) return 'critical';
  if (percentage < 25) return 'warning';
  if (percentage < 75) return 'healthy';
  return 'full';
}

const stockColors = {
  critical: 'bg-stock-critical',
  warning: 'bg-stock-warning',
  healthy: 'bg-stock-healthy',
  full: 'bg-stock-full',
};

const stockBgColors = {
  critical: 'bg-red-100',
  warning: 'bg-amber-100',
  healthy: 'bg-emerald-100',
  full: 'bg-emerald-100',
};

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

export function StockIndicator({ percentage, label, showPercentage = true, size = 'md' }: StockIndicatorProps) {
  const level = getStockLevel(percentage);

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-sm text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className={cn(
              "text-sm font-semibold",
              level === 'critical' && "text-stock-critical",
              level === 'warning' && "text-stock-warning",
              level === 'healthy' && "text-stock-healthy",
              level === 'full' && "text-stock-full"
            )}>
              {percentage}%
            </span>
          )}
        </div>
      )}
      <div className={cn(
        "stock-indicator",
        sizeStyles[size],
        stockBgColors[level]
      )}>
        <div 
          className={cn("stock-bar", stockColors[level])}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

interface StockBadgeProps {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
}

export function StockBadge({ percentage, size = 'md' }: StockBadgeProps) {
  const level = getStockLevel(percentage);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <span className={cn(
      "alert-badge",
      sizeClasses[size],
      level === 'critical' && "alert-badge-critical",
      level === 'warning' && "alert-badge-warning",
      (level === 'healthy' || level === 'full') && "alert-badge-healthy"
    )}>
      <span className={cn(
        "rounded-full",
        size === 'sm' ? 'h-1 w-1' : size === 'lg' ? 'h-2 w-2' : 'h-1.5 w-1.5',
        stockColors[level],
        level === 'critical' && "animate-pulse"
      )} />
      {percentage}%
    </span>
  );
}
