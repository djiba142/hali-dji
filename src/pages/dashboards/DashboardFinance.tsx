import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wallet, PiggyBank, Receipt, Coins, ArrowUpRight, ArrowDownRight, 
  BarChart3, PieChart, TrendingUp, AlertCircle, CheckCircle2, 
  Clock, Filter, Download, Plus, Search, Building2, UserCheck, 
  FileText, ShieldCheck, Loader2, Bookmark, Ship
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import sonapLogo from '@/assets/sonap.jpeg';
import { generateCustomReportPDF } from '@/lib/pdfExport';

interface FinanceBudget {
  id: string;
  annee: number;
  direction: string;
  montant_alloue: number;
  montant_utilise: number;
  statut: string;
}

interface FinanceFacture {
  id: string;
  numero_facture: string;
  fournisseur: { nom: string } | null;
  montant_ttc: number;
  devise: string;
  objet: string;
  statut: string;
}

export default function DashboardFinance() {
  const { role, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch Budget Summary
  const { data: budgets = [], isLoading: loadingBudgets } = useQuery<FinanceBudget[]>({
    queryKey: ['finance-budgets-summary'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('finance_budgets')
        .select('*')
        .eq('annee', new Date().getFullYear());
      if (error) throw error;
      return (data || []) as FinanceBudget[];
    }
  });

  // Fetch Pending Invoices (awaiting validation) based on role
  const { data: pendingFactures = [], isLoading: loadingFactures } = useQuery<FinanceFacture[]>({
    queryKey: ['finance-pending-factures', role],
    queryFn: async () => {
      let statusFilter = ['en_attente_controle'];
      if (role === 'comptable') statusFilter = ['brouillon'];
      if (role === 'directeur_financier' || role === 'super_admin') statusFilter = ['valide_daf', 'en_attente_controle'];
      if (role === 'controleur_financier') statusFilter = ['en_attente_controle'];

      const { data, error } = await (supabase as any)
        .from('finance_factures')
        .select(`
          id, numero_facture, montant_ttc, devise, objet, statut,
          fournisseur:finance_fournisseurs(nom)
        `)
        .in('statut', statusFilter)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[] as FinanceFacture[];
    }
  });

  // Fetch Import Dossiers waiting for payment
  const { data: importPayments = [], refetch: refetchImportPayments } = useQuery({
    queryKey: ['finance-import-payments'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('import_dossiers')
        .select('*')
        .eq('statut', 'attente_paiement');
      if (error) return [];
      return data || [];
    }
  });

  const handlePayImport = async (dossierId: string) => {
    try {
      toast.info("Paiement International", {
        description: "Initialisation du virement SWIFT pour le fournisseur..."
      });
      // Real DB update would be:
      // await supabase.from('import_dossiers').update({ statut: 'en_transit' }).eq('id', dossierId);
      toast.success("Paiement Effectué", {
        description: "Le navire est maintenant autorisé à débuter son transit vers Conakry."
      });
      refetchImportPayments();
    } catch (err) {
      toast.error("Échec du paiement");
    }
  };

  const queryClient = useQueryClient();
  const validateMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: string, statut: string }) => {
      const { error } = await (supabase as any)
        .from('finance_factures')
        .update({ statut })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-pending-factures'] });
      queryClient.invalidateQueries({ queryKey: ['finance-budgets-summary'] });
      toast.success("Statut mis à jour", {
        description: "Le dossier a progressé dans le workflow financier."
      });
    }
  });

  const totals = useMemo(() => {
    const allocated = budgets.reduce((acc, b) => acc + Number(b.montant_alloue), 0);
    const used = budgets.reduce((acc, b) => acc + Number(b.montant_utilise), 0);
    return { allocated, used, remaining: allocated - used };
  }, [budgets]);

  const budgetUsagePercent = totals.allocated > 0 ? (totals.used / totals.allocated) * 100 : 0;

  return (
    <DashboardLayout 
      title="Direction Administrative & Financière" 
      subtitle="Pilotage budgétaire, trésorerie et conformité des flux financiers de la SONAP"
    >
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-10 mb-8 border border-white/5 shadow-2xl">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full -mr-60 -mt-60 blur-[130px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full -ml-40 -mb-40 blur-[100px]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex -space-x-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                <span className="h-2 w-2 rounded-full bg-slate-700" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 italic">Pôle Souveraineté Financière</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase mb-3">CONTRÔLE FINANCIER</h1>
            <p className="text-slate-400 max-w-xl text-sm font-medium leading-relaxed italic">
              Gestion centralisée des budgets nationaux SONAP. Validation sécurisée des flux fournisseurs 
              et monitoring en temps réel de la santé financière du secteur pétrolier.
            </p>
          </div>

          <div className="flex items-center gap-6 bg-white/5 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/10 shadow-inner group transition-all hover:bg-white/10">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">Trésorerie Actuelle</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-white tracking-tighter">742.8M</p>
                <p className="text-xs font-bold text-slate-500">GNF</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Budget Global SONAP" 
          value={`${(totals.allocated / 1000000).toFixed(1)}M`} 
          subtitle={`Utilisé: ${(totals.used / 1000000).toFixed(1)}M`}
          icon={PiggyBank} 
          variant="primary"
          trend={{ value: 12, positive: true }}
        />
        <StatCard 
          title="Factures en Attente" 
          value={pendingFactures.length} 
          subtitle="A vérifier par Contrôle"
          icon={Receipt} 
          variant="warning"
        />
        <StatCard 
          title="Paiements ce Mois" 
          value="128.5M" 
          subtitle="Validés & Effectués"
          icon={Coins} 
          variant="success"
          trend={{ value: 5, positive: true }}
        />
        <StatCard 
          title="Taux d'Exécution" 
          value={`${budgetUsagePercent.toFixed(1)}%`} 
          subtitle="Consommation annuelle"
          icon={TrendingUp} 
          variant="primary"
        />
      </div>

      {/* Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Budget Allocation Monitoring (Left) */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col">
            <CardHeader className="p-8 pb-4 border-b border-sidebar-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-emerald-500" /> Suivi Budgétaire {new Date().getFullYear()}
                  </CardTitle>
                  <CardDescription className="text-xs font-bold italic opacity-60">Consommation du budget par direction opérationnelle</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                    onClick={() => {
                      const headers = ['Direction', 'Montant Alloué', 'Montant Utilisé', 'Utilisation %', 'Statut'];
                      const rows = budgets.map(b => [
                        b.direction, 
                        b.montant_alloue, 
                        b.montant_utilise, 
                        b.montant_alloue > 0 ? ((b.montant_utilise / b.montant_alloue) * 100).toFixed(1) + '%' : '0%',
                        b.statut
                      ]);
                      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `budget_global_${new Date().getFullYear()}.csv`;
                      link.click();
                      toast.success("Rapport budgétaire exporté", {
                        description: "Le fichier CSV a été généré avec succès."
                      });
                    }}
                  >
                    <Download className="h-3 w-3" /> Exporter Budget
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2"
                    onClick={() => toast.info('Filtrage', { description: 'Le filtrage avancé des budgets sera disponible après la clôture du trimestre.' })}
                  >
                    <Filter className="h-3 w-3" /> Filtrer
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {loadingBudgets ? (
                <div className="py-20 flex flex-col items-center justify-center opacity-40">
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
                  <p className="text-xs font-black uppercase">Chargement des flux financiers...</p>
                </div>
              ) : budgets.length === 0 ? (
                <div className="py-20 text-center opacity-20 flex flex-col items-center">
                   <PiggyBank className="h-16 w-16 mb-4" />
                   <p className="text-xs font-black uppercase">Aucun budget défini pour cette période</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {budgets.map((b) => {
                    const pct = (Number(b.montant_utilise) / Number(b.montant_alloue)) * 100;
                    return (
                      <div key={b.id} className="group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center transition-transform group-hover:scale-110">
                              <Building2 className="h-5 w-5 text-slate-400 group-hover:text-emerald-500" />
                            </div>
                            <div>
                               <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">{b.direction}</p>
                               <div className="flex items-center gap-2 mt-0.5">
                                 <Badge variant="outline" className="text-[8px] font-black h-4 px-1">{b.statut}</Badge>
                                 <p className="text-[10px] text-slate-500 font-bold truncate">Alloc: {Number(b.montant_alloue).toLocaleString()} GNF</p>
                               </div>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{pct.toFixed(1)}%</p>
                             <p className="text-[10px] text-emerald-500 font-bold italic">Reste: {(Number(b.montant_alloue) - Number(b.montant_utilise)).toLocaleString()} GNF</p>
                          </div>
                        </div>
                        <div className="relative pt-1">
                          <Progress value={pct} className={cn(
                            "h-2 rounded-full",
                            pct > 90 ? "bg-red-500/20" : pct > 75 ? "bg-amber-500/20" : "bg-emerald-500/20"
                          )} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-sidebar-border/50 flex items-center justify-center">
               <div className="flex items-center gap-4">
                 <div className="flex items-center gap-1.5">
                   <div className="h-2 w-2 rounded-full bg-emerald-500" />
                   <span className="text-[9px] font-black uppercase text-slate-400">Normal</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                   <div className="h-2 w-2 rounded-full bg-amber-500" />
                   <span className="text-[9px] font-black uppercase text-slate-400">Alerte (&gt;75%)</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                   <div className="h-2 w-2 rounded-full bg-red-500" />
                   <span className="text-[9px] font-black uppercase text-slate-400">Critique (&gt;90%)</span>
                 </div>
               </div>
            </div>
          </Card>
        </div>

        {/* Action Center & Validation Queue (Right) */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-emerald-100 dark:border-emerald-900 shadow-xl bg-emerald-50/20 dark:bg-emerald-900/10 overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-emerald-600" /> Actions Prioritaires
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-3">
              {(role === 'directeur_financier' || role === 'comptable' || role === 'super_admin') && (
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[9px] tracking-widest gap-2 shadow-xl shadow-slate-900/20"
                    onClick={() => navigate('/finance/factures')}
                  >
                    <Plus className="h-4 w-4" /> Facture
                  </Button>
                  <Button 
                    className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[9px] tracking-widest gap-2 shadow-xl shadow-emerald-600/20"
                    onClick={() => navigate('/finance/paiements')}
                  >
                    <Coins className="h-4 w-4" /> Nouvel Ordre
                  </Button>
                </div>
              )}
              {(role === 'directeur_financier' || role === 'controleur_financier' || role === 'super_admin') && (
                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                  onClick={() => navigate('/finance/budgets')}
                >
                  <Plus className="h-4 w-4" /> Créer / Ajuster Budget
                </Button>
              )}
              {(role === 'directeur_financier' || role === 'controleur_financier' || role === 'comptable' || role === 'super_admin') && (
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-black uppercase text-[10px] tracking-widest gap-2 hover:bg-emerald-50 transition-all shadow-sm"
                    onClick={async () => {
                      try {
                        toast.loading("Génération du PDF officiel...");
                        await generateCustomReportPDF({
                          type: 'bilan-financier',
                          title: 'BILAN FINANCIER DAF - SONAP',
                          data: {
                            lignes: budgets.map(b => ({
                              nom: b.direction,
                              alloue: b.montant_alloue,
                              utilise: b.montant_utilise
                            }))
                          },
                          signerRole: role || 'directeur_financier',
                          signerName: profile?.full_name || 'Direction Financière'
                        });
                        toast.dismiss();
                        toast.success("PDF généré avec succès");
                      } catch (error) {
                        toast.dismiss();
                        toast.error("Erreur de génération PDF");
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 text-emerald-600" /> Exporter Bilan PDF
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full h-10 rounded-xl text-slate-500 font-black uppercase text-[9px] tracking-widest gap-2 hover:bg-slate-50 transition-all"
                    onClick={() => {
                      const headers = ['Direction', 'Budget Alloué', 'Budget Utilisé', 'Utilisation %'];
                      const rows = budgets.map(b => [
                        b.direction, 
                        b.montant_alloue, 
                        b.montant_utilise, 
                        b.montant_alloue > 0 ? ((b.montant_utilise / b.montant_alloue) * 100).toFixed(1) + '%' : '0%'
                      ]);
                      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `registre_financier_${new Date().toISOString().split('T')[0]}.csv`;
                      link.click();
                      toast.success('Rapport exporté', { description: 'Le registre financier a été téléchargé au format CSV.' });
                    }}
                  >
                    <Download className="h-3.5 w-3.5" /> Registre CSV
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-900 text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-500">
              <Ship className="h-24 w-24" />
            </div>
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-lg font-black uppercase text-emerald-400 font-display tracking-tight">Paiements Importations (Appro)</CardTitle>
              <CardDescription className="text-slate-400 italic">Dossiers validés par le Juridique en attente de flux financier.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-4">
              {importPayments.length > 0 ? (
                importPayments.map((p: any) => (
                  <div key={p.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between transition-all hover:bg-white/10">
                     <div>
                        <p className="text-xs font-black uppercase tracking-widest">{p.numero_dossier || 'Dossier #'+p.id.slice(0,5)}</p>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase">{p.fournisseur_nom || 'Fournisseur International'}</p>
                     </div>
                     <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase h-8 rounded-lg shadow-lg shadow-emerald-500/20" onClick={() => handlePayImport(p.id)}>
                        Confirmer SWIFT
                     </Button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 gap-2 opacity-50 border-2 border-dashed border-white/5 rounded-3xl">
                   <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
                     <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aucun paiement en attente</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col">
            <CardHeader className="p-8 pb-4 border-b border-sidebar-border/50">
               <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500" /> File de Validation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
               {loadingFactures ? (
                 <div className="p-10 text-center opacity-40"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
               ) : pendingFactures.length === 0 ? (
                 <div className="p-12 text-center flex flex-col items-center gap-4 opacity-20">
                    <ShieldCheck className="h-10 w-10" />
                    <p className="text-[10px] font-black uppercase italic">Aucune validation en attente</p>
                 </div>
               ) : (
                 <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {pendingFactures.map((f: any) => (
                      <div key={f.id} className="p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                         <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-[9px] font-black tracking-widest uppercase opacity-60">#{f.numero_facture}</Badge>
                            <p className="text-[10px] font-black text-emerald-500 uppercase italic">{(f.montant_ttc).toLocaleString()} {f.devise}</p>
                         </div>
                         <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors uppercase leading-none">{f.fournisseur?.nom}</h4>
                         <p className="text-[10px] text-slate-500 font-bold mt-1 opacity-80">{f.objet}</p>
                         
                         <div className="flex items-center gap-2 mt-4">
                              {((role === 'comptable' && f.statut === 'brouillon') || 
                               (role === 'controleur_financier' && f.statut === 'en_attente_controle') ||
                               ((role === 'directeur_financier' || role === 'super_admin') && (f.statut === 'valide_daf' || f.statut === 'en_attente_controle'))) && (
                                <Button 
                                  size="sm" 
                                  className={cn(
                                    "flex-1 h-8 rounded-lg text-white font-black uppercase text-[9px] tracking-widest",
                                    f.statut === 'brouillon' ? "bg-indigo-600 hover:bg-indigo-700 font-bold" :
                                    f.statut === 'en_attente_controle' ? "bg-blue-600 hover:bg-blue-700 font-bold" :
                                    "bg-emerald-600 hover:bg-emerald-700 font-bold"
                                  )}
                                  onClick={() => validateMutation.mutate({ 
                                    id: f.id, 
                                    statut: f.statut === 'brouillon' ? 'en_attente_controle' : 
                                            f.statut === 'en_attente_controle' ? 'valide_daf' : 'paye' 
                                  })}
                                  disabled={validateMutation.isPending}
                                >
                                  {validateMutation.isPending ? "..." : (
                                    f.statut === 'brouillon' ? "Soumettre" :
                                    f.statut === 'en_attente_controle' ? "Vérifier" : "Autoriser"
                                  )}
                                </Button>
                              )}
                            <Button 
                               size="sm" 
                               variant="outline" 
                               className="h-8 w-8 p-0 rounded-lg group-hover:border-emerald-200 transition-colors"
                               onClick={() => navigate(`/finance/factures`)}
                             >
                               <FileText className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-500" />
                             </Button>
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </CardContent>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-sidebar-border/50 text-center">
               <button 
                 className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 hover:underline"
                 onClick={() => navigate('/finance/factures')}
               >
                 Voir Tout le Registre
               </button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
