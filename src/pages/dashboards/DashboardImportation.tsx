import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Ship, Anchor, FolderOpen, TrendingUp, Clock, AlertCircle, 
  Plus, Search, Filter, ArrowUpRight, Calendar, Package
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ImportDossier, ImportWorkflowStatus } from '@/types/importation';
import { format } from 'date-fns';

export default function DashboardImportation() {
  const { role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: stats } = useQuery({
    queryKey: ['import-stats'],
    queryFn: async () => {
      // Use the 'importations' view to get standardized data across the board
      const { data: dossiers } = await (supabase as any).from('importations').select('*').order('created_at', { ascending: false });
      const { count: navires } = await (supabase as any).from('import_navires').select('*', { count: 'exact', head: true });
      
      const active = dossiers?.filter((d: any) => d.statut !== 'termine' && d.statut !== 'cloture').length || 0;
      const transit = dossiers?.filter((d: any) => d.statut === 'en_transit' || d.statut === 'transit').length || 0;
      const totalVolume = dossiers?.reduce((acc: number, d: any) => acc + Number(d.quantite_tonnes || 0), 0) || 0;

      return { active, transit, totalVolume, navires, dossiers };
    }
  });

  const handleTransmitToLegal = async (dossierId: string) => {
    try {
      toast({ title: "Transmission Juridique", description: "Dossier en cours d'envoi pour examen conformité..." });
      
      const { error } = await (supabase as any)
        .from('import_dossiers')
        .update({ statut: 'attente_juridique' })
        .eq('id', dossierId);

      if (error) throw error;

      toast({ title: "Dossier Transmis", description: "La Direction Juridique a été notifiée." });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
    } catch (error: any) {
       toast({ variant: "destructive", title: "Erreur", description: error.message || "Échec de la transmission." });
    }
  };

  const handleValidateDossier = async (dossierId: string) => {
    try {
      toast({ title: "Validation", description: "Validation du dossier en cours..." });
      
      const { error } = await (supabase as any)
        .from('import_dossiers')
        .update({ statut: 'attente_paiement' })
        .eq('id', dossierId);

      if (error) throw error;

      toast({ title: "Dossier Validé", description: "Le dossier a été validé avec succès." });
      queryClient.invalidateQueries({ queryKey: ['import-stats'] });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Échec de la validation." });
    }
  };

  return (
    <DashboardLayout 
      title="Direction Importation & Approvisionnement" 
      subtitle="Suivi des cargaisons, gestion des navires et planification des approvisionnements nationaux."
    >
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Dossiers Actifs" 
            value={stats?.active || 0} 
            icon={FolderOpen} 
            trend="+2 cette semaine" 
            color="blue"
          />
          <StatCard 
            title="Navires en Transit" 
            value={stats?.transit || 0} 
            icon={Ship} 
            trend="Arrivée prévue: 3j" 
            color="emerald"
          />
          <StatCard 
            title="Volume Commandé" 
            value={`${((stats?.totalVolume || 0) / 1000).toFixed(1)}k T`} 
            icon={TrendingUp} 
            trend="Respect du plan: 94%" 
            color="amber"
          />
          <StatCard 
            title="Flotte Répertoriée" 
            value={stats?.navires || 0} 
            icon={Anchor} 
            trend="Navires agréés SONAP" 
            color="indigo"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-7">
          {/* Main Workflow Tracking */}
          <Card className="lg:col-span-4 border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Ship className="h-40 w-40 rotate-12" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-400" />
                Suivi des Importations Prioritaires
              </CardTitle>
              <CardDescription className="text-slate-400">Flux en cours vers le Port de Conakry</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {stats?.dossiers && stats.dossiers.length > 0 ? (
                stats.dossiers.map((d: any) => {
                  let progress = 10;
                  if (d.statut === 'en_transport' || d.statut === 'en_transit' || d.statut === 'transit') progress = 65;
                  if (d.statut === 'arrive_conakry' || d.statut === 'arrive' || d.statut === 'au_port') progress = 95;
                  if (d.statut === 'receptionne') progress = 100;
                  
                  return (
                    <ImportItem 
                      key={d.id}
                      name={d.numero_dossier || `Dossier #${d.id.slice(0,8)}`} 
                      vessel={d.navire_nom || "Navire en attente"} 
                      product={d.carburant || "Produit mixte"} 
                      progress={progress} 
                      status={d.statut}
                      date={`ETA: ${d.date_arrivee_est ? format(new Date(d.date_arrivee_est), 'dd MMM') : 'À définir'}`}
                      showTransmit={d.statut === 'en_preparation' && role === 'agent_suivi_cargaison'}
                      onTransmit={() => handleTransmitToLegal(d.id)}
                    />
                  );
                })
              ) : (
                <>
                  <ImportItem 
                    name="Dossier #IMP-2026-001" 
                    vessel="MT Atlantic Star" 
                    product="Essence sans plomb" 
                    progress={75} 
                    status="en_transit"
                    date="ETA: 18 Mars"
                  />
                  <ImportItem 
                    name="Dossier #IMP-2026-009" 
                    vessel="Petro Navigator" 
                    product="Gasoil (Diesel)" 
                    progress={10} 
                    status="brouillon"
                    date="En préparation"
                    showTransmit={role === 'agent_suivi_cargaison'}
                    onTransmit={() => handleTransmitToLegal('9')}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Partners */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Actions & Réglementation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {role === 'agent_suivi_cargaison' || role === 'super_admin' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <QuickActionButton 
                      icon={Plus} 
                      label="Nouveau Dossier" 
                      color="bg-primary/10 text-primary" 
                      onClick={() => navigate('/importations/dossiers')}
                    />
                    <QuickActionButton 
                      icon={Anchor} 
                      label="Enregistrer Navire" 
                      color="bg-emerald-50 text-emerald-600" 
                      onClick={() => navigate('/importations/navires')}
                    />
                    <QuickActionButton 
                      icon={Package} 
                      label="Produits" 
                      color="bg-blue-50 text-blue-600" 
                      onClick={() => navigate('/importations/produits')}
                    />
                    <QuickActionButton 
                      icon={ArrowUpRight} 
                      label="Fournisseurs" 
                      color="bg-indigo-50 text-indigo-600" 
                      onClick={() => navigate('/importations/fournisseurs')}
                    />
                  </div>
                ) : role === 'directeur_importation' ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Espace Validation</p>
                      <h4 className="text-sm font-bold mb-3">Dossiers en attente de visa</h4>
                      <div className="space-y-2">
                        {stats?.dossiers?.filter((d: any) => d.statut === 'attente_juridique').map((d: any) => (
                          <div key={d.id} className="p-2 rounded-lg bg-white/10 flex items-center justify-between">
                            <span className="text-xs font-medium">{d.numero_dossier || `Dossier #${d.id.slice(0,8)}`}</span>
                            <Button size="sm" variant="secondary" className="h-7 text-[10px] font-black px-3" onClick={() => handleValidateDossier(d.id)}>VALIDER</Button>
                          </div>
                        ))}
                        {(!stats?.dossiers || stats.dossiers.filter((d: any) => d.statut === 'attente_juridique').length === 0) && (
                          <p className="text-[10px] opacity-60 italic">Aucun dossier en attente de visa.</p>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" className="w-full justify-start gap-3 h-11 rounded-xl border-slate-200 text-slate-600" onClick={() => navigate('/importations/fournisseurs')}>
                      <ArrowUpRight className="h-4 w-4" />
                      <span className="text-xs font-bold uppercase">Consulter Fournisseurs</span>
                    </Button>
                  </div>
                ) : (
                   <div className="grid grid-cols-2 gap-3">
                    <QuickActionButton 
                      icon={Calendar} 
                      label="Planification" 
                      color="bg-amber-50 text-amber-600" 
                      onClick={() => navigate('/importations/dossiers')}
                    />
                    <QuickActionButton 
                      icon={Search} 
                      label="Historique" 
                      color="bg-slate-100 text-slate-600" 
                      onClick={() => navigate('/rapports')}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Alertes Supply-Chain</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 items-start p-3 rounded-xl bg-red-50 text-red-700">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold">Retard Déchargement</p>
                    <p className="text-xs opacity-80">Le navire MT Sahara est bloqué au port (Congestion).</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start p-3 rounded-xl bg-amber-50 text-amber-700">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold">Certificat Qualité Manquant</p>
                    <p className="text-xs opacity-80">Dossier #IMP-004 : Validation en attente.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon: Icon, trend, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <Card className="border-none shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={cn("p-3 rounded-2xl transition-transform duration-300 group-hover:scale-110", colors[color])}>
            <Icon className="h-6 w-6" />
          </div>
          <Badge variant="secondary" className="bg-slate-100 text-[10px] font-bold uppercase">{trend}</Badge>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight mt-1">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

function ImportItem({ name, vessel, product, progress, status, date, showTransmit, onTransmit }: any) {
  const getStatusBadge = (s: string) => {
    const configs: any = {
      en_preparation: "bg-slate-500/20 text-slate-400",
      attente_juridique: "bg-purple-500/20 text-purple-400",
      attente_paiement: "bg-amber-500/20 text-amber-400",
      en_transport: "bg-blue-500/20 text-blue-400",
      arrive: "bg-emerald-500/20 text-emerald-400",
      receptionne: "bg-indigo-500/20 text-indigo-400",
      rejete: "bg-red-500/20 text-red-400",
    };
    return <Badge className={cn("border-none", configs[s] || "bg-emerald-500/20 text-emerald-300")}>{s.replace('_', ' ').toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-bold text-emerald-400">{vessel}</p>
          <p className="text-xs text-slate-300 font-medium">{product} — {name}</p>
        </div>
        <div className="flex items-center gap-3">
          {showTransmit && (
            <Button size="sm" className="h-7 text-[9px] font-black bg-emerald-600 hover:bg-emerald-700" onClick={onTransmit}>
              TRANSMETTRE DJ/C
            </Button>
          )}
          {getStatusBadge(status)}
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-slate-400">
          <span>Progression du transit</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5 bg-white/10" />
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Clock className="h-3.5 w-3.5" />
        {date}
      </div>
    </div>
  );
}

function QuickActionButton({ icon: Icon, label, color, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn("flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all hover:scale-105 active:scale-95", color)}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-bold uppercase tracking-tight text-center">{label}</span>
    </button>
  );
}
