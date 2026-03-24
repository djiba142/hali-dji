import React, { useState, useEffect } from 'react';
import {
  FolderOpen, Plus, Search, Eye, Clock, CheckCircle2, XCircle, FileCheck, Shield, UserCheck, MoreHorizontal, Activity, Archive, FileText, ArrowRight, ShieldCheck, Download, Trash2, Scale, ThumbsUp, ThumbsDown, Send, FileType, ClipboardList, RotateCcw
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dossier, DossierStatus } from '@/types';
import { logUpdateResource } from '@/lib/auditLog';

const STATUS_LABELS: Record<DossierStatus, { label: string, color: string, icon: any }> = {
  nouveau: { label: 'Réception Dossier', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Plus },
  numerise: { label: 'Numérisé (Scan OK)', color: 'bg-sky-100 text-sky-700 border-sky-200', icon: FileText },
  en_attente_technique: { label: 'Audit DSA (Attente)', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Clock },
  analyse_technique_agent: { label: 'Audit DSA (Agent)', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Search },
  analyse_technique_chef: { label: 'Validation DSA (Chef)', color: 'bg-indigo-600 text-white border-indigo-100', icon: CheckCircle2 },
  complement_demande_dsa: { label: 'Complément Demandé (DSA)', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: RotateCcw },
  analyse_administrative: { label: 'Contrôle Administratif', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: FileCheck },
  analyse_juridique: { label: 'Examen Conformité', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Scale },
  signature_djc: { label: 'Signé Juridique', color: 'bg-amber-600 text-white border-amber-500', icon: ShieldCheck },
  attente_secretariat_dg: { label: 'Transmission Secrétariat', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: ClipboardList },
  pret_pour_dg: { label: 'Préparation Parachevée', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: FileCheck },
  attente_dg: { label: 'Bureau du DG (En Attente)', color: 'bg-slate-800 text-white border-slate-700', icon: UserCheck },
  signe_dg: { label: 'Signé par le DG', color: 'bg-emerald-600 text-white border-emerald-500', icon: CheckCircle2 },
  avis_dg: { label: 'Arbitrage DG / DGA', color: 'bg-slate-900 text-white border-slate-700', icon: UserCheck },
  decide_dg: { label: 'Décision DG Validée', color: 'bg-emerald-600 text-white border-emerald-500', icon: CheckCircle2 },
  decision_finale: { label: 'Transmission Finale', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Send },
  approuve: { label: 'Favorable / Délivré', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: ShieldCheck },
  rejete: { label: 'Rejeté / Refusé', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  archive: { label: 'Archivé', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Archive }
};

export default function AdminDossiersPage() {
  const { role, user } = useAuth();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('tous');
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isDossierDetailOpen, setIsDossierDetailOpen] = useState(false);
  const [newEntiteNom, setNewEntiteNom] = useState('');
  const [newEntiteType, setNewEntiteType] = useState('entreprise');
  const [newTypeDemande, setNewTypeDemande] = useState('agrement_entreprise');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [currentObservation, setCurrentObservation] = useState('');

  useEffect(() => {
    fetchDossiers();
  }, []);

  async function fetchDossiers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dossiers')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      const formattedData = (data as any[]).map(d => ({
        ...d,
        pieces_jointes: Array.isArray(d.pieces_jointes) ? d.pieces_jointes : []
      })) as Dossier[];
      
      setDossiers(formattedData);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des dossiers: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredDossiers = dossiers.filter(d => {
    const matchesSearch = d.entite_nom.toLowerCase().includes(search.toLowerCase()) || 
                         d.numero_dossier.toLowerCase().includes(search.toLowerCase());
    
    let matchesTab = activeTab === 'tous';
    if (!matchesTab) {
      if (activeTab === 'reception') matchesTab = ['nouveau', 'numerise'].includes(d.statut);
      else if (activeTab === 'dsa') matchesTab = ['en_attente_technique', 'analyse_technique_agent', 'analyse_technique_chef', 'complement_demande_dsa'].includes(d.statut);
      else if (activeTab === 'da') matchesTab = ['analyse_administrative'].includes(d.statut);
      else if (activeTab === 'juridique') matchesTab = ['analyse_juridique', 'signature_djc', 'attente_secretariat_dg'].includes(d.statut);
      else if (activeTab === 'secretariat') matchesTab = ['attente_secretariat_dg', 'pret_pour_dg', 'attente_dg'].includes(d.statut);
      else if (activeTab === 'dg_decision') matchesTab = ['attente_dg', 'signe_dg', 'avis_dg', 'decide_dg', 'decision_finale'].includes(d.statut);
      else if (activeTab === 'favorable') matchesTab = d.statut === 'approuve';
      else matchesTab = d.statut === activeTab;
    }
    
    return matchesSearch && matchesTab;
  });

  const handleUpdateStatus = async (id: string, newStatus: DossierStatus) => {
    try {
      const updateData: any = { statut: newStatus, updated_at: new Date().toISOString() };
      
      if (role === 'agent_technique_aval') updateData.valide_par_dsa = user?.id;
      if (role === 'chef_service_aval') updateData.valide_par_dsa = user?.id;
      if (role === 'chef_service_administratif' || role === 'directeur_administratif') updateData.valide_par_da = user?.id;
      if (role === 'directeur_juridique' || role === 'juriste') updateData.valide_par_djc = user?.id;
      
      if (role === 'admin_etat') {
        updateData.valide_par_etat = user?.id;
      }

      if (currentObservation) {
        if (['agent_technique_aval', 'chef_service_aval'].includes(role || '')) updateData.observation_technique = currentObservation;
        if (['chef_service_administratif', 'directeur_administratif'].includes(role || '')) updateData.observation_administrative = currentObservation;
        if (['directeur_juridique', 'juriste'].includes(role || '')) updateData.observation_juridique = currentObservation;
      }

      const { error } = await supabase
        .from('dossiers')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await logUpdateResource(
        'dossier_workflow',
        `Mise à jour du statut: ${STATUS_LABELS[newStatus].label}`,
        { nouveau_statut: newStatus, observation: currentObservation || null },
        id
      );

      toast.success(`Opération réussie : ${STATUS_LABELS[newStatus].label}`);
      setIsDossierDetailOpen(false);
      setCurrentObservation('');
      fetchDossiers();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    }
  };

  const getStatutBadge = (statut: DossierStatus) => {
    const s = STATUS_LABELS[statut] || { label: statut, color: 'bg-gray-100', icon: Clock };
    return (
      <Badge className={cn("gap-1.5 font-bold uppercase text-[9px] tracking-wider border", s.color)}>
        <s.icon className="h-3 w-3" />
        {s.label}
      </Badge>
    );
  };

  return (
    <DashboardLayout 
      title="Workflow Administratif (SIHG)" 
      subtitle="Suivi complet des agréments, licences et dossiers SONAP"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-none shadow-sm bg-blue-600 text-white overflow-hidden relative">
            <div className="absolute right-0 top-0 h-full w-24 bg-white/10 -skew-x-12 translate-x-12" />
            <CardHeader className="pb-2">
              <CardDescription className="text-blue-100 font-bold uppercase text-[10px] tracking-widest">Nouveaux / Réception</CardDescription>
              <CardTitle className="text-3xl font-black">{dossiers.filter(d => d.statut === 'nouveau').length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm bg-amber-500 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-amber-100 font-bold uppercase text-[10px] tracking-widest">En Analyse (Multi-Dir)</CardDescription>
              <CardTitle className="text-3xl font-black">{dossiers.filter(d => ['en_attente_technique', 'analyse_technique_agent', 'analyse_technique_chef', 'complement_demande_dsa', 'analyse_administrative', 'analyse_juridique', 'attente_secretariat_dg', 'pret_pour_dg', 'attente_dg', 'avis_dg', 'decision_finale'].includes(d.statut)).length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm bg-emerald-600 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-100 font-bold uppercase text-[10px] tracking-widest">Approuvés / Valides</CardDescription>
              <CardTitle className="text-3xl font-black">{dossiers.filter(d => d.statut === 'approuve').length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl border-none shadow-sm bg-slate-900 text-white">
            <CardHeader className="pb-2">
              <CardDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Archivés</CardDescription>
              <CardTitle className="text-3xl font-black">{dossiers.filter(d => d.statut === 'archive').length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Référence, entreprise ou station..." 
              className="pl-10 h-11 rounded-xl bg-white border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-11 rounded-xl bg-white gap-2 font-bold border-slate-200" onClick={fetchDossiers}>
              <Activity className={cn("h-4 w-4", loading && "animate-spin")} /> Rafraîchir
            </Button>
            {['chef_service_administratif', 'secretariat_direction'].includes(role || '') && (
              <Button 
                onClick={() => setIsNewDialogOpen(true)}
                className="h-11 rounded-xl bg-slate-900 hover:bg-black text-white gap-2 shadow-lg"
              >
                <Plus className="h-4 w-4" /> 📥 Créer dossier
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-transparent">
          <TabsList className="bg-slate-100/50 p-1 border border-slate-200 rounded-2xl mb-6 overflow-x-auto h-auto min-w-full md:min-w-0">
            <TabsTrigger value="tous" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest">Tous</TabsTrigger>
            <TabsTrigger value="reception" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest">1. Réception</TabsTrigger>
            <TabsTrigger value="dsa" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest">2. Audit DSA</TabsTrigger>
            <TabsTrigger value="da" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest">3. Admin (DA)</TabsTrigger>
            <TabsTrigger value="juridique" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest">4. Juridique</TabsTrigger>
            <TabsTrigger value="secretariat" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest text-cyan-600">5. Secrétariat</TabsTrigger>
            <TabsTrigger value="dg_decision" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest text-slate-900 border-l border-slate-200 ml-2 shadow-sm">6. Décision DG</TabsTrigger>
            <TabsTrigger value="favorable" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest text-emerald-600">Favorable</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0 focus-visible:ring-0">
            <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Référence / Date</th>
                        <th className="text-left py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Entité (Entreprise/Station)</th>
                        <th className="text-left py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Type de Demande</th>
                        <th className="text-left py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Statut Workflow</th>
                        <th className="text-right py-4 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">Chargement des dossiers...</td></tr>
                      ) : filteredDossiers.length === 0 ? (
                        <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">Aucun dossier trouvé</td></tr>
                      ) : filteredDossiers.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 tracking-tighter">{d.numero_dossier}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{new Date(d.date_soumission).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs">
                                {d.entite_nom[0]}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{d.entite_nom}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight italic">{d.entite_type}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                              {d.type_demande.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {getStatutBadge(d.statut)}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-64 rounded-xl p-2">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-50 px-2 py-1">Workflow Opérationnel</DropdownMenuLabel>
                                <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg" onClick={() => { setSelectedDossier(d); setIsDossierDetailOpen(true); }}>
                                  <Eye className="h-4 w-4 text-blue-500" /> Voir Dossier Complet
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator className="my-1" />
                                {/* 1. SECRÉTARIAT / AGENT ADMIN -> LÉGACY (Retiré pour Secretiat DG) */}
                                {/* Le rôle "agent_reception" gère l'entrée. Le Secrétariat DG est en fin de chaîne. */}

                                {/* 2. DSA AGENT -> ANALYSE */}
                                {['en_attente_technique', 'numerise'].includes(d.statut) && ['agent_technique_aval'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-indigo-400" onClick={() => handleUpdateStatus(d.id, 'analyse_technique_agent')}>
                                    <Search className="h-4 w-4" /> 🔍 Analyser
                                  </DropdownMenuItem>
                                )}
                                
                                {d.statut === 'analyse_technique_agent' && ['agent_technique_aval'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-indigo-600" onClick={() => handleUpdateStatus(d.id, 'analyse_technique_chef')}>
                                    <CheckCircle2 className="h-4 w-4" /> ✅ Soumettre au Chef Service
                                  </DropdownMenuItem>
                                )}

                                {/* 3. DSA CHEF -> VALIDATION TECHNIQUE */}
                                {d.statut === 'analyse_technique_chef' && ['chef_service_aval'].includes(role || '') && (
                                  <>
                                    <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-emerald-600" onClick={() => handleUpdateStatus(d.id, 'analyse_administrative')}>
                                      <CheckCircle2 className="h-4 w-4" /> ✅ Valider technique (Transmettre DA)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-amber-600" onClick={() => handleUpdateStatus(d.id, 'complement_demande_dsa')}>
                                      <RotateCcw className="h-4 w-4" /> 🔄 Demander Complément
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-red-600" onClick={() => handleUpdateStatus(d.id, 'rejete')}>
                                      <XCircle className="h-4 w-4" /> ❌ Rejeter techniquement
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {/* 4. DIRECTION ADMINISTRATIVE (DA) */}
                                {d.statut === 'analyse_administrative' && ['directeur_administratif', 'chef_service_administratif'].includes(role || '') && (
                                  <>
                                    <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-purple-600" onClick={() => handleUpdateStatus(d.id, 'analyse_juridique')}>
                                      <FileCheck className="h-4 w-4" /> ✅ Valider administratif
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-red-600" onClick={() => handleUpdateStatus(d.id, 'rejete')}>
                                      <XCircle className="h-4 w-4" /> ❌ Rejeter
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {/* 5. DIRECTION JURIDIQUE (DJ/C) */}
                                {d.statut === 'analyse_juridique' && ['directeur_juridique', 'juriste', 'charge_conformite'].includes(role || '') && (
                                  <>
                                    <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-amber-600" onClick={() => handleUpdateStatus(d.id, 'attente_secretariat_dg')}>
                                      <Scale className="h-4 w-4" /> ✅ Valider Légal (+ au Secrétariat DG)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-red-600" onClick={() => handleUpdateStatus(d.id, 'rejete')}>
                                      <XCircle className="h-4 w-4" /> ❌ Rejeter
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {/* 5.5 SECRÉTARIAT DG (FIN DE CHAINE) */}
                                {d.statut === 'attente_secretariat_dg' && ['secretariat_direction'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-cyan-600" onClick={() => handleUpdateStatus(d.id, 'pret_pour_dg')}>
                                    <ClipboardList className="h-4 w-4" /> 📋 Préparer pour signature (Regrouper docs)
                                  </DropdownMenuItem>
                                )}

                                {d.statut === 'pret_pour_dg' && ['secretariat_direction'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-indigo-700 bg-indigo-50" onClick={() => handleUpdateStatus(d.id, 'attente_dg')}>
                                    <Send className="h-4 w-4" /> 📤 Envoyer au DG
                                  </DropdownMenuItem>
                                )}

                                {/* 6. DIRECTION GÉNÉRALE (DG / DGA) */}
                                {d.statut === 'attente_dg' && ['directeur_general', 'directeur_adjoint', 'super_admin'].includes(role || '') && (
                                  <>
                                    <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-emerald-700" onClick={() => handleUpdateStatus(d.id, 'signe_dg')}>
                                      <CheckCircle2 className="h-4 w-4" /> ✍️ Signer & Approuver le dossier
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-red-700" onClick={() => handleUpdateStatus(d.id, 'rejete')}>
                                      <XCircle className="h-4 w-4" /> ❌ Rejeter (Signature refusée)
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {d.statut === 'avis_dg' && ['admin_etat'].includes(role || '') && (
                                  <>
                                    <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-emerald-700" onClick={() => handleUpdateStatus(d.id, 'decision_finale')}>
                                      <ThumbsUp className="h-4 w-4" /> 👍 Avis favorable
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-red-700" onClick={() => handleUpdateStatus(d.id, 'rejete')}>
                                      <ThumbsDown className="h-4 w-4" /> 👎 Avis défavorable
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-black text-slate-900 bg-slate-50 border-t border-slate-100 mt-2" onClick={() => handleUpdateStatus(d.id, 'decision_finale')}>
                                      <Send className="h-4 w-4" /> 📤 Transmettre à l’État
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {/* 7. NOTIFICATION FINALE */}
                                {d.statut === 'signe_dg' && ['secretariat_direction', 'directeur_general', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-black text-emerald-700 bg-emerald-50" onClick={() => handleUpdateStatus(d.id, 'approuve')}>
                                    <ShieldCheck className="h-4 w-4" /> 📩 NOTIFIER ENTREPRISE (Favorable)
                                  </DropdownMenuItem>
                                )}

                                {/* 7. ÉTAT -> ACTION FINALE */}
                                {d.statut === 'decision_finale' && ['admin_etat'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-black text-emerald-700 bg-emerald-50" onClick={() => handleUpdateStatus(d.id, 'approuve')}>
                                    <ShieldCheck className="h-4 w-4" /> OCTROYER LA DÉCISION FINALE (Agrément/Licence)
                                  </DropdownMenuItem>
                                )}

                                {d.statut === 'approuve' && ['gestionnaire_documentaire'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-slate-600" onClick={() => handleUpdateStatus(d.id, 'archive')}>
                                    <Archive className="h-4 w-4" /> Classer & Archiver le Dossier
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDossierDetailOpen} onOpenChange={setIsDossierDetailOpen}>
        <DialogContent className="max-w-4xl p-0 border-none rounded-[2rem] overflow-hidden shadow-2xl">
          {selectedDossier && (
            <>
              <div className="bg-slate-900 p-8 text-white relative">
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <FolderOpen className="h-8 w-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">{selectedDossier.numero_dossier}</h2>
                      <p className="text-slate-400 text-sm font-medium">{selectedDossier.entite_nom} · {selectedDossier.type_demande.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Statut Actuel</p>
                    {getStatutBadge(selectedDossier.statut)}
                  </div>
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 max-h-[60vh] overflow-y-auto">
                <div className="md:col-span-2 space-y-8">
                  <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                       <FileText className="h-3.5 w-3.5" /> Documents Justificatifs
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: 'RCCM', url: selectedDossier.rccm_url },
                        { name: 'NIF', url: selectedDossier.nif_url },
                        { name: 'Statuts', url: selectedDossier.statuts_url },
                        { name: "Autorisation d'Exploitation", url: selectedDossier.autorisation_url }
                      ].map((doc, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 group hover:border-indigo-200 hover:bg-white transition-all">
                          <span className="text-xs font-bold text-slate-600">{doc.name}</span>
                          <div className="flex items-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 rounded-lg group-hover:text-indigo-600" 
                              disabled={!doc.url}
                              onClick={() => {
                                if (doc.url) {
                                  setPreviewUrl(doc.url);
                                  setPreviewTitle(doc.name);
                                  setIsPreviewOpen(true);
                                }
                              }}
                            >
                               <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 rounded-lg group-hover:text-indigo-600" 
                              disabled={!doc.url}
                              asChild
                            >
                              <a href={doc.url || '#'} download={doc.name}>
                                {doc.url ? <Download className="h-4 w-4" /> : <XCircle className="h-4 w-4 opacity-20" />}
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">📜 Historique des Observations</h3>
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 italic text-[11px] text-slate-600">
                        <p className="font-black uppercase text-[8px] text-indigo-400 not-italic mb-1">DSA (Technique) :</p>
                        {selectedDossier.observation_technique || "En attente d'analyse..."}
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 italic text-[11px] text-slate-600">
                        <p className="font-black uppercase text-[8px] text-purple-400 not-italic mb-1">DA (Administratif) :</p>
                        {selectedDossier.observation_administrative || "En attente de contrôle..."}
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 italic text-[11px] text-slate-600">
                        <p className="font-black uppercase text-[8px] text-amber-400 not-italic mb-1">DJ/C (Juridique) :</p>
                        {selectedDossier.observation_juridique || "En attente d'examen légal..."}
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 italic text-[11px] text-slate-600">
                        <p className="font-black uppercase text-[8px] text-slate-900 not-italic mb-1">DG (Direction Générale) :</p>
                        {selectedDossier.observation_dg || "En attente d'arbitrage..."}
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100">
                    <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-3">Workflow Intelligence</h4>
                    <div className="space-y-4">
                       <div className="flex items-start gap-2">
                         <div className={cn("h-4 w-4 rounded-full mt-0.5", selectedDossier.valide_par_dsa ? "bg-emerald-500" : "bg-slate-200")} />
                         <div>
                           <p className="text-[11px] font-black text-slate-900 leading-none">DSA (Technique)</p>
                           <p className="text-[9px] text-slate-500 mt-1">{selectedDossier.valide_par_dsa ? 'Validé' : 'En attente'}</p>
                         </div>
                       </div>
                       <div className="flex items-start gap-2">
                         <div className={cn("h-4 w-4 rounded-full mt-0.5", selectedDossier.valide_par_da ? "bg-emerald-500" : "bg-slate-200")} />
                         <div>
                           <p className="text-[11px] font-black text-slate-900 leading-none">DA (Administratif)</p>
                           <p className="text-[9px] text-slate-500 mt-1">{selectedDossier.valide_par_da ? 'Validé' : 'En attente'}</p>
                         </div>
                       </div>
                       <div className="flex items-start gap-2">
                         <div className={cn("h-4 w-4 rounded-full mt-0.5", selectedDossier.valide_par_djc ? "bg-emerald-500" : "bg-slate-200")} />
                         <div>
                           <p className="text-[11px] font-black text-slate-900 leading-none">DJ/C (Juridique)</p>
                           <p className="text-[9px] text-slate-500 mt-1">{selectedDossier.valide_par_djc ? 'Validé' : 'En attente'}</p>
                         </div>
                       </div>
                     </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                      <div>
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ajouter mon observation</Label>
                       <textarea 
                        className="w-full mt-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs min-h-[100px] focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        placeholder={role === 'agent_technique_aval' ? "Ex: Capacité stockage (OK: X m3). Nombre de stations (OK: Y). Moyens de transport (OK). Cohérence (OK)." : "Tapez vos remarques ici avant de valider..."}
                        value={currentObservation}
                        onChange={(e) => setCurrentObservation(e.target.value)}
                       />
                     </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-3">
                <Button variant="ghost" className="rounded-xl font-bold text-slate-500" onClick={() => { setIsDossierDetailOpen(false); setCurrentObservation(''); }}>Fermer</Button>
                
                {selectedDossier.statut === 'nouveau' && ['secretariat_direction'].includes(role || '') && (
                  <Button className="bg-blue-600 text-white rounded-xl font-bold px-6" onClick={() => handleUpdateStatus(selectedDossier.id, 'numerise')}>✅ Marquer "Numérisé"</Button>
                )}

                {selectedDossier.statut === 'numerise' && ['secretariat_direction'].includes(role || '') && (
                  <Button className="bg-sky-600 text-white rounded-xl font-bold px-6" onClick={() => handleUpdateStatus(selectedDossier.id, 'en_attente_technique')}>➡️ Transmettre à la DSA</Button>
                )}

                {['en_attente_technique', 'numerise'].includes(selectedDossier.statut) && ['agent_technique_aval'].includes(role || '') && (
                  <Button className="bg-indigo-400 text-white rounded-xl font-bold px-6" onClick={() => handleUpdateStatus(selectedDossier.id, 'analyse_technique_agent')}>🔍 Analyser</Button>
                )}

                {selectedDossier.statut === 'analyse_technique_agent' && ['agent_technique_aval'].includes(role || '') && (
                  <Button className="bg-indigo-600 text-white rounded-xl font-bold px-6" onClick={() => handleUpdateStatus(selectedDossier.id, 'analyse_technique_chef')}>✅ Soumettre au Chef Service</Button>
                )}

                {selectedDossier.statut === 'analyse_technique_chef' && ['chef_service_aval'].includes(role || '') && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-red-200 text-red-600 rounded-xl font-bold" onClick={() => handleUpdateStatus(selectedDossier.id, 'rejete')}>❌ Rejeter</Button>
                    <Button variant="outline" className="border-amber-200 text-amber-600 rounded-xl font-bold" onClick={() => handleUpdateStatus(selectedDossier.id, 'complement_demande_dsa')}>🔄 Complément</Button>
                    <Button className="bg-emerald-600 text-white rounded-xl font-bold px-6" onClick={() => handleUpdateStatus(selectedDossier.id, 'analyse_administrative')}>✅ Valider technique</Button>
                  </div>
                )}

                {selectedDossier.statut === 'analyse_administrative' && ['directeur_administratif', 'chef_service_administratif'].includes(role || '') && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-red-200 text-red-600 rounded-xl font-bold" onClick={() => handleUpdateStatus(selectedDossier.id, 'rejete')}>❌ Rejeter</Button>
                    <Button className="bg-purple-600 text-white rounded-xl font-bold px-6" onClick={() => handleUpdateStatus(selectedDossier.id, 'analyse_juridique')}>✅ Valider administratif</Button>
                  </div>
                )}

                {selectedDossier.statut === 'analyse_juridique' && ['directeur_juridique', 'juriste', 'charge_conformite'].includes(role || '') && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="border-red-200 text-red-600 rounded-xl font-bold" onClick={() => handleUpdateStatus(selectedDossier.id, 'rejete')}>❌ Rejeter</Button>
                    <Button className="bg-amber-600 text-white rounded-xl font-bold px-6" onClick={() => handleUpdateStatus(selectedDossier.id, 'signature_djc')}>✅ Signer & Transmettre Secrétariat</Button>
                  </div>
                )}

                {selectedDossier.statut === 'signature_djc' && ['secretariat_direction'].includes(role || '') && (
                  <div className="flex gap-2">
                    <Button className="bg-cyan-600 text-white rounded-xl font-bold px-6" onClick={() => handleUpdateStatus(selectedDossier.id, 'pret_pour_dg')}>📂 Préparer pour DG (Prêt)</Button>
                  </div>
                )}

                {['pret_pour_dg', 'avis_dg'].includes(selectedDossier.statut) && ['admin_etat'].includes(role || '') && (
                  <div className="flex gap-3">
                    <Button variant="outline" className="border-red-200 text-red-700 rounded-xl font-bold" onClick={() => handleUpdateStatus(selectedDossier.id, 'rejete')}>👎 Avis défavorable</Button>
                    <Button className="bg-emerald-700 text-white rounded-xl font-bold px-6" onClick={() => handleUpdateStatus(selectedDossier.id, 'decide_dg')}>👍 Valider Décision</Button>
                    <Button className="bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest px-6" onClick={() => handleUpdateStatus(selectedDossier.id, 'decision_finale')}>📤 Transmettre État (Clôture)</Button>
                  </div>
                )}

                {selectedDossier.statut === 'decision_finale' && ['admin_etat'].includes(role || '') && (
                  <Button className="bg-emerald-600 text-white rounded-xl font-black text-[11px] uppercase px-8" onClick={() => handleUpdateStatus(selectedDossier.id, 'approuve')}>OCTROYER DÉCISION FINALE</Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-w-xl p-8 rounded-[2rem]">
          <DialogHeader>
             <DialogTitle className="text-2xl font-black">ENREGISTREMENT DOSSIER</DialogTitle>
             <DialogDescription>Initialisation manuelle par l'Agent Administratif</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase tracking-widest">Nom de l'Entité</Label>
               <Input 
                 placeholder="Ex: Shell Guinea SARL" 
                 className="rounded-xl" 
                 value={newEntiteNom}
                 onChange={(e) => setNewEntiteNom(e.target.value)}
               />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest">Type</Label>
                 <Select value={newEntiteType} onValueChange={setNewEntiteType}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="entreprise">Entreprise</SelectItem>
                       <SelectItem value="station">Station-Service</SelectItem>
                    </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest">Demande</Label>
                 <Select value={newTypeDemande} onValueChange={setNewTypeDemande}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                       <SelectItem value="ouverture_station">Ouverture Station</SelectItem>
                       <SelectItem value="agrement_entreprise">Agrément</SelectItem>
                       <SelectItem value="renouvellement_licence">Licence</SelectItem>
                    </SelectContent>
                 </Select>
               </div>
             </div>
          </div>
          <DialogFooter>
             <Button variant="ghost" onClick={() => setIsNewDialogOpen(false)}>Annuler</Button>
             <Button 
               className="bg-slate-900 text-white rounded-xl px-8" 
               onClick={async () => {
                 if (!newEntiteNom) return toast.error("Le nom est requis");
                 
                 const { error } = await supabase.from('dossiers').insert([{
                   numero_dossier: `SIHG-DA-${Math.floor(Math.random()*9000)+1000}`,
                   entite_nom: newEntiteNom,
                   entite_type: newEntiteType,
                   type_demande: newTypeDemande,
                   statut: 'nouveau',
                   entite_id: null
                 } as any]);

                 if (error) toast.error(error.message);
                 else {
                   toast.success("Dossier enregistré !");
                   setIsNewDialogOpen(false);
                   setNewEntiteNom('');
                   setNewEntiteType('entreprise');
                   setNewTypeDemande('agrement_entreprise');
                   fetchDossiers();
                 }
               }}
             >
               Créer le Dossier
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col rounded-3xl overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <FileType className="h-5 w-5 text-indigo-400" />
                 </div>
                 <div>
                    <DialogTitle className="text-lg font-black uppercase tracking-tight">{previewTitle}</DialogTitle>
                    <DialogDescription className="text-xs text-slate-400 font-medium italic">Prévisualisation sécurisée du document SIHG</DialogDescription>
                 </div>
              </div>
              <Button variant="ghost" onClick={() => setIsPreviewOpen(false)} className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl">Fermer</Button>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-slate-100 flex items-center justify-center p-4">
            {previewUrl?.toLowerCase().endsWith('.pdf') ? (
              <iframe src={previewUrl} className="w-full h-full rounded-2xl border border-slate-200 shadow-inner" title="PDF Preview" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-inner p-8 overflow-hidden">
                 <img src={previewUrl || ''} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg shadow-lg" />
              </div>
            )}
          </div>
          <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
             <Button variant="outline" className="rounded-xl font-bold" asChild>
                <a href={previewUrl || '#'} target="_blank" rel="noopener noreferrer">Ouvrir dans un nouvel onglet</a>
             </Button>
             <Button variant="outline" className="rounded-xl font-bold" onClick={() => setIsPreviewOpen(false)}>Quitter la vue</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
