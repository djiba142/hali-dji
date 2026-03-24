import { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Alert } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Bell,
  BellRing,
  ShieldAlert,
  Fuel,
  MapPin,
  Building2,
  Eye,
  ChevronRight,
  Activity,
  XCircle,
  RefreshCw,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───
interface AlerteRow {
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
  // Joined data
  station?: { nom: string; stock_essence: number; stock_gasoil: number; capacite_essence: number; capacite_gasoil: number } | null;
  entreprise?: { nom: string; sigle: string } | null;
}

interface EnrichedAlert {
  id: string;
  type: string;
  stationId: string;
  stationNom: string;
  entrepriseNom: string;
  message: string;
  niveau: 'critique' | 'alerte';
  dateCreation: string;
  resolu: boolean;
  // Station stock for dialog
  stationStock?: {
    essence: number;
    gasoil: number;
    capaciteEssence: number;
    capaciteGasoil: number;
  };
}

// ─── Helpers ───
function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `il y a ${diffDays}j`;
  if (diffHours > 0) return `il y a ${diffHours}h`;
  if (diffMins > 0) return `il y a ${diffMins}min`;
  return "à l'instant";
}

function getPriorityScore(alert: EnrichedAlert): number {
  if (alert.resolu) return 0;
  if (alert.niveau === 'critique') return 3;
  return 1;
}

export default function AlertesPage() {
  const { profile, role, canModifyData } = useAuth();
  const { toast } = useToast();

  const [alerts, setAlerts] = useState<EnrichedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critique' | 'alerte' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntreprise, setSelectedEntreprise] = useState<string>('ALL');
  const [selectedAlert, setSelectedAlert] = useState<EnrichedAlert | null>(null);

  // ─── Fetch alerts from Supabase ───
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('alertes')
        .select(`
          *,
          station:stations!station_id(nom, stock_essence, stock_gasoil, capacite_essence, capacite_gasoil),
          entreprise:entreprises!entreprise_id(nom, sigle)
        `)
        .order('created_at', { ascending: false });

      // If responsable_entreprise, only show their alerts
      if (role === 'responsable_entreprise' && profile?.entreprise_id) {
        query = query.eq('entreprise_id', profile.entreprise_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped: EnrichedAlert[] = (data || []).map((row: any) => ({
        id: row.id,
        type: row.type || 'stock_warning',
        stationId: row.station_id || '',
        stationNom: row.station?.nom || 'Station inconnue',
        entrepriseNom: row.entreprise?.nom || 'Entreprise inconnue',
        message: row.message,
        niveau: (row.niveau === 'critique' ? 'critique' : 'alerte') as 'critique' | 'alerte',
        dateCreation: row.created_at,
        resolu: row.resolu || false,
        stationStock: row.station ? {
          essence: row.station.stock_essence || 0,
          gasoil: row.station.stock_gasoil || 0,
          capaciteEssence: row.station.capacite_essence || 0,
          capaciteGasoil: row.station.capacite_gasoil || 0,
        } : undefined,
      }));

      setAlerts(mapped);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur de chargement',
        description: err.message || 'Impossible de charger les alertes.',
      });
    } finally {
      setLoading(false);
    }
  }, [role, profile?.entreprise_id, toast]);

  // ─── Initial fetch + realtime subscription ───
  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel('alertes-page-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alertes' },
        () => {
          // Refetch on any change for simplicity
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts]);

  // ─── Stats ───
  const stats = useMemo(() => {
    const total = alerts.length;
    const critiques = alerts.filter(a => a.niveau === 'critique' && !a.resolu).length;
    const alertes = alerts.filter(a => a.niveau === 'alerte' && !a.resolu).length;
    const resolved = alerts.filter(a => a.resolu).length;
    const activeCount = critiques + alertes;
    return { total, critiques, alertes, resolved, activeCount };
  }, [alerts]);

  // ─── Unique entreprises ───
  const entreprises = useMemo(() => {
    return Array.from(new Set(alerts.map(a => a.entrepriseNom))).sort();
  }, [alerts]);

  // ─── Filtered and sorted ───
  const filteredAlerts = useMemo(() => {
    let result = alerts;

    if (filter === 'critique') result = result.filter(a => a.niveau === 'critique' && !a.resolu);
    else if (filter === 'alerte') result = result.filter(a => a.niveau === 'alerte' && !a.resolu);
    else if (filter === 'resolved') result = result.filter(a => a.resolu);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.message.toLowerCase().includes(q) ||
        a.stationNom.toLowerCase().includes(q) ||
        a.entrepriseNom.toLowerCase().includes(q)
      );
    }

    if (selectedEntreprise !== 'ALL') {
      result = result.filter(a => a.entrepriseNom === selectedEntreprise);
    }

    result.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
    return result;
  }, [alerts, filter, searchQuery, selectedEntreprise]);

  // ─── Resolve/unresolve in Supabase ───
  const handleResolve = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alertes')
        .update({ resolu: true, resolu_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Alerte résolue', description: 'L\'alerte a été marquée comme résolue.' });
      setSelectedAlert(null);
      // Realtime will pick it up, but also update locally for UX
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolu: true } : a));
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de résoudre l\'alerte.' });
    }
  };

  const handleUnresolve = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alertes')
        .update({ resolu: false, resolu_at: null })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Alerte rouverte', description: 'L\'alerte a été rouverte.' });
      setSelectedAlert(null);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolu: false } : a));
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de rouvrir l\'alerte.' });
    }
  };

  // ─── UI helpers ───
  const getNiveauConfig = (niveau: string, resolu: boolean) => {
    if (resolu) return {
      label: 'Résolu',
      icon: CheckCircle2,
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      badgeText: 'text-emerald-800 dark:text-emerald-300',
      iconColor: 'text-emerald-600',
      pulseRing: '',
    };
    if (niveau === 'critique') return {
      label: 'Critique',
      icon: AlertCircle,
      bgColor: 'bg-red-50/80 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-700 dark:text-red-400',
      badgeBg: 'bg-red-100 dark:bg-red-900/50',
      badgeText: 'text-red-800 dark:text-red-300',
      iconColor: 'text-red-600',
      pulseRing: 'ring-2 ring-red-300/50 ring-offset-1 animate-pulse',
    };
    return {
      label: 'Alerte',
      icon: AlertTriangle,
      bgColor: 'bg-amber-50/80 dark:bg-amber-950/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      textColor: 'text-amber-700 dark:text-amber-400',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/50',
      badgeText: 'text-amber-800 dark:text-amber-300',
      iconColor: 'text-amber-600',
      pulseRing: '',
    };
  };


  return (
    <DashboardLayout
      title="Centre d'Alertes"
      subtitle="Surveillance en temps réel des situations critiques et préventives"
    >
      {/* ── KPI Summary Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Active */}
        <Card className={cn(
          "relative overflow-hidden border-l-4 transition-all duration-300 hover:shadow-lg",
          "border-l-slate-500"
        )}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Alertes actives</p>
                <p className="text-3xl font-bold tracking-tight">{stats.activeCount}</p>
                <p className="text-xs text-muted-foreground mt-1">sur {stats.total} total</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                <BellRing className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critiques */}
        <Card className={cn(
          "relative overflow-hidden border-l-4 transition-all duration-300 hover:shadow-lg cursor-pointer",
          "border-l-red-500",
          filter === 'critique' && "ring-2 ring-red-200 shadow-lg"
        )}
          onClick={() => setFilter(filter === 'critique' ? 'all' : 'critique')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">Critiques</p>
                <p className="text-3xl font-bold tracking-tight text-red-700 dark:text-red-400">{stats.critiques}</p>
                <p className="text-xs text-muted-foreground mt-1">Intervention urgente</p>
              </div>
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400 animate-pulse" />
              </div>
            </div>
            {stats.critiques > 0 && (
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            )}
          </CardContent>
        </Card>

        {/* Alertes */}
        <Card className={cn(
          "relative overflow-hidden border-l-4 transition-all duration-300 hover:shadow-lg cursor-pointer",
          "border-l-amber-500",
          filter === 'alerte' && "ring-2 ring-amber-200 shadow-lg"
        )}
          onClick={() => setFilter(filter === 'alerte' ? 'all' : 'alerte')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Préventives</p>
                <p className="text-3xl font-bold tracking-tight text-amber-700 dark:text-amber-400">{stats.alertes}</p>
                <p className="text-xs text-muted-foreground mt-1">Surveillance requise</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resolved */}
        <Card className={cn(
          "relative overflow-hidden border-l-4 transition-all duration-300 hover:shadow-lg cursor-pointer",
          "border-l-emerald-500",
          filter === 'resolved' && "ring-2 ring-emerald-200 shadow-lg"
        )}
          onClick={() => setFilter(filter === 'resolved' ? 'all' : 'resolved')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Résolues</p>
                <p className="text-3xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">{stats.resolved}</p>
                <p className="text-xs text-muted-foreground mt-1">Traitées avec succès</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters Bar ── */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="flex-shrink-0">
              <TabsList className="bg-muted/60 h-10">
                <TabsTrigger value="all" className="gap-1.5 text-sm px-4">
                  <Bell className="h-3.5 w-3.5" />
                  Toutes
                </TabsTrigger>
                <TabsTrigger value="critique" className="gap-1.5 text-sm px-4 data-[state=active]:text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Critiques
                </TabsTrigger>
                <TabsTrigger value="alerte" className="gap-1.5 text-sm px-4 data-[state=active]:text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Préventives
                </TabsTrigger>
                <TabsTrigger value="resolved" className="gap-1.5 text-sm px-4 data-[state=active]:text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Résolues
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex-1" />

            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher station, message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            <Select value={selectedEntreprise} onValueChange={setSelectedEntreprise}>
              <SelectTrigger className="w-full lg:w-52 h-10">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Entreprise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes les entreprises</SelectItem>
                {entreprises.map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchQuery || selectedEntreprise !== 'ALL' || filter !== 'all') && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 flex-shrink-0"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedEntreprise('ALL');
                        setFilter('all');
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Réinitialiser les filtres</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Alert Table ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Journal des alertes</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {filteredAlerts.length} alerte{filteredAlerts.length !== 1 ? 's' : ''} affichée{filteredAlerts.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={fetchAlerts} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin mb-4" />
              <p className="font-medium">Chargement des alertes...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="p-4 rounded-full bg-emerald-50 dark:bg-emerald-950/30 mb-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <p className="font-semibold text-lg mb-1">Aucune alerte trouvée</p>
              <p className="text-sm">
                {filter !== 'all'
                  ? 'Aucune alerte ne correspond aux filtres sélectionnés'
                  : 'Tous les stocks sont à des niveaux normaux — situation sous contrôle'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[50px] text-center">Priorité</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Horodatage</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert) => {
                    const config = getNiveauConfig(alert.niveau, alert.resolu);
                    const IconComponent = config.icon;
                    return (
                      <TableRow
                        key={alert.id}
                        className={cn(
                          "transition-all duration-200 cursor-pointer group",
                          alert.resolu ? "opacity-60 hover:opacity-80" : "hover:bg-muted/50",
                          !alert.resolu && alert.niveau === 'critique' && "bg-red-50/30 dark:bg-red-950/10",
                        )}
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <TableCell className="text-center">
                          <div className={cn(
                            "mx-auto w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                            config.bgColor,
                            !alert.resolu && alert.niveau === 'critique' && "animate-pulse"
                          )}>
                            <IconComponent className={cn("h-4.5 w-4.5", config.iconColor)} />
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="max-w-xs">
                            <p className={cn(
                              "font-medium text-sm leading-tight",
                              alert.resolu ? "text-muted-foreground line-through" : "text-foreground"
                            )}>
                              {alert.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Fuel className="h-3 w-3" />
                              {alert.type === 'stock_critical' ? 'Stock critique' :
                                alert.type === 'stock_warning' ? 'Stock bas' :
                                  alert.type === 'price_anomaly' ? 'Anomalie prix' : 'Station fermée'}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium">{alert.stationNom}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="font-medium text-xs">
                            {alert.entrepriseNom}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div>
                            <p className="text-sm">
                              {new Date(alert.dateCreation).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(alert.dateCreation).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              <span className="text-muted-foreground/60">•</span>
                              {timeAgo(alert.dateCreation)}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge className={cn(
                            "px-2.5 py-1 text-xs font-semibold border-0",
                            config.badgeBg,
                            config.badgeText
                          )}>
                            {config.label}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAlert(alert);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Voir détails</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {canModifyData && !alert.resolu && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResolve(alert.id);
                                      }}
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Marquer résolu</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Alert Detail Dialog ── */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        {selectedAlert && (() => {
          const config = getNiveauConfig(selectedAlert.niveau, selectedAlert.resolu);
          const IconComponent = config.icon;
          return (
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
              {/* Header banner */}
              <div className={cn(
                "px-6 pt-6 pb-4",
                selectedAlert.niveau === 'critique' && !selectedAlert.resolu
                  ? "bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/10"
                  : selectedAlert.resolu
                    ? "bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/10"
                    : "bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/10"
              )}>
                <DialogHeader>
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-xl",
                      config.bgColor,
                      "border",
                      config.borderColor
                    )}>
                      <IconComponent className={cn("h-6 w-6", config.iconColor)} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn("text-xs font-semibold border-0", config.badgeBg, config.badgeText)}>
                          {config.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ID: {selectedAlert.id.substring(0, 8)}
                        </span>
                      </div>
                      <DialogTitle className="text-base font-semibold leading-snug">
                        {selectedAlert.message}
                      </DialogTitle>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              {/* Details */}
              <div className="px-6 pb-6 space-y-5">
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Station</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{selectedAlert.stationNom}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entreprise</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{selectedAlert.entrepriseNom}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date de création</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        {new Date(selectedAlert.dateCreation).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</p>
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        {selectedAlert.type === 'stock_critical' ? 'Stock critique' :
                          selectedAlert.type === 'stock_warning' ? 'Stock en alerte' :
                            selectedAlert.type === 'price_anomaly' ? 'Anomalie prix' : 'Station fermée'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Station stock levels from Supabase */}
                {selectedAlert.stationStock && (
                  <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <TrendingDown className="h-3.5 w-3.5" />
                      Niveaux de stock de la station
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { label: 'Essence', current: selectedAlert.stationStock.essence, capacity: selectedAlert.stationStock.capaciteEssence },
                        { label: 'Gasoil', current: selectedAlert.stationStock.gasoil, capacity: selectedAlert.stationStock.capaciteGasoil },
                      ]).map(fuel => {
                        const percent = fuel.capacity > 0 ? Math.round((fuel.current / fuel.capacity) * 100) : 0;
                        const isCritical = percent < 10;
                        const isWarning = percent >= 10 && percent < 25;
                        return (
                          <div key={fuel.label} className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium">{fuel.label}</span>
                              <span className={cn(
                                "text-xs font-bold",
                                isCritical ? "text-red-600" : isWarning ? "text-amber-600" : "text-emerald-600"
                              )}>
                                {percent}%
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                                )}
                                style={{ width: `${Math.min(percent, 100)}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {fuel.current.toLocaleString('fr-FR')} / {fuel.capacity.toLocaleString('fr-FR')} L
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  {canModifyData && (
                    <>
                      {!selectedAlert.resolu ? (
                        <Button
                          className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleResolve(selectedAlert.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Marquer comme résolu
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => handleUnresolve(selectedAlert.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Rouvrir l'alerte
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    variant="outline"
                    className={canModifyData ? "" : "w-full"}
                    onClick={() => setSelectedAlert(null)}
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>
    </DashboardLayout>
  );
}
