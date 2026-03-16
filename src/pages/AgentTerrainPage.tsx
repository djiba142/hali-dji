import { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardList, Search, Plus, MapPin, Clock, 
  CheckCircle2, RefreshCw, Fuel, Camera, AlertCircle,
  TrendingDown, Info, ShieldCheck, ChevronRight
} from 'lucide-react';
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { REGIONS, PREFECTURES_BY_REGION } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface InspectionMission {
    station_id: string;
    station_nom: string;
    ville: string;
    region: string;
    distance?: string;
    last_inspection?: string;
    status: 'pending' | 'completed' | 'urgent';
    stock_declared_essence: number;
    stock_declared_gasoil: number;
}

export default function AgentTerrainPage() {
  const { user, profile, role, canAddObservation } = useAuth();
  const { toast } = useToast();
  
  const [stations, setStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSegment, setActiveSegment] = useState<'missions' | 'history'>('missions');
  
  // Inspection Form State
  const [selectedStation, setSelectedStation] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    stock_essence_reel: '',
    stock_gasoil_reel: '',
    observation_type: 'conformite',
    description: '',
    conforme: true,
    prefecture: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch stations for the agent's region/zone
      let query = supabase.from('stations').select('*');
      
      if (profile?.region) {
          query = query.eq('region', profile.region);
      }

      const { data } = await query;
      setStations(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [profile?.region]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStartInspection = (station: any) => {
    setSelectedStation(station);
    setFormData({
        stock_essence_reel: '',
        stock_gasoil_reel: '',
        observation_type: 'conformite',
        description: '',
        conforme: true,
        prefecture: station.ville || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!formData.stock_essence_reel || !formData.stock_gasoil_reel || !formData.description.trim()) {
      toast({
        variant: "destructive",
        title: "Champs manquants",
        description: "Veuillez remplir les stocks réels et la description."
      });
      return;
    }

    setSubmitting(true);
    try {
      const stockEssence = parseFloat(formData.stock_essence_reel);
      const stockGasoil = parseFloat(formData.stock_gasoil_reel);
      const ecartEssence = stockEssence - (selectedStation.stock_essence || 0);
      const ecartGasoil = stockGasoil - (selectedStation.stock_gasoil || 0);

      const { error } = await supabase.from('observations' as any).insert({
        station_id: selectedStation.id,
        station_nom: selectedStation.nom,
        inspecteur_id: user?.id,
        type: formData.observation_type,
        description: formData.description,
        date: new Date().toISOString(),
        statut: 'ouverte',
        region: selectedStation.region,
        stock_essence_reel: stockEssence,
        stock_gasoil_reel: stockGasoil,
        ecart_essence: ecartEssence,
        ecart_gasoil: ecartGasoil,
        prefecture: formData.prefecture || selectedStation.ville
      } as any);

      if (error) throw error;

      toast({
        title: "Inspection envoyée !",
        description: `Le rapport pour ${selectedStation.nom} a été transmis au dashboard supervision.`
      });

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStations = stations.filter(s => 
    s.nom.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.ville.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout 
      title="Espace Agent de Terrain" 
      subtitle="Collecte des données et inspections en temps réel"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <Badge className="mb-3 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Opérationnel Terrain</Badge>
                    <h2 className="text-2xl font-black tracking-tight mb-1">Bonjour, {profile?.full_name}</h2>
                    <p className="text-slate-400 text-sm max-w-md">
                        Votre mission aujourd'hui : Contrôle des stocks et conformité dans la zone <span className="text-white font-bold">{profile?.region || 'Guinée'}</span>.
                    </p>
                </div>
                <div className="hidden sm:block h-20 w-20 bg-white/5 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
                    <ShieldCheck className="h-10 w-10 text-emerald-500" />
                </div>
            </div>
            
            {/* Background pattern */}
            <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12">
                <ClipboardList className="h-40 w-40" />
            </div>
        </div>

        {/* Action Tabs Mobile Style */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
            <button 
                onClick={() => setActiveSegment('missions')}
                className={cn(
                    "py-3 rounded-xl text-sm font-bold transition-all",
                    activeSegment === 'missions' ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"
                )}
            >
                Stations à Visiter
            </button>
            <button 
                onClick={() => setActiveSegment('history')}
                className={cn(
                    "py-3 rounded-xl text-sm font-bold transition-all",
                    activeSegment === 'history' ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"
                )}
            >
                Mes Rapports
            </button>
        </div>

        {activeSegment === 'missions' && (
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Rechercher une station à proximité..." 
                        className="pl-12 h-14 rounded-2xl border-slate-200 bg-white focus:ring-2 focus:ring-primary/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {loading ? (
                        <div className="py-20 text-center">
                            <RefreshCw className="h-10 w-10 animate-spin mx-auto text-primary/20 mb-4" />
                            <p className="text-slate-400 font-medium">Chargement des stations...</p>
                        </div>
                    ) : filteredStations.length === 0 ? (
                        <Card className="border-dashed border-2 p-10 text-center text-slate-400">
                            <p>Aucune station trouvée dans votre zone.</p>
                        </Card>
                    ) : (
                        filteredStations.map((station) => (
                            <Card key={station.id} className="group hover:shadow-lg transition-all duration-300 border-slate-200 overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex items-stretch">
                                        <div className={cn(
                                            "w-2",
                                            (station.stock_essence + station.stock_gasoil) < 5000 ? "bg-red-500" : "bg-emerald-500"
                                        )} />
                                        <div className="p-5 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-lg text-slate-800">{station.nom}</h3>
                                                    {(station.stock_essence + station.stock_gasoil) < 5000 && <Badge variant="destructive" className="animate-pulse">URGENT</Badge>}
                                                </div>
                                                <p className="text-slate-500 text-sm flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {station.ville}, {station.region}
                                                </p>
                                                <div className="mt-3 flex items-center gap-4">
                                                    <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Essence Déclaré</p>
                                                        <p className="text-xs font-black text-slate-700">{station.stock_essence?.toLocaleString()} L</p>
                                                    </div>
                                                    <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Gasoil Déclaré</p>
                                                        <p className="text-xs font-black text-slate-700">{station.stock_gasoil?.toLocaleString()} L</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button 
                                                onClick={() => handleStartInspection(station)}
                                                className="rounded-2xl h-14 px-8 bg-slate-900 hover:bg-black group-hover:scale-105 transition-all"
                                            >
                                                Inspecter
                                                <ChevronRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        )}

        {activeSegment === 'history' && (
            <div className="py-20 text-center">
                <ClipboardList className="h-16 w-16 mx-auto text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">Historique des Rapports</h3>
                <p className="text-slate-500">Bientôt disponible dans cette vue mobile.</p>
                <Button variant="outline" className="mt-4 rounded-xl" onClick={() => window.location.href = '/inspections'}>
                    Voir sur la version desktop
                </Button>
            </div>
        )}

        {/* Inspection Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-3xl">
                <div className="bg-slate-900 p-6 text-white">
                    <DialogTitle className="text-2xl font-black">Rapport Terrain</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Saisie des stocks réels pour {selectedStation?.nom}
                    </DialogDescription>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Essence Réel (L)</Label>
                            <Input 
                                type="number" 
                                placeholder="ex: 12000" 
                                className="h-12 text-lg font-bold"
                                value={formData.stock_essence_reel}
                                onChange={(e) => setFormData({...formData, stock_essence_reel: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Gasoil Réel (L)</Label>
                            <Input 
                                type="number" 
                                placeholder="ex: 8500" 
                                className="h-12 text-lg font-bold"
                                value={formData.stock_gasoil_reel}
                                onChange={(e) => setFormData({...formData, stock_gasoil_reel: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-slate-500">Préfecture de Contrôle</Label>
                        <Select 
                            value={formData.prefecture} 
                            onValueChange={(v) => setFormData({...formData, prefecture: v})}
                        >
                            <SelectTrigger className="h-12 font-medium">
                                <SelectValue placeholder="Sélectionnez la préfecture" />
                            </SelectTrigger>
                            <SelectContent>
                                {selectedStation?.region && PREFECTURES_BY_REGION[selectedStation.region] ? (
                                    PREFECTURES_BY_REGION[selectedStation.region].map(pref => (
                                        <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value={selectedStation?.ville || "N/A"}>{selectedStation?.ville || "N/A"}</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-slate-500">Type de Contrôle</Label>
                        <Select value={formData.observation_type} onValueChange={(v) => setFormData({...formData, observation_type: v})}>
                            <SelectTrigger className="h-12 font-medium">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="conformite">Contrôle Régulier</SelectItem>
                                <SelectItem value="stock_verif">Vérification de Stock</SelectItem>
                                <SelectItem value="prix_officiel">Contrôle des Prix</SelectItem>
                                <SelectItem value="fraude">Suspicion d'Anomalie</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-slate-500">Observations Terrain</Label>
                        <Textarea 
                            placeholder="Détails de l'inspection, anomalies constatées, photos prises..."
                            className="h-32 rounded-2xl"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Station Conforme</p>
                                <p className="text-[10px] text-slate-400 uppercase">Aux normes SIHG</p>
                            </div>
                        </div>
                        <input 
                            type="checkbox" 
                            checked={formData.conforme} 
                            onChange={(e) => setFormData({...formData, conforme: e.target.checked})}
                            className="h-6 w-6 rounded-lg text-primary focus:ring-primary"
                        />
                    </div>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <p className="text-xs text-amber-700 leading-relaxed font-medium">
                            En validant ce rapport, vous certifiez l'exactitude des données relevées sur place. Ces données seront comparées automatiquement aux stocks déclarés par la station.
                        </p>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-slate-50 border-t flex flex-col gap-2 sm:flex-row">
                    <Button variant="ghost" className="rounded-2xl flex-1 h-12" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                    <Button 
                        disabled={submitting}
                        onClick={handleSubmitReport}
                        className="rounded-2xl flex-1 bg-primary hover:bg-primary/90 h-12 font-bold shadow-lg shadow-primary/20"
                    >
                        {submitting ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <>Envoyer le Rapport</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
