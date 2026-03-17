import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, Plus, Search, Filter, FileText, CheckCircle2, 
  XCircle, Clock, MoreHorizontal, Download, Eye, 
  Building2, ArrowRight, ShieldCheck, AlertCircle,
  FileCheck, Shield, Activity, UserCheck, Archive
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
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dossier, DossierStatus } from '@/types';

const STATUS_LABELS: Record<DossierStatus, { label: string, color: string, icon: any }> = {
  nouveau: { label: 'Nouveau', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Plus },
  en_cours_verification: { label: 'Vérification', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  analyse_technique: { label: 'Analyse Technique (DSA)', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Activity },
  analyse_administrative: { label: 'Analyse Administrative (DA)', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileCheck },
  analyse_juridique: { label: 'Analyse Juridique (DJ/C)', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Shield },
  approuve: { label: 'Approuvé (DG)', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejete: { label: 'Rejeté', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
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
      
      // Ensure we type-cast correctly and handle JSON fields
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
    const matchesTab = activeTab === 'tous' || d.statut === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleUpdateStatus = async (id: string, newStatus: DossierStatus) => {
    try {
      const updateData: any = { statut: newStatus, updated_at: new Date().toISOString() };
      
      // Assign validator based on role
      if (role?.includes('aval')) updateData.valide_par_dsa = user?.id;
      if (role?.includes('administratif')) updateData.valide_par_da = user?.id;
      if (role?.includes('juridique')) updateData.valide_par_djc = user?.id;
      
      // Final validation by DG or equivalent
      if (['directeur_general', 'directeur_adjoint', 'admin_etat', 'super_admin'].includes(role || '')) {
        updateData.valide_par_dg = user?.id;
      }

      const { error } = await supabase
        .from('dossiers')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      toast.success(`Statut mis à jour : ${STATUS_LABELS[newStatus].label}`);
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
        {/* Banner Summary */}
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
              <CardTitle className="text-3xl font-black">{dossiers.filter(d => ['analyse_technique', 'analyse_administrative', 'analyse_juridique'].includes(d.statut)).length}</CardTitle>
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

        {/* Toolbar */}
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
            {['agent_administratif', 'chef_service_administratif', 'super_admin'].includes(role || '') && (
              <Button 
                onClick={() => setIsNewDialogOpen(true)}
                className="h-11 rounded-xl bg-slate-900 hover:bg-black text-white gap-2 shadow-lg"
              >
                <Plus className="h-4 w-4" /> Enregistrer un Dossier
              </Button>
            )}
          </div>
        </div>

        {/* Workflow Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-transparent">
          <TabsList className="bg-slate-100/50 p-1 border border-slate-200 rounded-2xl mb-6 overflow-x-auto h-auto min-w-full md:min-w-0">
            <TabsTrigger value="tous" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest">Tous</TabsTrigger>
            <TabsTrigger value="nouveau" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest">Nouveaux</TabsTrigger>
            <TabsTrigger value="analyse_technique" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest">Tech (DSA)</TabsTrigger>
            <TabsTrigger value="analyse_administrative" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest">Admin (DA)</TabsTrigger>
            <TabsTrigger value="analyse_juridique" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest">Legal (DJ/C)</TabsTrigger>
            <TabsTrigger value="approuve" className="rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-widest text-emerald-600">Validés</TabsTrigger>
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
                                
                                {/* Conditional workflow actions based on current status and role */}
                                {d.statut === 'nouveau' && ['agent_administratif', 'chef_service_administratif', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-amber-600" onClick={() => handleUpdateStatus(d.id, 'analyse_technique')}>
                                    <Activity className="h-4 w-4" /> Transmettre à la DSA (Technique)
                                  </DropdownMenuItem>
                                )}

                                {d.statut === 'analyse_technique' && ['directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-indigo-600" onClick={() => handleUpdateStatus(d.id, 'analyse_administrative')}>
                                    <FileCheck className="h-4 w-4" /> Valider & Transmettre à la DA
                                  </DropdownMenuItem>
                                )}

                                {d.statut === 'analyse_administrative' && ['directeur_administratif', 'chef_service_administratif', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-purple-600" onClick={() => handleUpdateStatus(d.id, 'analyse_juridique')}>
                                    <Shield className="h-4 w-4" /> Valider & Transmettre à la DJ/C
                                  </DropdownMenuItem>
                                )}

                                {d.statut === 'analyse_juridique' && ['directeur_juridique', 'juriste', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-emerald-600" onClick={() => handleUpdateStatus(d.id, 'approuve')}>
                                    <CheckCircle2 className="h-4 w-4" /> Proposer pour Approbation Finale (DG)
                                  </DropdownMenuItem>
                                )}

                                {['analyse_technique', 'analyse_administrative', 'analyse_juridique'].includes(d.statut) && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-red-600" onClick={() => handleUpdateStatus(d.id, 'rejete')}>
                                    <XCircle className="h-4 w-4" /> Rejeter le Dossier
                                  </DropdownMenuItem>
                                )}

                                {d.statut === 'approuve' && ['gestionnaire_documentaire', 'super_admin'].includes(role || '') && (
                                  <DropdownMenuItem className="gap-2 cursor-pointer rounded-lg font-bold text-slate-600" onClick={() => handleUpdateStatus(d.id, 'archive')}>
                                    <Archive className="h-4 w-4" /> Classer & Archiver
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

      {/* Detail Modal */}
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
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg group-hover:text-indigo-600" disabled={!doc.url}>
                            {doc.url ? <Download className="h-4 w-4" /> : <XCircle className="h-4 w-4 opacity-20" />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Observations Direction</h3>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 italic text-sm text-slate-600 leading-relaxed">
                      {selectedDossier.observations || "Aucune observation particulière enregistrée pour le moment."}
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
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <Button variant="outline" className="rounded-xl px-8 font-bold" onClick={() => setIsDossierDetailOpen(false)}>Fermer</Button>
                {selectedDossier.statut === 'analyse_juridique' && role === 'directeur_juridique' && (
                   <Button className="bg-indigo-600 text-white rounded-xl px-8 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20">Transmettre pour Signature</Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Dossier Creation (Simplified for demo) */}
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
                   entite_id: '00000000-0000-0000-0000-000000000000'
                 }]);

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
    </DashboardLayout>
  );
}
