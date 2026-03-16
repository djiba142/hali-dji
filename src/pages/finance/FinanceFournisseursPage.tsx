import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Plus, Search, Filter, Globe, Phone, Mail, MapPin, Loader2 } from 'lucide-react';
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
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface FinanceFournisseur {
  id: string;
  nom: string;
  pays: string;
  adresse: string;
  contact_nom: string;
  contact_email: string;
  contact_tel: string;
  type_fournisseur: string;
  statut: string;
}

export default function FinanceFournisseursPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { role } = useAuth();

  const [newFournisseur, setNewFournisseur] = useState({
    nom: '',
    pays: 'Guinée',
    type_fournisseur: 'local',
    contact_email: '',
    contact_tel: ''
  });

  const { data: fournisseurs = [], isLoading } = useQuery<FinanceFournisseur[]>({
    queryKey: ['finance-fournisseurs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('finance_fournisseurs')
        .select('*')
        .order('nom', { ascending: true });
      if (error) throw error;
      return data as FinanceFournisseur[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (provider: any) => {
      const { data, error } = await (supabase as any)
        .from('finance_fournisseurs')
        .insert([provider]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-fournisseurs'] });
      toast({ title: "Fournisseur ajouté", description: "Le nouveau partenaire a été enregistré." });
      setIsCreateOpen(false);
    }
  });

  const filtered = fournisseurs.filter(f => 
    f.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.pays.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Répertoire Fournisseurs" subtitle="Base de données centralisée des partenaires financiers et opérationnels">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Nom, pays, type..." 
              className="pl-9 h-11 rounded-xl w-80" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-11 rounded-xl"><Filter className="h-4 w-4 mr-2" /> Type</Button>
        </div>

         {(role === 'comptable' || role === 'super_admin') && (
           <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
             <DialogTrigger asChild>
               <Button className="h-11 rounded-xl bg-slate-900 shadow-xl shadow-slate-900/20">
                 <Plus className="h-4 w-4 mr-2" /> Nouveau Fournisseur
               </Button>
             </DialogTrigger>
             <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
               <DialogHeader>
                 <DialogTitle className="text-xl font-black uppercase">Ajouter un Partenaire</DialogTitle>
                 <DialogDescription>Enregistrez un nouveau fournisseur dans le système SONAP.</DialogDescription>
               </DialogHeader>
               <div className="grid gap-4 py-4">
                 <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nom de l'entreprise</Label>
                   <Input className="rounded-xl h-11" onChange={(e) => setNewFournisseur({...newFournisseur, nom: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pays</Label>
                     <Input placeholder="Guinée" className="rounded-xl h-11" onChange={(e) => setNewFournisseur({...newFournisseur, pays: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Contact</Label>
                     <Input type="email" className="rounded-xl h-11" onChange={(e) => setNewFournisseur({...newFournisseur, contact_email: e.target.value})} />
                   </div>
                 </div>
               </div>
               <DialogFooter>
                  <Button 
                   className="w-full h-12 bg-slate-900 rounded-xl font-black uppercase text-xs tracking-widest"
                   onClick={() => createMutation.mutate(newFournisseur)}
                   disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : "Enregistrer"}
                  </Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>
         )}
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center opacity-40">
           <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
           <p className="text-xs font-black uppercase">Accès au répertoire...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((f) => (
            <Card key={f.id} className="rounded-3xl border-slate-200 hover:shadow-xl transition-all overflow-hidden bg-white dark:bg-slate-900 group">
              <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-1/3 bg-slate-50 dark:bg-slate-800/50 p-6 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800">
                        <div className="h-20 w-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <Building2 className="h-10 w-10 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                        </div>
                        <Badge className="mt-4 text-[9px] font-black uppercase tracking-widest">{f.type_fournisseur || 'Local'}</Badge>
                    </div>
                    <div className="flex-1 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{f.nom}</h3>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <Globe size={12} /> {f.pays}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                              <Mail size={14} className="text-slate-300" /> {f.contact_email || 'n/a'}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                              <Phone size={14} className="text-slate-300" /> {f.contact_tel || 'n/a'}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                              <MapPin size={14} className="text-slate-300" /> {f.adresse || 'Siège Social'}
                          </div>
                        </div>
                    </div>
                  </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
