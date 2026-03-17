import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, Search, Ship, CheckCircle2, Warehouse, ClipboardCheck, Clock } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Reception {
  id: string;
  date_reception: string;
  quantite_recue: number;
  observations: string | null;
  depot: { nom: string } | null;
  cargaison: {
    quantite_reelle: number;
    navire: { nom: string } | null;
    dossier: { numero_dossier: string; produit: { nom: string } | null } | null;
  } | null;
}

interface PendingCargo {
  id: string;
  quantite_reelle: number;
  navire: { nom: string };
  dossier: { numero_dossier: string; produit: { nom: string } };
}

interface DepotRef { id: string; nom: string; }

interface NewReception {
  cargaison_id: FormDataEntryValue | null;
  depot_id: FormDataEntryValue | null;
  quantite_recue: number;
  observations: FormDataEntryValue | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

export default function LogistiqueReceptionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: receptions, isLoading } = useQuery({
    queryKey: ['logistique-receptions'],
    queryFn: async () => {
      const { data, error } = await db.from('logistique_receptions').select(`*, depot:logistique_depots(nom), cargaison:import_cargaisons(quantite_reelle, navire:import_navires(nom), dossier:import_dossiers(numero_dossier, produit:import_produits(nom)))`).order('date_reception', { ascending: false });
      if (error) throw error;
      return (data as Reception[]) || [];
    }
  });

  const { data: pendingCargo } = useQuery({
    queryKey: ['pending-cargo'],
    queryFn: async () => {
      const { data } = await db.from('import_cargaisons').select(`id, quantite_reelle, navire:import_navires(nom), dossier:import_dossiers(numero_dossier, produit:import_produits(nom))`).eq('statut', 'en_transit');
      return (data as PendingCargo[]) || [];
    }
  });

  const { data: depots } = useQuery({
    queryKey: ['logistique-depots-list'],
    queryFn: async () => {
      const { data } = await db.from('logistique_depots').select('id, nom');
      return (data as DepotRef[]) || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newReception: NewReception) => {
      const { error } = await db.from('logistique_receptions').insert(newReception);
      if (error) throw error;
      await db.from('import_cargaisons').update({ statut: 'dechargee' }).eq('id', newReception.cargaison_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logistique-receptions'] });
      queryClient.invalidateQueries({ queryKey: ['logistique-depots'] });
      toast({ title: "Réception confirmée", description: "Le stock a été mis à jour dans le dépôt." });
    }
  });

  return (
    <DashboardLayout title="Réception des Cargaisons" subtitle="Interface de déchargement des navires et enregistrement des entrées en stock.">
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Rechercher une réception..." className="pl-10 h-10 border-none bg-slate-50 rounded-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-10 px-6 rounded-xl gap-2 shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700"><ClipboardCheck className="h-4 w-4" /> Confirmer une Arrivée</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-slate-900 leading-tight">Point de Réception <br/><span className="text-blue-600">Port de Conakry</span></DialogTitle>
              </DialogHeader>
              <form className="space-y-4 pt-4" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createMutation.mutate({ cargaison_id: fd.get('cargaison'), depot_id: fd.get('depot'), quantite_recue: Number(fd.get('quantite')), observations: fd.get('notes') }); }}>
                <div className="space-y-2">
                  <Label>Cargaison attendue (Navire - Produit)</Label>
                  <Select name="cargaison">
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none"><SelectValue placeholder="Choisir une cargaison..." /></SelectTrigger>
                    <SelectContent>
                      {pendingCargo?.map((c: PendingCargo) => (
                        <SelectItem key={c.id} value={c.id}>{c.navire.nom} — {c.dossier.produit.nom} ({c.quantite_reelle} T)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dépôt de Destination</Label>
                  <Select name="depot">
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none"><SelectValue placeholder="Choisir le dépôt..." /></SelectTrigger>
                    <SelectContent>
                      {depots?.map((d: DepotRef) => (
                        <SelectItem key={d.id} value={d.id}>{d.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Quantité Réceptionnée (Tonnes)</Label><Input name="quantite" type="number" placeholder="Volume exact déchargé" required className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Observations / Scellés</Label><Input name="notes" placeholder="Détails techniques optionnels" className="h-12 rounded-xl" /></div>
                <Button type="submit" className="w-full h-12 rounded-xl mt-4 bg-blue-600 hover:bg-blue-700 font-bold" disabled={createMutation.isPending}>Valider l'Entrée en Stock</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none shadow-xl overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-slate-900">Date & Heure</TableHead>
                <TableHead className="font-bold text-slate-900">Navire / Dossier</TableHead>
                <TableHead className="font-bold text-slate-900">Produit</TableHead>
                <TableHead className="font-bold text-slate-900">Volume Reçu</TableHead>
                <TableHead className="font-bold text-slate-900">Dépôt</TableHead>
                <TableHead className="text-right font-bold text-slate-900">Preuve</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10">Chargement des réceptions...</TableCell></TableRow>
              ) : receptions?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400 italic">Aucune réception enregistrée.</TableCell></TableRow>
              ) : receptions?.map((r: Reception) => (
                <TableRow key={r.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900">{new Date(r.date_reception).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(r.date_reception).toLocaleTimeString()}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-bold text-blue-600 flex items-center gap-1.5"><Ship className="h-3.5 w-3.5" /> {r.cargaison?.navire?.nom}</p>
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{r.cargaison?.dossier?.numero_dossier}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50 font-bold">{r.cargaison?.dossier?.produit?.nom}</Badge></TableCell>
                  <TableCell className="font-black text-slate-900">{Number(r.quantite_recue).toLocaleString()} T</TableCell>
                  <TableCell><div className="flex items-center gap-2 text-slate-600 font-medium"><Warehouse className="h-4 w-4 text-emerald-500" /> {r.depot?.nom}</div></TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8 text-primary"><CheckCircle2 className="h-5 w-5" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
