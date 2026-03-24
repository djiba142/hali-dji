import { AlertTriangle, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Alert } from '@/types';
import { cn } from '@/lib/utils';

interface AlertCardProps {
  alert: Alert;
  onResolve?: (id: string) => void;
  onSelect?: (alert: Alert) => void;
}

export function AlertCard({ alert, onResolve, onSelect }: AlertCardProps) {
  const isCritical = alert.niveau === 'critique';
  const formattedDate = new Date(alert.dateCreation).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      onClick={() => onSelect && onSelect(alert)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      className={cn(
      "p-4 rounded-xl border transition-all duration-200 hover:shadow-md",
      isCritical 
        ? "bg-red-50 border-red-200 hover:border-red-300" 
        : "bg-amber-50 border-amber-200 hover:border-amber-300"
    ) + (onSelect ? ' cursor-pointer' : '')}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg flex-shrink-0",
          isCritical ? "bg-red-100" : "bg-amber-100"
        )}>
          {isCritical ? (
            <AlertCircle className="h-5 w-5 text-stock-critical animate-pulse" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-stock-warning" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-semibold uppercase",
              isCritical ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"
            )}>
              {isCritical ? 'Critique' : 'Alerte'}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formattedDate}
            </span>
          </div>
          
          <p className={cn(
            "font-medium text-sm",
            isCritical ? "text-red-900" : "text-amber-900"
          )}>
            {alert.message}
          </p>
          
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-muted-foreground">
              {alert.stationNom} • {alert.entrepriseNom}
            </span>
          </div>
        </div>

        {onResolve && (
          <button
            onClick={(e) => { e.stopPropagation(); onResolve(alert.id); }}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isCritical 
                ? "hover:bg-red-200 text-red-700" 
                : "hover:bg-amber-200 text-amber-700"
            )}
            title="Marquer comme résolu"
          >
            <CheckCircle2 className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

interface AlertsListProps {
  alerts: Alert[];
  onResolve?: (id: string) => void;
  onSelect?: (alert: Alert) => void;
  maxItems?: number;
}

export function AlertsList({ alerts, onResolve, onSelect, maxItems }: AlertsListProps) {
  // allow parent to listen to selection by using onSelect in AlertCard via spread
  const displayAlerts = maxItems ? alerts.slice(0, maxItems) : alerts;
  const criticalFirst = [...displayAlerts].sort((a, b) => 
    a.niveau === 'critique' && b.niveau !== 'critique' ? -1 : 1
  );

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-stock-healthy" />
        <p className="font-medium">Aucune alerte active</p>
        <p className="text-sm">Tous les stocks sont à des niveaux normaux</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {criticalFirst.map((alert) => (
        <AlertCard key={alert.id} alert={alert} onResolve={onResolve} onSelect={onSelect} />
      ))}
    </div>
  );
}
