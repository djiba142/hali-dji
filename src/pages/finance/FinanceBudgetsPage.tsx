import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PiggyBank, Plus, Search, Filter, Download, ArrowUpRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface FinanceBudget {
  id: string;
  annee: number;
  direction: string;
  montant_alloue: number;
  montant_utilise: number;
  devise: string;
  statut: string;
}

export default function FinanceBudgetsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { role } = useAuth();
  
  // Form State
  const [newBudget, setNewBudget] = useState({
    annee: new Date().getFullYear(),
    direction: '',
    montant_alloue: 0,
    devise: 'GNF'
  });

  const { data: budgets = [], isLoading } = useQuery<FinanceBudget[]>({
    queryKey: ['finance-budgets'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('finance_budgets')
        .select('*')
        .order('direction', { ascending: true });
      if (error) throw error;
      return data as FinanceBudget[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (budget: any) => {
      const { data, error } = await (supabase as any)
        .from('finance_budgets')
        .insert([budget]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-budgets'] });
      toast({ title: "Budget créé", description: "Le budget a été ajouté avec succès." });
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const filteredBudgets = budgets.filter(b => 
    b.direction.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Gestion Budgétaire" subtitle="Planification et suivi des allocations budgétaires par direction">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Rechercher direction..." 
              className="pl-9 h-11 rounded-xl w-64" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-11 rounded-xl border-slate-200">
            <Filter className="h-4 w-4 mr-2" /> Année {new Date().getFullYear()}
          </Button>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" className="h-11 rounded-xl" onClick={() => {
             const headers = ['Direction', 'Année', 'Montant Alloué', 'Montant Utilisé', 'Statut'];
             const rows = budgets.map(b => [b.direction, b.annee, b.montant_alloue, b.montant_utilise, b.statut]);
             const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
             const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
             const link = document.createElement('a');
             link.href = URL.createObjectURL(blob);
             link.download = `budgets_${new Date().getFullYear()}.csv`;
             link.click();
             toast({ title: 'Export réussi', description: 'Le registre budgétaire a été téléchargé au format CSV.' });
           }}><Download className="h-4 w-4 mr-2" /> Exporter Registre (CSV)</Button>
              {(role === 'directeur_financier' || role === 'controleur_financier' || role === 'super_admin') && (
             <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
               <DialogTrigger asChild>
                 <Button className="h-11 rounded-xl bg-slate-900 group">
                   <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" /> Créer Budget
                 </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
                 <DialogHeader>
                   <DialogTitle className="text-xl font-black uppercase">Nouveau Budget</DialogTitle>
                   <DialogDescription>Définissez une allocation budgétaire pour une direction SONAP.</DialogDescription>
                 </DialogHeader>
                 <div className="grid gap-6 py-4">
                   <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="direction" className="text-right font-bold text-[10px] uppercase">Direction</Label>
                     <Select onValueChange={(v) => setNewBudget({...newBudget, direction: v})}>
                       <SelectTrigger className="col-span-3 rounded-xl h-11">
                         <SelectValue placeholder="Choisir une direction" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="importation">Importation</SelectItem>
                         <SelectItem value="logistique">Logistique</SelectItem>
                         <SelectItem value="aval">Services Aval</SelectItem>
                         <SelectItem value="daf">DAF</SelectItem>
                         <SelectItem value="rh">Ressources Humaines</SelectItem>
                         <SelectItem value="dsi">DSI</SelectItem>
                         <SelectItem value="dg">Direction Générale</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="montant" className="text-right font-bold text-[10px] uppercase">Montant</Label>
                     <Input 
                       id="montant" 
                       className="col-span-3 rounded-xl h-11" 
                       type="number"
                       onChange={(e) => setNewBudget({...newBudget, montant_alloue: Number(e.target.value)})}
                     />
                   </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="devise" className="text-right font-bold text-[10px] uppercase">Devise</Label>
                     <Select defaultValue="GNF" onValueChange={(v) => setNewBudget({...newBudget, devise: v})}>
                       <SelectTrigger className="col-span-3 rounded-xl h-11">
                         <SelectValue placeholder="Devise" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="GNF">GNF</SelectItem>
                         <SelectItem value="USD">USD</SelectItem>
                         <SelectItem value="EUR">EUR</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
                 <DialogFooter>
                   <Button 
                     className="w-full h-12 bg-slate-900 rounded-xl font-black uppercase text-xs tracking-widest"
                     onClick={() => createMutation.mutate(newBudget)}
                     disabled={createMutation.isPending}
                   >
                     {createMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : "Confirmer l'Allocation"}
                   </Button>
                 </DialogFooter>
               </DialogContent>
             </Dialog>
           )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-40">
           <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
           <p className="text-xs font-black uppercase">Chargement des données budgétaires...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBudgets.map((b) => {
            const pct = b.montant_alloue > 0 ? (b.montant_utilise / b.montant_alloue) * 100 : 0;
            return (
              <Card key={b.id} className="rounded-3xl border-slate-200 hover:shadow-xl transition-all group overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-[10px] font-black tracking-widest uppercase text-emerald-600 bg-white">{b.statut}</Badge>
                    <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                  <CardTitle className="text-lg font-black uppercase text-slate-900">{b.direction}</CardTitle>
                  <CardDescription className="text-xs font-bold font-mono uppercase">BUD-{b.annee}-{b.direction.substring(0,3)}</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Budget Alloué</p>
                         <p className="text-xl font-black text-slate-900">{b.montant_alloue.toLocaleString()} <span className="text-[10px] text-slate-400 uppercase">{b.devise}</span></p>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Utilisé</p>
                         <p className="text-sm font-black text-emerald-600">{b.montant_utilise.toLocaleString()} {b.devise}</p>
                       </div>
                    </div>
                    <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 italic">Taux d'exécution: {pct.toFixed(1)}%</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
