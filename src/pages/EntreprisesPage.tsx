import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EntrepriseCard } from '@/components/entreprises/EntrepriseCard';
import { REGIONS } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
// Import logos
import logoTotal from '@/assets/logos/total-energies.png';
import logoShell from '@/assets/logos/shell.jpg';
import logoTMI from '@/assets/logos/tmi.jpg';
import logoKP from '@/assets/logos/kamsar-petroleum.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateEntrepriseDialog } from '@/components/dashboard/CreateEntrepriseDialog';
import type { Entreprise } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function EntreprisesPage() {
  const { role: currentUserRole, canManageEntreprises } = useAuth();
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setIsDialogOpen(true);
      // Clean up the URL to avoid re-opening on refresh
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('create');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const localLogoMapping: Record<string, string> = {
    'TOTAL': logoTotal,
    'TotalEnergies': logoTotal,
    'TO': logoTotal,
    'SHELL': logoShell,
    'VIVO': logoShell,
    'SH': logoShell,
    'TMI': logoTMI,
    'TM': logoTMI,
    'KP': logoKP,
    'Kamsar Petroleum': logoKP,
    'kamsar petroleum': logoKP,
  };

  const getLogoForEntreprise = (sigle: string, nom: string): string | undefined => {
    // Essayer d'abord avec le sigle
    if (localLogoMapping[sigle]) {
      return localLogoMapping[sigle];
    }
    // Essayer avec le nom
    if (localLogoMapping[nom]) {
      return localLogoMapping[nom];
    }
    // Essayer les variations du nom
    const nomVariations = [
      nom.split('(')[0].trim(), // "Vivo Energy Guinée"
      nom.split('-')[0].trim(), // Pour les noms avec tiret
    ];
    for (const variation of nomVariations) {
      if (localLogoMapping[variation]) {
        return localLogoMapping[variation];
      }
    }
    return undefined;
  };

  const { toast } = useToast();

  const fetchEntreprises = async () => {
    setLoading(true);
    try {
      const { data: entData, error } = await supabase
        .from('entreprises')
        .select('*')
        .order('nom');

      if (error) throw error;

      const { data: stationCounts } = await supabase
        .from('stations')
        .select('entreprise_id');

      const counts = (stationCounts || []).reduce<Record<string, number>>((acc, s) => {
        const id = s.entreprise_id;
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});

      const mapped: Entreprise[] = (entData || []).map(e => ({
        id: e.id,
        nom: e.nom,
        sigle: e.sigle,
        type: e.type as 'compagnie' | 'distributeur',
        numeroAgrement: e.numero_agrement,
        region: e.region,
        statut: e.statut as 'actif' | 'suspendu' | 'ferme',
        nombreStations: counts[e.id] ?? 0,
        logo: e.logo_url ?? getLogoForEntreprise(e.sigle, e.nom),
        contact: {
          nom: e.contact_nom || 'N/A',
          telephone: e.contact_telephone || '',
          email: e.contact_email || '',
        },
      }));

      setEntreprises(mapped);
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Erreur de chargement',
        description: err instanceof Error ? err.message : 'Impossible de charger les entreprises.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntreprises();
  }, []);

  const filteredEntreprises = entreprises.filter(e => {
    const matchesSearch = e.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.sigle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = selectedRegion === 'all' || e.region === selectedRegion;
    const matchesType = selectedType === 'all' || e.type === selectedType;
    return matchesSearch && matchesRegion && matchesType;
  });

  return (
    <DashboardLayout
      title="Entreprises"
      subtitle="Gestion des distributeurs d'hydrocarbures"
    >
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une entreprise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedRegion} onValueChange={setSelectedRegion}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Région" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les régions</SelectItem>
            {REGIONS.map(region => (
              <SelectItem key={region} value={region}>{region}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="compagnie">Compagnie</SelectItem>
            <SelectItem value="distributeur">Distributeur</SelectItem>
          </SelectContent>
        </Select>

        {canManageEntreprises && (
          <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle entreprise
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 mb-6 p-4 bg-secondary/50 rounded-xl">
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{filteredEntreprises.length}</p>
        </div>
        <div className="h-10 w-px bg-border" />
        <div>
          <p className="text-sm text-muted-foreground">Actives</p>
          <p className="text-2xl font-bold text-stock-healthy">
            {filteredEntreprises.filter(e => e.statut === 'actif').length}
          </p>
        </div>
        <div className="h-10 w-px bg-border" />
        <div>
          <p className="text-sm text-muted-foreground">Stations totales</p>
          <p className="text-2xl font-bold">
            {filteredEntreprises.reduce((sum, e) => sum + e.nombreStations, 0)}
          </p>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-12 w-12 animate-spin mb-4" />
          <p>Chargement...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEntreprises.map(entreprise => (
            <EntrepriseCard key={entreprise.id} entreprise={entreprise} />
          ))}
        </div>
      )}

      {filteredEntreprises.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Aucune entreprise trouvée</p>
          <p className="text-sm">Modifiez vos filtres</p>
        </div>
      )}

      {/* Dialog création partagé */}
      <CreateEntrepriseDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        onSuccess={fetchEntreprises}
      />
    </DashboardLayout>
  );
}