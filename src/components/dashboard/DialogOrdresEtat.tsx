import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, ArrowRight, ShieldCheck, Truck, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface OrdreLivraison {
    id: string;
    station_id: string;
    station_nom: string;
    carburant: string;
    quantite_demandee: number;
    priorite: string;
    statut: string;
    date_demande: string;
    notes: string;
}

interface DialogOrdresEtatProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entrepriseId?: string;
    onOrderUpdate: () => void;
}

export function DialogOrdresEtat({ open, onOpenChange, entrepriseId, onOrderUpdate }: DialogOrdresEtatProps) {
    const [ordres, setOrdres] = useState<OrdreLivraison[]>([]);
    const [loading, setLoading] = useState(false);
    const [reponseText, setReponseText] = useState<{ [key: string]: string }>({});
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        if (open && entrepriseId) {
            fetchOrdres();
        }
    }, [open, entrepriseId]);

    const fetchOrdres = async () => {
        setLoading(true);
        try {
            // First get all stations for this entreprise
            const { data: stations } = await supabase
                .from('stations')
                .select('id, nom')
                .eq('entreprise_id', entrepriseId as string);
                
            if (!stations || stations.length === 0) {
                setOrdres([]);
                return;
            }
            
            const stationIds = stations.map(s => s.id);
            const stationMap = new Map(stations.map(s => [s.id, s.nom]));

            const { data, error } = await supabase
                .from('ordres_livraison')
                .select('*')
                .in('station_id', stationIds)
                .in('statut', ['approuve', 'vue', 'en_cours'])
                .order('date_demande', { ascending: false });

            if (error) throw error;

            const mappedOrdres = (data || []).map(o => ({
                id: o.id,
                station_id: o.station_id,
                station_nom: stationMap.get(o.station_id) || 'Station inconnue',
                carburant: o.carburant,
                quantite_demandee: o.quantite_demandee,
                priorite: o.priorite,
                statut: o.statut,
                date_demande: o.date_demande,
                notes: o.notes || '',
            }));

            setOrdres(mappedOrdres);

            // Automatically mark 'approuve' orders as 'vue'
            const unviewedIds = (data || [])
                .filter(o => o.statut === 'approuve')
                .map(o => o.id);

            if (unviewedIds.length > 0) {
                await supabase
                    .from('ordres_livraison')
                    .update({ statut: 'vue' })
                    .in('id', unviewedIds);
                
                // Refresh local state status to 'vue'
                setOrdres(prev => prev.map(o => 
                    unviewedIds.includes(o.id) ? { ...o, statut: 'vue' } : o
                ));
            }
        } catch (error) {
            console.error('Error fetching ordres:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptOrder = async (ordre: OrdreLivraison) => {
        if (!user) return;
        const noteReponse = reponseText[ordre.id] || "Pris en charge par l'entreprise.";
        
        setProcessingId(ordre.id);
        try {
            const { error } = await supabase
                .from('ordres_livraison')
                .update({ 
                    statut: 'en_cours',
                    notes: ordre.notes + `\n\n--- Réponse Entreprise ---\n${noteReponse}\nAccepté par: ${user.id} le ${new Date().toLocaleString()}`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', ordre.id);

            if (error) throw error;

            toast({ title: "Ordre pris en charge", description: "L'ordre a été accepté et est en cours de traitement logistique." });
            onOrderUpdate();
            fetchOrdres();
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Erreur", description: error.message || "Erreur lors de la prise en charge." });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-900 uppercase">
                        <ShieldCheck className="h-6 w-6 text-blue-500" />
                        Ordres Officiels de l'État
                    </DialogTitle>
                    <DialogDescription className="font-bold text-slate-500">
                        Instructions de ravitaillement émises par la SONAP. Une réponse immédiate est attendue.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {loading ? (
                        <div className="text-center py-8 text-slate-500 font-bold uppercase text-xs flex flex-col items-center">
                            <Clock className="h-8 w-8 animate-spin mb-2" />
                            Chargement des ordres...
                        </div>
                    ) : ordres.length === 0 ? (
                        <div className="text-center py-12 rounded-2xl border-2 border-dashed border-slate-200">
                            <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-bold text-sm uppercase">Aucun ordre en attente</p>
                            <p className="text-xs text-slate-400 mt-1">Vous êtes à jour dans l'exécution des ordres nationaux.</p>
                        </div>
                    ) : (
                        ordres.map((ordre) => (
                            <div key={ordre.id} className={cn(
                                "p-6 rounded-2xl border transition-all",
                                ordre.statut === 'en_cours' ? "bg-slate-50 border-blue-200/50" : "bg-red-50/30 border-red-100"
                            )}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge className={cn(
                                                "uppercase font-black text-[10px]",
                                                ordre.priorite === 'urgente' ? "bg-red-600" : ordre.priorite === 'haute' ? "bg-orange-500" : "bg-slate-500"
                                            )}>{ordre.priorite}</Badge>
                                            <Badge variant="outline" className={cn(
                                                "uppercase font-black text-[10px]",
                                                ordre.statut === 'en_cours' ? "text-blue-600 border-blue-200" : 
                                                ordre.statut === 'vue' ? "text-emerald-600 border-emerald-200" :
                                                "text-amber-600 border-amber-200"
                                            )}>{
                                                ordre.statut === 'vue' ? 'VUE (RÉPONSE ATTENDUE)' :
                                                ordre.statut === 'en_cours' ? 'EN COURS (LOGISTIQUE)' : 
                                                'À CONSULTER'
                                            }</Badge>
                                        </div>
                                        <h4 className="text-lg font-black text-slate-800 uppercase">{ordre.station_nom}</h4>
                                        <p className="text-xs text-slate-500 font-bold mt-1">
                                            Reçu le : {format(new Date(ordre.date_demande), 'dd MMMM yyyy HH:mm', { locale: fr })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-slate-900 leading-none">
                                            {ordre.quantite_demandee.toLocaleString()} <span className="text-sm">L</span>
                                        </p>
                                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">
                                            {ordre.carburant}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl p-4 border border-slate-100 mb-4">
                                    <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Corps de l'instruction</p>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap font-medium">{ordre.notes}</p>
                                </div>

                                {(ordre.statut === 'approuve' || ordre.statut === 'vue') && (
                                    <div className="space-y-3">
                                        <Textarea
                                            placeholder="Plan d'action et réponse officielle à l'administration..."
                                            className="text-sm font-medium border-slate-200 bg-white"
                                            rows={2}
                                            value={reponseText[ordre.id] || ''}
                                            onChange={(e) => setReponseText({ ...reponseText, [ordre.id]: e.target.value })}
                                        />
                                        <div className="flex justify-end">
                                            <Button 
                                                onClick={() => handleAcceptOrder(ordre)} 
                                                disabled={processingId === ordre.id}
                                                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                            >
                                                {processingId === ordre.id ? <Clock className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                                                Confirmer la Prise en Charge
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
