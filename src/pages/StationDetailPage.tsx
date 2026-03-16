import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Mail, User, Fuel, Clock,
  Building2, Gauge, AlertTriangle, TrendingUp, Truck,
  Calendar, Loader2, CheckCircle2
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockIndicator, StockBadge } from '@/components/dashboard/StockIndicator';
import { StockEvolutionChart } from '@/components/charts/StockEvolutionChart';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Import logos
import logoTotal from '@/assets/logos/total-energies.png';
import logoShell from '@/assets/logos/shell.jpg';
import logoTMI from '@/assets/logos/tmi.jpg';
import logoKP from '@/assets/logos/kamsar-petroleum.png';

const localLogoMapping: Record<string, string> = {
  TOTAL: logoTotal,
  TotalEnergies: logoTotal,
  TO: logoTotal,
  SHELL: logoShell,
  VIVO: logoShell,
  SH: logoShell,
  TMI: logoTMI,
  TM: logoTMI,
  KP: logoKP,
  'Kamsar Petroleum': logoKP,
  'KAMSAR PETROLEUM': logoKP,
};

// ─── Constants ───
const typeLabels: Record<string, string> = {
  urbaine: 'Urbaine',
  routiere: 'Routière',
  depot: 'Dépôt',
  industrielle: 'Industrielle'
};

const statusStyles: Record<string, string> = {
  ouverte: 'bg-emerald-100 text-emerald-700',
  fermee: 'bg-red-100 text-red-700',
  en_travaux: 'bg-amber-100 text-amber-700',
  attente_validation: 'bg-blue-100 text-blue-700',
};

const statusLabels: Record<string, string> = {
  ouverte: 'Ouverte',
  fermee: 'Fermée',
  en_travaux: 'En travaux',
  attente_validation: 'En attente de validation',
};

// Prix officiels (constants réglementaires)
const prixOfficiels = { essence: 12000, gasoil: 11000, gpl: 8000 };

function calculatePercentage(current: number, capacity: number): number {
  return capacity > 0 ? Math.round((current / capacity) * 100) : 0;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-GN').format(num);
}

const getLogoForEntreprise = (sigle: string, nom: string): string | null => {
  if (sigle && localLogoMapping[sigle]) return localLogoMapping[sigle];
  if (nom && localLogoMapping[nom]) return localLogoMapping[nom];
  return null;
};

export default function StationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { role: currentUserRole, canManageStations, canModifyData } = useAuth();
  const isReadOnly = currentUserRole === 'super_admin';
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [station, setStation] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [livraisons, setLivraisons] = useState<any[]>([]);
  const [ventes, setVentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [recordingSale, setRecordingSale] = useState(false);
  const [saleForm, setSaleForm] = useState({
    carburant: 'essence',
    quantite: '',
    prix_unitaire: 12000,
  });

  useEffect(() => {
    if (!id) return;
    fetchAll();
    fetchVentes();
  }, [id]);

  const fetchVentes = async () => {
    const { data } = await (supabase as any)
      .from('ventes')
      .select('*')
      .eq('station_id', id)
      .order('created_at', { ascending: false })
      .limit(20);
    setVentes(data || []);
  };

  const handleRecordSale = async () => {
    if (!saleForm.quantite || Number(saleForm.quantite) <= 0) return;
    setRecordingSale(true);
    try {
      const q = Number(saleForm.quantite);
      const p = Number(saleForm.prix_unitaire);
      const { error } = await (supabase as any).from('ventes').insert([{
        station_id: id,
        entreprise_id: station?.entreprise_id,
        carburant: saleForm.carburant,
        quantite_litres: q,
        prix_unitaire: p,
        prix_total: q * p
      }]);
      if (error) throw error;
      toast({ title: "Vente enregistrée", description: `${q}L de ${saleForm.carburant} enregistrés.` });
      setIsSaleDialogOpen(false);
      fetchAll();
      fetchVentes();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erreur", description: err.message });
    } finally {
      setRecordingSale(false);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: stData, error: stErr } = await supabase
        .from('stations')
        .select(`
          *,
          entreprise:entreprises!entreprise_id(id, nom, sigle, logo_url)
        `)
        .eq('id', id!)
        .maybeSingle();

      if (stErr) throw stErr;
      if (!stData) {
        setError("Station non trouvée");
        return;
      }
      setStation(stData);

      const { data: alertData } = await supabase
        .from('alertes')
        .select('*')
        .eq('station_id', id!)
        .eq('resolu', false)
        .order('created_at', { ascending: false });
      setAlerts(alertData || []);

      const { data: livData } = await supabase
        .from('livraisons')
        .select('*')
        .eq('station_id', id!)
        .order('created_at', { ascending: false })
        .limit(10);
      setLivraisons(livData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <DashboardLayout title="Chargement..."><div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin" /></div></DashboardLayout>;
  if (error || !station) return <DashboardLayout title="Erreur"><div className="text-center py-20 px-4"><AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" /><p>{error}</p><Button asChild className="mt-4"><Link to="/stations">Retour</Link></Button></div></DashboardLayout>;

  const entrepriseLogo = station.entreprise?.logo_url || getLogoForEntreprise(station.entreprise?.sigle || '', station.entreprise?.nom || '');

  return (
    <DashboardLayout title={station.nom} subtitle={`${station.code} - ${station.ville}`}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild><Link to="/stations"><ArrowLeft className="h-5 w-5" /></Link></Button>
            <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0 border border-border overflow-hidden shadow-sm">
              {entrepriseLogo ? <img src={entrepriseLogo} alt="Logo" className="h-10 w-10 object-contain" /> : <Fuel className="h-6 w-6 text-primary" />}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{station.nom}</h1>
                <Badge className={cn("text-xs font-semibold", statusStyles[station.statut])}>{statusLabels[station.statut] || station.statut}</Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> {station.adresse}, {station.ville}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {canManageStations && (
              <Button variant="outline" className="gap-2" onClick={() => setIsEditDialogOpen(true)}>
                Modifier Infos
              </Button>
            )}
            {canModifyData && (
              <Button className="gap-2" onClick={() => setIsSaleDialogOpen(true)}>
                <TrendingUp className="h-4 w-4" /> Vente direct
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="stocks">Stocks & Cuves</TabsTrigger>
            <TabsTrigger value="ventes">Ventes</TabsTrigger>
            <TabsTrigger value="livraisons">Livraisons</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {[
                 { label: 'Essence', val: station.stock_essence, color: 'bg-primary/5', iconColor: 'text-primary' },
                 { label: 'Gasoil', val: station.stock_gasoil, color: 'bg-amber-500/5', iconColor: 'text-amber-600' },
                 { label: 'Ventes Jour', val: ventes.filter(v => new Date(v.date_vente).toDateString() === new Date().toDateString()).reduce((acc, v) => acc + v.quantite_litres, 0), color: 'bg-emerald-500/5', iconColor: 'text-emerald-600' },
                 { label: 'Alertes', val: alerts.length, color: 'bg-red-500/5', iconColor: 'text-red-600' },
               ].map((c, i) => (
                 <Card key={i} className={cn(c.color, "border-transparent shadow-none")}>
                   <CardContent className="p-4 flex items-center gap-4">
                     <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center bg-white border border-border shadow-sm", c.iconColor)}><Fuel className="h-5 w-5" /></div>
                     <div><p className="text-xs font-medium text-muted-foreground">{c.label}</p><p className="text-xl font-bold">{formatNumber(c.val)} {i < 3 ? 'L' : ''}</p></div>
                   </CardContent>
                 </Card>
               ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 space-y-6">
                  <StockEvolutionChart stationId={id} title="Évolution des stocks" />
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Infrastructure & Contact</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {[
                         { label: 'Pompes', val: station.nombre_pompes },
                         { label: 'Cuves', val: station.nombre_cuves || '2' },
                         { label: 'Type', val: typeLabels[station.type] || station.type },
                         { label: 'Gérant', val: station.gestionnaire_nom || 'Non assigné' },
                       ].map((x, i) => (
                         <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-100"><p className="text-[10px] uppercase font-bold text-slate-400">{x.label}</p><p className="font-bold truncate">{x.val}</p></div>
                       ))}
                    </CardContent>
                  </Card>
               </div>
               <div className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Prix réglementés</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                       {['essence', 'gasoil', 'gpl'].map(f => (
                         <div key={f} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="font-semibold capitalize">{f}</span>
                            <span className="font-black text-primary">{formatNumber(prixOfficiels[f as keyof typeof prixOfficiels])} GNF</span>
                         </div>
                       ))}
                    </CardContent>
                  </Card>
                  {alerts.length > 0 && (
                    <Card className="border-red-200 bg-red-50">
                       <CardContent className="p-4"><p className="text-red-700 font-bold mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Alertes actives</p>
                       <ul className="space-y-1">{alerts.map(a => <li key={a.id} className="text-xs text-red-600 truncate">• {a.message}</li>)}</ul>
                       </CardContent>
                    </Card>
                  )}
               </div>
            </div>
          </TabsContent>

          <TabsContent value="stocks" className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {[
               { label: 'Essence', cur: station.stock_essence, cap: station.capacite_essence },
               { label: 'Gasoil', cur: station.stock_gasoil, cap: station.capacite_gasoil },
               { label: 'GPL', cur: station.stock_gpl, cap: station.capacite_gpl },
               { label: 'Lubrifiants', cur: station.stock_lubrifiants, cap: station.capacite_lubrifiants },
             ].map(f => (
               <Card key={f.label}>
                 <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase">{f.label}</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                   <StockIndicator percentage={calculatePercentage(f.cur, f.cap)} label="" size="lg" />
                   <div className="flex justify-between text-sm font-medium"><span>Actuel: {formatNumber(f.cur)} L</span><span>Capacité: {formatNumber(f.cap)} L</span></div>
                 </CardContent>
               </Card>
             ))}
          </TabsContent>

          <TabsContent value="ventes" className="space-y-4">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Historique</CardTitle>
                  {canModifyData && <Button size="sm" onClick={() => setIsSaleDialogOpen(true)}>Nouvelle vente</Button>}
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                   <table className="w-full text-sm">
                      <thead><tr className="bg-slate-50 text-left"><th className="p-4">Date</th><th className="p-4">Produit</th><th className="p-4 text-right">Quantité</th><th className="p-4 text-right">Montant</th></tr></thead>
                      <tbody className="divide-y">{ventes.map(v => (
                        <tr key={v.id}>
                          <td className="p-4 text-slate-500">{new Date(v.created_at).toLocaleString('fr-FR')}</td>
                          <td className="p-4"><Badge variant="outline" className="uppercase">{v.carburant}</Badge></td>
                          <td className="p-4 text-right font-bold">{formatNumber(v.quantite_litres)} L</td>
                          <td className="p-4 text-right font-bold text-primary">{formatNumber(v.prix_total || 0)} GNF</td>
                        </tr>
                      ))}</tbody>
                   </table>
                </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="livraisons">
             <Card>
                <CardHeader><CardTitle>Dernières réceptions</CardTitle></CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                   <table className="w-full text-sm">
                      <thead><tr className="bg-slate-50 text-left"><th className="p-4">Date</th><th className="p-4">Produit</th><th className="p-4 text-right">Quantité</th><th className="p-4">Détails</th></tr></thead>
                      <tbody className="divide-y">{livraisons.map(l => (
                        <tr key={l.id}>
                          <td className="p-4">{new Date(l.created_at).toLocaleDateString('fr-FR')}</td>
                          <td className="p-4 uppercase font-bold">{l.carburant}</td>
                          <td className="p-4 text-right font-bold">{formatNumber(l.quantite)} L</td>
                          <td className="p-4 text-slate-400 italic text-xs truncate">{l.bon_livraison || l.camion_immatriculation || '—'}</td>
                        </tr>
                      ))}</tbody>
                   </table>
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isSaleDialogOpen} onOpenChange={setIsSaleDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Enregistrer une vente</DialogTitle><DialogDescription>Saisie directe pour mise à jour des stocks.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label>Produit</Label>
                <Select value={saleForm.carburant} onValueChange={(v) => setSaleForm({...saleForm, carburant: v, prix_unitaire: v === 'essence' ? 12000 : v === 'gasoil' ? 11000 : 8000})}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent><SelectItem value="essence">Essence</SelectItem><SelectItem value="gasoil">Gasoil</SelectItem><SelectItem value="gpl">GPL</SelectItem></SelectContent>
                </Select>
             </div>
             <div className="space-y-2"><Label>Quantité (L)</Label><Input type="number" value={saleForm.quantite} onChange={(e) => setSaleForm({...saleForm, quantite: e.target.value})} /></div>
             <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex justify-between items-center font-bold"><span>Total:</span><span className="text-primary">{formatNumber(Number(saleForm.quantite || 0) * saleForm.prix_unitaire)} GNF</span></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsSaleDialogOpen(false)}>Annuler</Button><Button onClick={handleRecordSale} disabled={recordingSale}>{recordingSale ? "Envoi..." : "Valider"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}