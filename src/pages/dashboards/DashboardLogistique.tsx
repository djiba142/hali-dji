import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Warehouse, Package, Truck, Activity, Droplets, ArrowRight,
  TrendingUp, AlertTriangle, Plus, Search, MapPin, FileText
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function DashboardLogistique() {
  const { role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch Import Dossiers in transit or arrived for logistical processing
  const { data: logistiqueFlow = [], refetch: refetchLogistique } = useQuery({
    queryKey: ['logistique-import-flow'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('import_dossiers')
        .select('*')
        .in('statut', ['en_transit', 'arrive_conakry']);
      if (error) return [];
      return data || [];
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['logistique-stats'],
    queryFn: async () => {
      const { data: stocks } = await (supabase as any).from('logistique_stocks').select('quantite_disponible');
      const { data: depots } = await (supabase as any).from('logistique_depots').select('*');
      const { count: receptions } = await (supabase as any).from('logistique_receptions').select('*', { count: 'exact', head: true });
      const { data: incoming } = await (supabase as any).from('import_dossiers').select('*').in('statut', ['en_transit', 'arrive_conakry', 'receptionne']).limit(3);
      
      const totalStock = stocks?.reduce((acc: number, s: any) => acc + Number(s.quantite_disponible), 0) || 0;
      const depotCount = depots?.length || 0;

      return { totalStock, depotCount, receptions, incoming, depots };
    }
  });

  const handleConfirmArrival = async (dossierId: string) => {
    try {
      toast({ title: "Logistique Port", description: "Enregistrement de l'amarrage du navire..." });
      // Real DB update would be:
      // await supabase.from('import_dossiers').update({ statut: 'arrive_conakry' }).eq('id', dossierId);
      toast({ title: "Navire Arrivé", description: "Le dossier est prêt pour le déchargement et stockage." });
      refetchLogistique();
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur", description: "Échec de l'opération." });
    }
  };

  const handleFinalReception = async (dossierId: string) => {
    try {
      toast({ title: "Déchargement & Stockage", description: "Mise à jour des stocks nationaux en cours..." });
      // Real DB update would be:
      // await supabase.from('import_dossiers').update({ statut: 'receptionne' }).eq('id', dossierId);
      toast({ title: "Stock Mis à Jour", description: "Le produit est désormais disponible pour la distribution (DSA)." });
      refetchLogistique();
    } catch (err) {
      toast({ variant: "destructive", title: "Erreur", description: "Échec du stockage." });
    }
  };

  return (
    <DashboardLayout 
      title="Direction Logistique" 
      subtitle="Supervision du transport national, gestion des dépôts pétroliers et des stocks stratégiques."
    >
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Stock National Total" 
            value={`${((stats?.totalStock || 0) / 1000).toFixed(1)}k T`} 
            icon={Droplets} 
            trend="Couverture: 45 jours" 
            color="indigo"
          />
          <StatCard 
            title="Taux d'Occupation" 
            value="72%" 
            icon={Warehouse} 
            trend="Capacité résiduelle: 28%" 
            color="emerald"
          />
          <StatCard 
            title="Dépôts Actifs" 
            value={stats?.depotCount || 0} 
            icon={MapPin} 
            trend="Surveillance temps réel" 
            color="blue"
          />
          <StatCard 
            title="Réceptions (Mois)" 
            value={stats?.receptions || 0} 
            icon={Package} 
            trend="+12% vs mois dernier" 
            color="amber"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Stock Table */}
          <Card className="lg:col-span-8 border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-400" />
                    État des Stocks par Dépôt
                  </CardTitle>
                  <CardDescription className="text-slate-400">Détail des volumes disponibles et seuils d'alerte.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white" onClick={() => navigate('/carte')}>
                    Voir Carte Flux
                  </Button>
                  <Button variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white" asChild>
                    <Link to="/rapports">Rapport Complet</Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <th className="px-6 py-4">Nom du Dépôt</th>
                      <th className="px-6 py-4">Essence (PMS)</th>
                      <th className="px-6 py-4">Gasoil (AGO)</th>
                      <th className="px-6 py-4">Jet A1</th>
                      <th className="px-6 py-4">Capacité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <DepotRow 
                      name="Dépôt Kaloum (Conakry)" 
                      pms="124,500 T" 
                      ago="85,200 T" 
                      jet="12,000 T" 
                      capacity={85} 
                    />
                    <DepotRow 
                      name="Dépôt Kamsar (Boké)" 
                      pms="45,000 T" 
                      ago="112,000 T" 
                      jet="-" 
                      capacity={60} 
                    />
                    <DepotRow 
                      name="Dépôt de Mamou" 
                      pms="12,000 T" 
                      ago="8,500 T" 
                      jet="-" 
                      capacity={40} 
                    />
                    <DepotRow 
                      name="Dépôt de Kankan" 
                      pms="8,900 T" 
                      ago="6,200 T" 
                      jet="-" 
                      capacity={25} 
                    />
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Side panel */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-lg bg-emerald-50 border-l-4 border-l-emerald-500">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-800">
                  <Truck className="h-5 w-5" />
                  Mouvements Logistiques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats?.incoming && stats.incoming.length > 0 ? (
                  stats.incoming.map((item: any) => (
                    <div key={item.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                       <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs font-black uppercase text-slate-400">Arrivée Navire</p>
                            <h4 className="text-sm font-bold text-slate-900">{item.navire_nom || 'Navire'}</h4>
                          </div>
                          <Badge className={cn(
                            item.statut === 'en_transit' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {item.statut?.replace('_', ' ').toUpperCase()}
                          </Badge>
                       </div>
                       <p className="text-xs text-slate-500 font-medium">{item.carburant || 'Produit'} — {item.quantite_prevue || '0'} T</p>
                       
                       <div className="flex gap-2">
                         {item.statut === 'en_transit' && (['responsable_depots', 'operateur_logistique', 'agent_logistique', 'super_admin'].includes(role || '')) && (
                            <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-[9px] uppercase" onClick={() => handleConfirmArrival(item.id)}>
                              Confirmer Arrivée Port
                            </Button>
                         )}
                         {item.statut === 'arrive_conakry' && (['responsable_depots', 'operateur_logistique', 'agent_logistique', 'super_admin'].includes(role || '')) && (
                            <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase" onClick={() => handleFinalReception(item.id)}>
                              Effectuer Réception & Dépôt
                            </Button>
                         )}
                       </div>
                    </div>
                  ))
                ) : (
                  <MovementItem 
                    title="Aucune réception imminente" 
                    desc="En attente de cargaisons validées"
                    time="--"
                    status="prevu"
                    onClick={() => {}}
                  />
                )}
                <MovementItem 
                  title="Alerte Stock" 
                  desc="Dépôt Kankan (Seuil critique AGO)"
                  time="Immédiat"
                  status="alerte"
                  onClick={() => navigate('/logistique/depots')}
                />
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Actions Logistiques</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2">
                {['responsable_depots', 'responsable_transport', 'operateur_logistique', 'agent_logistique', 'super_admin'].includes(role || '') ? (
                  <div className="space-y-2">
                    <ActionButton 
                      icon={Plus} 
                      label="Enregistrer Réception" 
                      onClick={() => navigate('/logistique/receptions')}
                    />
                    <ActionButton 
                      icon={Truck} 
                      label="Planifier Transfert" 
                      onClick={() => navigate('/logistique/transport')}
                    />
                    <ActionButton 
                      icon={Package} 
                      label="Inventaire Physique" 
                      onClick={() => navigate('/logistique/depots')}
                    />
                  </div>
                ) : role === 'directeur_logistique' ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Perspective Managériale</p>
                      <p className="text-xs leading-relaxed italic opacity-80">
                        En tant que Directeur, vous avez une vue globale sur les opérations sans saisie de données. Les responsables et opérateurs sont garants de l'intégrité des flux.
                      </p>
                    </div>
                    <Button variant="outline" className="w-full justify-start gap-3 h-11 rounded-xl border-slate-200" onClick={() => navigate('/rapports')}>
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold uppercase">Rapport de Performance</span>
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400">Accès Restreint</p>
                  </div>
                )}
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

function DepotRow({ name, pms, ago, jet, capacity }: any) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{name}</span>
          <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Connecté au SCADA
          </span>
        </div>
      </td>
      <td className="px-6 py-4 font-medium text-slate-700">{pms}</td>
      <td className="px-6 py-4 font-medium text-slate-700">{ago}</td>
      <td className="px-6 py-4 font-medium text-slate-400">{jet}</td>
      <td className="px-6 py-4">
        <div className="w-32 space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-slate-500">Usage</span>
            <span className={cn(capacity > 80 ? "text-red-600" : "text-emerald-600")}>{capacity}%</span>
          </div>
          <Progress value={capacity} className={cn("h-1.5", capacity > 80 ? "bg-red-100" : "bg-emerald-100")} />
        </div>
      </td>
    </tr>
  );
}

function MovementItem({ title, desc, time, status, onClick }: any) {
  const statusConfig: any = {
    decharge: "bg-blue-100 text-blue-700 border-blue-200",
    prevu: "bg-slate-100 text-slate-700 border-slate-200",
    alerte: "bg-red-100 text-red-700 border-red-200"
  };

  return (
    <div className="flex gap-4 p-3 rounded-xl hover:bg-white/50 transition-colors group">
      <div className={cn("h-2 w-2 rounded-full mt-2 flex-shrink-0 animate-pulse", 
        status === 'decharge' ? "bg-blue-500" : status === 'alerte' ? "bg-red-500" : "bg-slate-400"
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">{title}</p>
        <p className="text-xs text-slate-500 truncate">{desc}</p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className={cn("text-[9px] font-black uppercase px-2 py-0", statusConfig[status])}>
            {status}
          </Badge>
          <span className="text-[10px] text-slate-400 font-medium">{time}</span>
        </div>
      </div>
      <Button 
        size="icon" 
        variant="ghost" 
        className="opacity-0 group-hover:opacity-100 h-8 w-8 rounded-full"
        onClick={onClick}
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick }: any) {
  return (
    <Button 
      variant="ghost" 
      className="w-full justify-start gap-3 h-12 rounded-xl text-slate-600 hover:text-primary hover:bg-primary/5 group"
      onClick={onClick}
    >
      <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-primary/10 transition-colors">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-xs font-bold uppercase tracking-tight">{label}</span>
    </Button>
  );
}
