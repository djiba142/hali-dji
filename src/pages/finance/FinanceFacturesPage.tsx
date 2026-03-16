import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Receipt, Plus, Search, Filter, Download, FileText, CheckCircle2, Trash2, Eye, Loader2, AlertTriangle, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';

interface FinanceFacture {
  id: string;
  numero_facture: string;
  fournisseur_id: string;
  fournisseur: { nom: string } | null;
  montant_ttc: number;
  devise: string;
  objet: string;
  statut: string;
  date_emission: string;
  direction_id: string;
}

export default function FinanceFacturesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { role } = useAuth();

  const [newFace, setNewFace] = useState({
    numero_facture: '',
    fournisseur_id: '',
    montant_ht: 0,
    montant_ttc: 0,
    devise: 'GNF',
    objet: '',
    direction_id: '',
    date_emission: new Date().toISOString().split('T')[0]
  });

  const { data: factures = [], isLoading } = useQuery<FinanceFacture[]>({
    queryKey: ['finance-factures'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('finance_factures')
        .select(`
          *,
          fournisseur:finance_fournisseurs(nom)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FinanceFacture[];
    }
  });

  const { data: fournisseurs = [] } = useQuery({
    queryKey: ['finance-fournisseurs-list'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('finance_fournisseurs').select('id, nom');
      if (error) throw error;
      return data;
    }
  });

  const validateMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: string, statut: string }) => {
      const { error } = await (supabase as any)
        .from('finance_factures')
        .update({ statut })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-factures'] });
      queryClient.invalidateQueries({ queryKey: ['finance-budgets-summary'] });
      toast({ title: "Facture mise à jour", description: "Le statut a été modifié avec succès." });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (facture: any) => {
      const { data, error } = await (supabase as any)
        .from('finance_factures')
        .insert([{ ...facture, statut: 'brouillon' }]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-factures'] });
      toast({ title: "Facture créée", description: "La facture est désormais enregistrée." });
      setIsCreateOpen(false);
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paye': return <Badge className="bg-emerald-500 text-white border-emerald-600 uppercase text-[9px] font-black">Payée</Badge>;
      case 'en_attente_controle': return <Badge className="bg-amber-100 text-amber-700 border-amber-200 uppercase text-[9px] font-black">À Vérifier (Contrôle)</Badge>;
      case 'valide_daf': return <Badge className="bg-blue-100 text-blue-700 border-blue-200 uppercase text-[9px] font-black">Validée (Awaiting Pay)</Badge>;
      case 'brouillon': return <Badge className="bg-slate-100 text-slate-700 border-slate-200 uppercase text-[9px] font-black">Brouillon</Badge>;
      case 'rejete': return <Badge className="bg-red-100 text-red-700 border-red-200 uppercase text-[9px] font-black">Rejetée</Badge>;
      default: return <Badge className="uppercase text-[9px] font-black">{status}</Badge>;
    }
  };

  const filtered = factures.filter(f => 
    f.numero_facture.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.fournisseur?.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Registre des Factures" subtitle="Gestion, validation et archivage des pièces comptables fournisseurs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Numéro, fournisseur..." 
              className="pl-9 h-11 rounded-xl w-80" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-11 rounded-xl"><Filter className="h-4 w-4 mr-2" /> Statut</Button>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" className="h-11 rounded-xl" onClick={() => {
             const headers = ['N° Facture', 'Fournisseur', 'Objet', 'Montant TTC', 'Devise', 'Statut', 'Date'];
             const rows = factures.map(f => [f.numero_facture, f.fournisseur?.nom || 'Inconnu', f.objet, f.montant_ttc, f.devise, f.statut, f.date_emission]);
             const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
             const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
             const link = document.createElement('a');
             link.href = URL.createObjectURL(blob);
             link.download = `factures_${new Date().toISOString().split('T')[0]}.csv`;
             link.click();
             toast({ title: 'Export réussi', description: 'Le registre des factures a été exporté au format CSV.' });
           }}><Download className="h-4 w-4 mr-2" /> Exporter Registre (CSV)</Button>
           
           {(role === 'comptable' || role === 'super_admin') && (
             <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
               <DialogTrigger asChild>
                 <Button className="h-11 rounded-xl bg-slate-900 group">
                   <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" /> Nouvelle Facture
                 </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-xl rounded-[2.5rem]">
                 <DialogHeader>
                   <DialogTitle className="text-2xl font-black uppercase">Enregistrer une Facture</DialogTitle>
                   <DialogDescription>Saisissez les détails de la facture fournisseur Reçue.</DialogDescription>
                 </DialogHeader>
                 <div className="grid grid-cols-2 gap-6 py-4">
                   <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">N° Facture</Label>
                     <Input placeholder="FAC-2026-XXXX" className="rounded-xl h-11" onChange={(e) => setNewFace({...newFace, numero_facture: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fournisseur</Label>
                     <Select onValueChange={(v) => setNewFace({...newFace, fournisseur_id: v})}>
                       <SelectTrigger className="rounded-xl h-11">
                         <SelectValue placeholder="Choisir..." />
                       </SelectTrigger>
                       <SelectContent>
                         {fournisseurs.map((f: any) => (
                           <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Montant TTC</Label>
                     <Input type="number" className="rounded-xl h-11" onChange={(e) => setNewFace({...newFace, montant_ttc: Number(e.target.value), montant_ht: Number(e.target.value)})} />
                   </div>
                   <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Direction Concernée</Label>
                     <Select onValueChange={(v) => setNewFace({...newFace, direction_id: v})}>
                       <SelectTrigger className="rounded-xl h-11">
                         <SelectValue placeholder="Choisir..." />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="importation">Importation</SelectItem>
                          <SelectItem value="logistique">Logistique</SelectItem>
                          <SelectItem value="aval">Services Aval</SelectItem>
                          <SelectItem value="daf">DAF</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="col-span-2 space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Objet de la dépense</Label>
                     <Input placeholder="Description sommaire..." className="rounded-xl h-11" onChange={(e) => setNewFace({...newFace, objet: e.target.value})} />
                   </div>
                 </div>
                 <DialogFooter>
                   <Button 
                     className="w-full h-12 bg-slate-900 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/20"
                     onClick={() => createMutation.mutate(newFace)}
                     disabled={createMutation.isPending}
                   >
                     {createMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : "Soumettre pour Contrôle"}
                   </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>
           )}
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left py-5 px-8 font-black uppercase text-[10px] text-slate-400 tracking-widest">N° Facture / Date</th>
                  <th className="text-left py-5 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Fournisseur / Objet</th>
                  <th className="text-left py-5 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Direction</th>
                  <th className="text-left py-5 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Montant TTC</th>
                  <th className="text-left py-5 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Statut</th>
                  <th className="text-right py-5 px-8 font-black uppercase text-[10px] text-slate-400 tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin mx-auto opacity-20" size={40} /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-20 text-center opacity-20 font-black uppercase text-[10px]">Aucune facture trouvée</td></tr>
                ) : filtered.map((fac) => (
                  <tr key={fac.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                    <td className="py-6 px-8">
                      <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{fac.numero_facture}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{fac.date_emission}</p>
                    </td>
                    <td className="py-6 px-6">
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase">{fac.fournisseur?.nom || 'Inconnu'}</p>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5 italic">{fac.objet}</p>
                    </td>
                    <td className="py-6 px-6">
                      <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-tighter opacity-70">{fac.direction_id}</Badge>
                    </td>
                    <td className="py-6 px-6">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{fac.montant_ttc.toLocaleString()} <span className="text-[10px] text-slate-400">{fac.devise}</span></p>
                    </td>
                    <td className="py-6 px-6">
                      {getStatusBadge(fac.statut)}
                    </td>
                    <td className="py-6 px-8 flex items-center justify-end gap-2">
                        {role === 'comptable' && fac.statut === 'brouillon' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-9 px-4 rounded-xl text-[9px] font-black uppercase border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                            onClick={() => validateMutation.mutate({ id: fac.id, statut: 'en_attente_controle' })}
                          >
                             <ArrowRightLeft size={12} className="mr-1.5" /> Soumettre au Contrôle
                          </Button>
                        )}
                        {(role === 'controleur_financier' || role === 'directeur_financier' || role === 'super_admin') && fac.statut === 'en_attente_controle' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-9 px-4 rounded-xl text-[9px] font-black uppercase border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => validateMutation.mutate({ id: fac.id, statut: 'valide_daf' })}
                          >
                             <ShieldCheck size={12} className="mr-1.5" /> Vérifier Facture
                          </Button>
                        )}
                        {(role === 'directeur_financier' || role === 'super_admin') && fac.statut === 'valide_daf' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-9 px-4 rounded-xl text-[9px] font-black uppercase border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => validateMutation.mutate({ id: fac.id, statut: 'paye' })}
                          >
                             <CheckCircle2 size={12} className="mr-1.5" /> Autoriser Paiement
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-slate-400 hover:text-emerald-500 group-hover:bg-emerald-50"><Eye size={16} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Alert for Auto-Budget Updates */}
      <div className="mt-8 p-6 rounded-[2rem] bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex items-center gap-4">
         <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
         </div>
         <div>
            <p className="text-xs font-black uppercase text-amber-900 dark:text-amber-400 tracking-tight">Vérification Budgétaire Automatique Activée</p>
            <p className="text-[10px] text-amber-700 dark:text-amber-600 font-bold leading-relaxed">
              Le passage au statut <Badge className="bg-emerald-500 h-3 text-[7px]">Payé</Badge> déduit automatiquement le montant TTC du budget alloué de la direction concernée. 
              Cette opération est irréversible dans le journal d'audit financier.
            </p>
         </div>
      </div>
    </DashboardLayout>
  );
}
