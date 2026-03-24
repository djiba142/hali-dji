import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Bell,
  Check,
  AlertTriangle,
  AlertCircle,
  Info,
  Fuel,
  Truck,
  X,
  BellRing
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  icon: 'alert' | 'fuel' | 'truck' | 'info' | 'success';
  source: 'alerte' | 'notification';
}

const iconMap = {
  alert: AlertCircle,
  fuel: Fuel,
  truck: Truck,
  info: Info,
  success: Check,
};

const typeStyles = {
  critical: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
  success: 'bg-green-50 border-green-200 text-green-700',
};

const iconStyles = {
  critical: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
  success: 'text-green-500',
};

export function NotificationCenter() {
  const { profile, role, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const lastSeenId = useRef<string | null>(null);

  const fetchNotifications = useCallback(async (shouldToast = false) => {
    try {
      setLoading(true);
      // 1. Fetch alerts from Supabase
      const alertsQuery = supabase
        .from('alertes')
        .select('*, station:stations(nom)')
        .order('created_at', { ascending: false })
        .limit(20);

      const notificationsQuery = (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const [resAlerts, resNotifications] = await Promise.all([
        alertsQuery,
        notificationsQuery
      ]);

      const alertsMapped: Notification[] = (resAlerts.data || []).map(a => ({
        id: a.id,
        type: a.niveau === 'critique' ? 'critical' : 'warning',
        title: a.niveau === 'critique' ? 'Rupture imminente' : 'Stock bas',
        message: `${a.station?.nom || 'Station'}: ${a.message}`,
        timestamp: parseISO(a.created_at),
        read: a.resolu || false,
        icon: a.type === 'stock_critical' ? 'alert' : 'fuel',
        source: 'alerte'
      }));

      const notificationsMapped: Notification[] = (resNotifications.data as any[] || []).map((n) => ({
        id: n.id,
        type: n.type || 'info',
        title: n.title || '',
        message: n.message || '',
        timestamp: parseISO(n.created_at),
        read: n.read || false,
        icon: n.type === 'success' ? 'success' : 'info',
        source: 'notification'
      }));

      // Consolidation logic: only keep the most recent unresolved alert per station/fuel
      const consolidatedAlerts: Notification[] = [];
      const seen = new Set();
      const allNotifs = [...notificationsMapped, ...alertsMapped]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      allNotifs.forEach(n => {
          if (n.source === 'alerte' && !n.read) {
            const key = n.message.split(':')[0] + (n.message.includes('essence') ? 'E' : 'G');
            if (!seen.has(key)) {
              consolidatedAlerts.push(n);
              seen.add(key);
            }
          } else {
            consolidatedAlerts.push(n);
          }
        });

      const finalNotifs = consolidatedAlerts.slice(0, 15);
      setNotifications(finalNotifs);

      // Toast Logic for new entries
      if (shouldToast && allNotifs.length > 0) {
        const latest = allNotifs[0];
        if (latest.id !== lastSeenId.current && !latest.read) {
          const type = latest.type === 'critical' ? 'error' : latest.type === 'warning' ? 'warning' : 'info';
          (toast as any)[type](latest.title, {
            description: latest.message,
            duration: 6000,
          });
          lastSeenId.current = latest.id;
        }
      } else if (!lastSeenId.current && allNotifs.length > 0) {
        lastSeenId.current = allNotifs[0].id;
      }

      // 2. AUTO-CHECK: Identify fuel levels and sync alerts
      const monitoringRoles = ['super_admin', 'service_it', 'admin_etat', 'admin_central', 'inspecteur', 'analyste_regulation', 'directeur_administratif', 'directeur_logistique', 'responsable_depots'];
      if (role && monitoringRoles.includes(role)) {
        const { data: stations } = await supabase.from('stations').select('id, nom, stock_essence, capacite_essence, stock_gasoil, capacite_gasoil, entreprise_id');

        for (const station of (stations || [])) {
          const checkFuel = async (fuelType: 'essence' | 'gasoil') => {
            const stock = station[`stock_${fuelType}` as keyof typeof station] as number;
            const capacite = station[`capacite_${fuelType}` as keyof typeof station] as number;
            if (capacite > 0) {
              const percent = (stock / capacite) * 100;
              if (percent < 10) {
                // Check if an UNRESOLVED alert already exists
                const { count } = await supabase
                  .from('alertes')
                  .select('*', { count: 'exact', head: true })
                  .eq('station_id', station.id)
                  .eq('resolu', false)
                  .ilike('message', `%${fuelType}%`);

                if (count === 0) {
                  await supabase.from('alertes').insert({
                    station_id: station.id,
                    entreprise_id: station.entreprise_id,
                    type: percent < 5 ? 'stock_critical' : 'stock_warning',
                    niveau: percent < 5 ? 'critique' : 'alerte',
                    message: `Le niveau ${fuelType === 'essence' ? "d'essence" : "de gasoil"} est à ${Math.round(percent)}% (${stock}L)`,
                    resolu: false
                  });
                }
              } else {
                // If stock is OK but alert is open, resolve it
                await supabase
                  .from('alertes')
                  .update({ resolu: true, resolu_at: new Date().toISOString() })
                  .eq('station_id', station.id)
                  .eq('resolu', false)
                  .ilike('message', `%${fuelType}%`);
              }
            }
          };

          await checkFuel('essence');
          await checkFuel('gasoil');
        }
      }
    } catch (err) {
      console.error('NotificationCenter error:', err);
    } finally {
      setLoading(false);
    }
  }, [role, user?.id]);

  useEffect(() => {
    fetchNotifications(false); // Initial fetch without toast

    const channel = supabase
      .channel('global-notifications-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alertes' }, () => fetchNotifications(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' } as any, () => fetchNotifications(true))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stations' }, () => fetchNotifications(true))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (notification: Notification) => {
    try {
      if (notification.source === 'alerte') {
        await supabase.from('alertes').update({ resolu: true, resolu_at: new Date().toISOString() }).eq('id', notification.id);
      } else {
        await (supabase as any).from('notifications').update({ read: true }).eq('id', notification.id);
      }
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unresolvedAlertsIds = notifications.filter(n => !n.read && n.source === 'alerte').map(n => n.id);
      const unreadNotifsIds = notifications.filter(n => !n.read && n.source === 'notification').map(n => n.id);

      if (unresolvedAlertsIds.length > 0) {
        await supabase.from('alertes').update({ resolu: true, resolu_at: new Date().toISOString() }).in('id', unresolvedAlertsIds);
      }
      if (unreadNotifsIds.length > 0) {
        await (supabase as any).from('notifications').update({ read: true }).in('id', unreadNotifsIds);
      }
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  };

  const removeNotification = async (notification: Notification) => {
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
    if (notification.source === 'notification') {
      await (supabase as any).from('notifications').delete().eq('id', notification.id);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-stock-critical text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[420px] p-0 shadow-2xl border-slate-200">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-none">Centre de Notifications</h3>
            <p className="text-xs font-medium text-slate-500 mt-1.5 uppercase tracking-wider">
              {unreadCount} message{unreadCount > 1 ? 's' : ''} non lu{unreadCount > 1 ? 's' : ''}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 font-bold border-slate-200 hover:bg-slate-50 gap-2"
              onClick={markAllAsRead}
            >
              <Check className="h-4 w-4 text-emerald-500" />
              Tout lire
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-10 text-center animate-in fade-in zoom-in duration-300">
              <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                <BellRing className="h-10 w-10 text-slate-300 animate-pulse" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">Tout est à jour !</h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                Vous n'avez aucune notification pour le moment. Nous vous alerterons dès qu'un événement nécessitera votre attention.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = iconMap[notification.icon];

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 transition-colors cursor-pointer relative group",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => markAsRead(notification)}
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0",
                        typeStyles[notification.type]
                      )}>
                        <Icon className={cn("h-4 w-4", iconStyles[notification.type])} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={cn(
                              "text-[15px] leading-tight mb-1",
                              !notification.read ? "font-bold text-slate-950 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"
                            )}>
                              {notification.title}
                            </p>
                            <p className={cn(
                              "text-sm leading-relaxed",
                              !notification.read ? "text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400"
                            )}>
                              {notification.message}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 mt-2 flex items-center gap-1">
                          {formatDistanceToNow(notification.timestamp, {
                            addSuffix: true,
                            locale: fr
                          })}
                        </p>
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t bg-muted/30">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            Voir toutes les notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
