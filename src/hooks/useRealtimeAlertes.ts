import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface Alerte {
  id: string;
  station_id: string | null;
  entreprise_id: string | null;
  type: string;
  niveau: string;
  message: string;
  resolu: boolean;
  resolu_at: string | null;
  resolu_par: string | null;
  created_at: string;
}

interface UseRealtimeAlertesOptions {
  entrepriseId?: string;
  stationId?: string;
  onlyUnresolved?: boolean;
  showToast?: boolean;
}

export function useRealtimeAlertes(options: UseRealtimeAlertesOptions = {}) {
  const { entrepriseId, stationId, onlyUnresolved = true, showToast = true } = options;
  const [alertes, setAlertes] = useState<Alerte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const toastShownRef = useRef(new Set<string>());

  const fetchAlertes = useCallback(async () => {
    try {
      let query = supabase
        .from('alertes')
        .select('*')
        .order('created_at', { ascending: false });

      if (entrepriseId) {
        query = query.eq('entreprise_id', entrepriseId);
      }
      if (stationId) {
        query = query.eq('station_id', stationId);
      }
      if (onlyUnresolved) {
        query = query.eq('resolu', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAlertes(data || []);
      setError(null);
      // Clear toast tracking for new data
      toastShownRef.current.clear();
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [entrepriseId, stationId, onlyUnresolved]);

  useEffect(() => {
    fetchAlertes();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`alertes-realtime-${entrepriseId || 'all'}-${stationId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alertes',
        },
        (payload: RealtimePostgresChangesPayload<Alerte>) => {
          if (payload.eventType === 'INSERT') {
            const newAlerte = payload.new as Alerte;
            
            // Check if this alert matches our filters
            if (entrepriseId && newAlerte.entreprise_id !== entrepriseId) return;
            if (stationId && newAlerte.station_id !== stationId) return;
            if (onlyUnresolved && newAlerte.resolu) return;

            setAlertes(prev => {
              // Prevent duplicates
              if (prev.some(a => a.id === newAlerte.id)) return prev;
              return [newAlerte, ...prev];
            });

            // Show toast notification once per alert
            if (showToast && !toastShownRef.current.has(newAlerte.id)) {
              toastShownRef.current.add(newAlerte.id);
              toast({
                variant: newAlerte.niveau === 'critique' ? 'destructive' : 'default',
                title: newAlerte.niveau === 'critique' ? '🚨 Alerte Critique' : '⚠️ Nouvelle Alerte',
                description: newAlerte.message,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedAlerte = payload.new as Alerte;
            
            if (onlyUnresolved && updatedAlerte.resolu) {
              // Remove from list if resolved and filtering for unresolved
              setAlertes(prev => prev.filter(a => a.id !== updatedAlerte.id));
            } else {
              setAlertes(prev =>
                prev.map(a => (a.id === updatedAlerte.id ? updatedAlerte : a))
              );
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setAlertes(prev => prev.filter(a => a.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setError(new Error('Real-time connection failed'));
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchAlertes, entrepriseId, stationId, onlyUnresolved, showToast, toast]);

  const resolveAlerte = useCallback(async (alerteId: string) => {
    const { error } = await supabase
      .from('alertes')
      .update({ resolu: true, resolu_at: new Date().toISOString() })
      .eq('id', alerteId);

    if (error) throw error;
    await fetchAlertes();
  }, [fetchAlertes]);

  // Memoize stats to avoid recalculation
  const { criticalCount, warningCount } = useMemo(() => ({
    criticalCount: alertes.filter(a => a.niveau === 'critique').length,
    warningCount: alertes.filter(a => a.niveau === 'warning').length,
  }), [alertes]);

  return { 
    alertes, 
    loading, 
    error, 
    refetch: fetchAlertes,
    resolveAlerte,
    criticalCount,
    warningCount,
  };
}
