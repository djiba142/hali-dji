import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, Plus, Search, Filter, Download, ArrowRightLeft, CreditCard, Banknote, ShieldCheck, Loader2, Receipt, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';

interface FinancePaiement {
  id: string;
  facture_id: string;
  facture: { numero_facture: string, fournisseur: { nom: string } | null } | null;
  montant_paye: number;
  devise: string;
  date_paiement: string;
  mode_paiement: string;
  reference_transaction: string;
  statut: string;
}

export default function FinancePaiementsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isPayOpen, setIsPayOpen] = useState(false);
  const { role } = useAuth();

  const [newPay, setNewPay] = useState({
    facture_id: '',
    montant_paye: 0,
    mode_paiement: 'virement',
    reference_transaction: '',
    notes: ''
  });

  const { data: paiements = [], isLoading } = useQuery<FinancePaiement[]>({
    queryKey: ['finance-paiements'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('finance_paiements')
        .select(`
          *,
          facture:finance_factures(
            numero_facture,
            fournisseur:finance_fournisseurs(nom)
          )
        `)
        .order('date_paiement', { ascending: false });
      if (error) throw error;
      return data as FinancePaiement[];
    }
  });

  const { data: pendingFactures = [] } = useQuery({
    queryKey: ['finance-factures-to-pay'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('finance_factures')
        .select(`id, numero_facture, montant_ttc, date_emission, fournisseur:finance_fournisseurs(nom)`)
        .eq('statut', 'valide_daf');
      if (error) throw error;
      return data;
    }
  });

  const payMutation = useMutation({
    mutationFn: async (payment: any) => {
      // 1. Create payment record
      const { error: pError } = await (supabase as any).from('finance_paiements').insert([payment]);
      if (pError) throw pError;

      // 2. Update invoice status to 'paye'
      const { error: fError } = await (supabase as any)
        .from('finance_factures')
        .update({ statut: 'paye' })
        .eq('id', payment.facture_id);
      if (fError) throw fError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-paiements'] });
      queryClient.invalidateQueries({ queryKey: ['finance-factures'] });
      queryClient.invalidateQueries({ queryKey: ['finance-budgets-summary'] });
      toast({ title: "Paiement confirmé", description: "La transaction a été enregistrée et le budget mis à jour." });
      setIsPayOpen(false);
    }
  });

  const filtered = paiements.filter(p => 
    p.facture?.numero_facture.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.facture?.fournisseur?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.reference_transaction?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Trésorerie & Paiements" subtitle="Suivi des décaissements et historique des flux financiers sortants">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Référence, facture..." 
              className="pl-9 h-11 rounded-xl w-80" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => {
            const headers = ['N° Facture', 'Fournisseur', 'Montant Payé', 'Devise', 'Date Paiement', 'Mode Paiement', 'Référence Transaction', 'Statut'];
            const rows = paiements.map(p => [
              p.facture?.numero_facture || 'N/A',
              p.facture?.fournisseur?.nom || 'Inconnu',
              p.montant_paye,
              p.devise,
              new Date(p.date_paiement).toLocaleDateString(),
              p.mode_paiement,
              p.reference_transaction,
              p.statut
            ]);
            const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `paiements_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            toast({ title: 'Export réussi', description: 'Le registre des paiements a été exporté.' });
          }}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
        </div>

        {(role === 'directeur_financier' || role === 'comptable' || role === 'super_admin') && (
          <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 rounded-xl bg-slate-900 shadow-xl shadow-slate-900/20 group">
                <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" /> Nouvel Ordre de Paiement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
              <div className="bg-slate-900 p-8 text-white relative h-32 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
                <div className="relative z-10">
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-emerald-400" /> Ordre de Décaissement
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 font-medium italic">Autorisation formelle de paiement pour facture validée DAF.</DialogDescription>
                </div>
              </div>

              <div className="p-8 space-y-6 bg-white dark:bg-slate-950">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                      <Receipt className="h-3 w-3" /> Facture Validée
                    </Label>
                    <Select onValueChange={(v) => {
                      const fact = pendingFactures.find((f: any) => f.id === v);
                      setNewPay({...newPay, facture_id: v, montant_paye: fact.montant_ttc});
                    }}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:ring-emerald-500">
                        <SelectValue placeholder="Choisir une facture validée..." />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingFactures.map((f: any) => (
                          <SelectItem key={f.id} value={f.id} className="text-xs">
                             <span className="font-black uppercase">#{f.numero_facture}</span> — {f.fournisseur?.nom} ({f.montant_ttc.toLocaleString()} GNF)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                      <Search className="h-3 w-3" /> Réf. Transaction
                    </Label>
                    <Input placeholder="VIRT/SONAP/00XX/2026" className="h-12 rounded-xl border-slate-200 focus:ring-emerald-500 font-mono text-sm" onChange={(e) => setNewPay({...newPay, reference_transaction: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                      <CreditCard className="h-3 w-3" /> Mode de Règlement
                    </Label>
                    <Select onValueChange={(v) => setNewPay({...newPay, mode_paiement: v})}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-200 focus:ring-emerald-500">
                        <SelectValue placeholder="Mode de transfert..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="virement" className="text-xs font-bold uppercase">Virement Bancaire (RTGS)</SelectItem>
                        <SelectItem value="cheque" className="text-xs font-bold uppercase">Chèque Certifié</SelectItem>
                        <SelectItem value="cash" className="text-xs font-bold uppercase">Espèces (Petite Caisse)</SelectItem>
                        <SelectItem value="autre" className="text-xs font-bold uppercase">Autre Mode</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                      <Coins className="h-3 w-3" /> Montant Estimé
                    </Label>
                    <div className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-slate-800 flex items-center px-4 font-black text-slate-900 dark:text-white">
                      {newPay.montant_paye.toLocaleString()} <span className="text-[10px] text-slate-400 ml-2">GNF</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex gap-3 items-center">
                    <AlertTriangle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
                      Cette action débitera immédiatement le budget de la direction concernée et clôturera le dossier de paiement.
                    </p>
                  </div>
                </div>

                <DialogFooter className="pt-4">
                   <Button 
                    className="w-full h-14 bg-slate-900 hover:bg-slate-800 rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-slate-900/20"
                    onClick={() => payMutation.mutate(newPay)}
                    disabled={payMutation.isPending || !newPay.facture_id}
                   >
                     {payMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : "Générer & Transmettre l'Ordre"}
                   </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center opacity-40">
           <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
           <p className="text-xs font-black uppercase">Interrogation des flux de trésorerie...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4">
           <Banknote size={48} />
           <p className="text-[10px] font-black uppercase tracking-widest">Aucune transaction enregistrée</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((tr) => (
            <div key={tr.id} className="p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                    <ArrowRightLeft className="h-6 w-6 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{tr.facture?.fournisseur?.nom || 'Fournisseur Inconnu'}</p>
                      <Badge variant="outline" className="text-[8px] font-black tracking-widest uppercase opacity-60">REF: {tr.reference_transaction || tr.id.substring(0,8)}</Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic opacity-70">Lié à la facture {tr.facture?.numero_facture} • {tr.mode_paiement}</p>
                </div>
              </div>

              <div className="flex items-center gap-12">
                <div className="text-right">
                    <p className="text-lg font-black text-slate-900 dark:text-white">{tr.montant_paye.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold">{tr.devise}</span></p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic mt-0.5">{new Date(tr.date_paiement).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                      <Badge className={cn(
                        "text-[9px] font-black uppercase tracking-widest h-6 px-3",
                        tr.statut === 'effectué' ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"
                      )}>{tr.statut}</Badge>
                      <div className="flex items-center gap-1 mt-1.5 text-[9px] font-bold text-emerald-500 uppercase">
                        <ShieldCheck size={10} /> Certifié SONAP
                      </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 p-0 rounded-xl hover:bg-slate-50"><Download size={18} className="text-slate-400" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
