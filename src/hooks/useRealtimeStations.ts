import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface Station {
  id: string;
  nom: string;
  code: string;
  ville: string;
  region: string;
  adresse: string;
  type: string;
  statut: string;
  entreprise_id: string;
  latitude: number | null;
  longitude: number | null;
  stock_essence: number;
  stock_gasoil: number;
  stock_gpl: number;
  stock_lubrifiants: number;
  capacite_essence: number;
  capacite_gasoil: number;
  capacite_gpl: number;
  capacite_lubrifiants: number;
  gestionnaire_nom: string | null;
  gestionnaire_telephone: string | null;
  nombre_pompes: number;
}

export function useRealtimeStations(entrepriseId?: string) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<any>(null);

  const fetchStations = useCallback(async () => {
    try {
      let query = supabase
        .from('stations')
        .select('*')
        .order('nom');

      if (entrepriseId) {
        query = query.eq('entreprise_id', entrepriseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStations(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    fetchStations();

    // Subscribe to realtime updates - better filtering on client side
    const channel = supabase
      .channel(`stations-realtime-${entrepriseId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stations',
        },
        (payload: RealtimePostgresChangesPayload<Station>) => {
          if (payload.eventType === 'INSERT') {
            const newStation = payload.new as Station;
            // Filter on client side if needed
            if (entrepriseId && newStation.entreprise_id !== entrepriseId) return;
            
            setStations(prev => {
              // Prevent duplicates
              if (prev.some(s => s.id === newStation.id)) return prev;
              return [...prev, newStation];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedStation = payload.new as Station;
            if (entrepriseId && updatedStation.entreprise_id !== entrepriseId) return;
            
            setStations(prev =>
              prev.map(s => (s.id === updatedStation.id ? updatedStation : s))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setStations(prev => prev.filter(s => s.id !== deletedId));
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
  }, [fetchStations, entrepriseId]);

  return { stations, loading, error, refetch: fetchStations };
}
