import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Building2, CheckCircle2, Clock, Search,
    RefreshCw, FolderOpen, ClipboardCheck, AlertCircle, Eye,
    Users, MapPin, Calendar, Plus, Download, ChevronRight,
    UserPlus, Shield, Briefcase, Activity, Fuel
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notifyStationStatusUpdate } from '@/lib/notifications';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { generateCustomReportPDF } from '@/lib/pdfExport';
import { generateExcelReport } from '@/lib/excelExport';

interface EntrepriseDoc {
    id: string;
    nom: string;
    sigle: string;
    type: string;
    numero_agrement: string;
    region: string;
    statut: string;
    contact_nom: string | null;
    contact_email: string | null;
    contact_telephone: string | null;
    created_at: string;
    documents_expires?: number;
}

interface Gestionnaire {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    entreprise_nom?: string;
    station_nom?: string;
}

export default function DashboardAdministratif() {
    const { role, profile } = useAuth();
    const navigate = useNavigate();
    
    const handleAdminValidate = async (station: any) => {
        const adminRoles: AppRole[] = ['directeur_administratif', 'chef_service_administratif', 'super_admin'];
        if (!adminRoles.includes(role as AppRole)) {
            toast.error("Votre rôle ne permet pas la validation des dossiers administratifs.");
            return;
        }

        try {
            const { error } = await supabase
                .from('stations')
                .update({ statut: 'attente_djc' }) // Next: Legal (DJ/C)
                .eq('id', station.id);
            
            if (error) throw error;
            
            await notifyStationStatusUpdate(station, 'attente_djc');
            toast.success(`Validation Administrative effectuée pour ${station.nom}`);
            fetchData();
        } catch (err: any) {
            console.error(err);
            toast.error("Erreur lors de la validation administrative.");
        }
    };

    const [entreprises, setEntreprises] = useState<EntrepriseDoc[]>([]);
    const [gestionnaires, setGestionnaires] = useState<Gestionnaire[]>([]);
    const [allStations, setAllStations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('dossiers');
    const [selectedEntreprise, setSelectedEntreprise] = useState<EntrepriseDoc | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: entData } = await supabase.from('entreprises').select('*').order('nom');
            // Adding mock data for documents_expires
            const enrichedData = (entData || []).map(e => ({
                ...e,
                documents_expires: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0
            }));
            setEntreprises(enrichedData as EntrepriseDoc[]);

            const { data: gestData } = await supabase
                .from('profiles')
                .select(`
                    id, user_id, full_name, email, phone,
                    entreprise:entreprises(nom),
                    station:stations(nom)
                `)
                .or('entreprise_id.not.is.null,station_id.not.is.null');

            const formattedGest = (gestData || []).map((g: any) => ({
                id: g.id,
                full_name: g.full_name,
                email: g.email,
                phone: g.phone,
                entreprise_nom: g.entreprise?.nom,
                station_nom: g.station?.nom
            }));
            setGestionnaires(formattedGest);

            // Fetch all stations for the new tab
            const { data: stationsData } = await (supabase as any)
                .from('stations')
                .select('*, entreprise:entreprises(nom)')
                .order('nom');
            setAllStations(stationsData || []);

        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredEntreprises = useMemo(() => {
        return entreprises.filter(e =>
            !searchQuery ||
            e.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.sigle.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.numero_agrement.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [entreprises, searchQuery]);

    const statusColor = (statut: string) => {
        if (statut === 'actif') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (statut === 'suspendu') return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-red-100 text-red-700 border-red-200';
    };

    const handleViewDetails = (entreprise: EntrepriseDoc) => {
        setSelectedEntreprise(entreprise);
        setIsDetailOpen(true);
    };

    const entrepriseStations = useMemo(() => {
        if (!selectedEntreprise) return [];
        return allStations.filter(s => s.entreprise_id === selectedEntreprise.id);
    }, [selectedEntreprise, allStations]);

    const handleExportPDF = async () => {
        try {
            await generateCustomReportPDF({
                type: 'stock-national', 
                title: 'RÉPERTOIRE DES ENTREPRISES PÉTROLIÈRES - SIHG',
                data: {
                    stats_globales: {
                        total_stations: allStations.length,
                        entreprises: entreprises.length,
                        conformite: Math.round((entreprises.filter(e => !e.documents_expires).length / entreprises.length) * 100)
                    },
                    entreprises: entreprises.map(e => ({
                        nom: e.nom,
                        sigle: e.sigle,
                        numero_agrement: e.numero_agrement,
                        statut: e.statut,
                        region: e.region
                    }))
                },
                signerRole: role || 'directeur_administratif',
                signerName: profile?.full_name || 'Direction Administrative'
            });
        } catch (error) {
            console.error('PDF Export Error:', error);
        }
    };

    const handleExportExcel = async () => {
        try {
            const headers = ['Entreprise', 'Sigle', 'Type', 'Numéro Agrément', 'Région', 'Statut', 'Contact'];
            const data = entreprises.map(e => [
                e.nom,
                e.sigle || '-',
                e.type,
                e.numero_agrement,
                e.region,
                e.statut,
                e.contact_nom || '-'
            ]);

            await generateExcelReport({
                title: 'BASE DE DONNÉES ADMINISTRATIVE DES ENTREPRISES',
                filename: 'entreprises_sihg.xlsx',
                headers,
                data,
                signerRole: role || 'directeur_administratif',
                signerName: profile?.full_name || 'Direction Administrative'
            });
        } catch (error) {
            console.error('Excel Export Error:', error);
        }
    };

    return (
        <DashboardLayout
            title="Direction Administrative"
            subtitle="Gérer les aspects administratifs et réglementaires du secteur pétrolier"
        >
            <div className="flex items-center gap-1.5 mb-6">
                <span className="h-2 w-4 bg-[#CE1126] rounded-sm" />
                <span className="h-2 w-4 bg-[#FCD116] rounded-sm" />
                <span className="h-2 w-4 bg-[#00944D] rounded-sm" />
            </div>

            {/* Bandeau droits d'accès */}
            <div className="mb-6 p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                    <p className="text-xs font-bold text-blue-800 uppercase italic tracking-tight">Autorité de Gestion Administrative & Réglementaire</p>
                    <p className="text-[10px] text-blue-600 mt-0.5">Accès : Entreprises, Agréments, Licences et Documents Réglementaires. Cette direction ne gère pas la logistique ni les stocks.</p>
                </div>
            </div>

            {/* KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <StatCard title="Entreprises Pétrolières" value={entreprises.length} subtitle={`${entreprises.filter(e => e.statut === 'actif').length} dossiers actifs`} icon={Building2} />
                <StatCard title="Agréments & Licences" value={allStations.length} subtitle="Titres en cours de validité" icon={Briefcase} variant="primary" />
                <StatCard title="Documents Archivés" value={411} subtitle="Registres numériques" icon={FileText} />
            </div>

            <Tabs defaultValue="dossiers" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <TabsList className="bg-slate-100/50 p-1 rounded-xl">
                        <TabsTrigger value="dossiers" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                            <FolderOpen className="h-4 w-4" />
                            Entreprises
                        </TabsTrigger>
                        <TabsTrigger value="validation" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs flex gap-2">
                            <ClipboardCheck className="h-4 w-4" />
                            Validation (DA)
                            <Badge variant="outline" className="bg-amber-100/50 text-amber-700 border-amber-200 text-[10px] px-1 h-4">
                                {allStations.filter(s => s.statut === 'attente_da').length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="workflow" 
                            className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs"
                            onClick={() => navigate('/administratif/dossiers')}
                        >
                            <FolderOpen className="h-4 w-4 text-primary" />
                            Workflow Dossiers
                        </TabsTrigger>
                        <TabsTrigger value="gestionnaires" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                            <Users className="h-4 w-4" />
                            Responsables
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                            <FileText className="h-4 w-4" />
                            Documents
                        </TabsTrigger>
                        <TabsTrigger value="suivi" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                            <Activity className="h-4 w-4" />
                            Historique
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                        {['agent_administratif', 'chef_service_administratif', 'directeur_administratif', 'super_admin'].includes(role || '') && (
                            <Button size="sm" className="gap-2 bg-slate-900 text-white font-bold h-9" onClick={() => navigate('/entreprises')}>
                                <Plus className="h-4 w-4" />
                                Nouvelle Entreprise
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-9 gap-2 font-bold border-slate-200">
                            <Download className="h-3.5 w-3.5 text-emerald-600" />
                            Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-9 gap-2 font-bold border-slate-200">
                            <FileText className="h-3.5 w-3.5 text-red-600" />
                            PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="shrink-0 h-9 w-9 p-0 border-slate-200">
                            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {/* TAB: Validation DA */}
                <TabsContent value="validation" className="space-y-4">
                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-amber-50/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ClipboardCheck className="h-5 w-5 text-amber-600" />
                                Dossiers en attente de validation administrative (DA)
                            </CardTitle>
                            <CardDescription>Étape de vérification administrative après validation technique DSA</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/20">
                                            <th className="text-left py-4 px-6 text-[10px] uppercase font-black text-muted-foreground">Installation</th>
                                            <th className="text-left py-4 px-4 text-[10px] uppercase font-black text-muted-foreground">Région/Ville</th>
                                            <th className="text-left py-4 px-4 text-[10px] uppercase font-black text-muted-foreground">Entreprise</th>
                                            <th className="text-right py-4 px-6 text-[10px] uppercase font-black text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {allStations.filter(s => s.statut === 'attente_da').length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-20 text-center text-muted-foreground italic">Aucun dossier en attente (DA)</td>
                                            </tr>
                                        ) : (
                                            allStations.filter(s => s.statut === 'attente_da').map(s => (
                                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-4 px-6 font-bold">{s.nom}</td>
                                                    <td className="py-4 px-4">{s.region} / {s.ville}</td>
                                                    <td className="py-4 px-4 font-black text-indigo-600">{s.entreprise?.nom}</td>
                                                    <td className="py-4 px-6 text-right">
                                                        <Button 
                                                            onClick={() => handleAdminValidate(s)}
                                                            className="h-8 bg-indigo-600 hover:bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20"
                                                        >
                                                            Valider Admin (DA)
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Gestionnaires */}
                <TabsContent value="gestionnaires" className="space-y-4">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Responsables & Gestionnaires Référencés</CardTitle>
                            <CardDescription>Annuaire des contacts opérationnels par entreprise</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/20">
                                            <th className="text-left py-4 px-6 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Nom Complet</th>
                                            <th className="text-left py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Organisation</th>
                                            <th className="text-left py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Installation</th>
                                            <th className="text-left py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Contacts officiels</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {gestionnaires.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-muted-foreground">
                                                    Aucun responsable identifié
                                                </td>
                                            </tr>
                                        ) : (
                                            gestionnaires.map(g => (
                                                <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-4 px-6">
                                                        <div className="font-bold text-slate-900">{g.full_name}</div>
                                                        <div className="text-[9px] text-muted-foreground font-mono">UID: {g.id.substring(0, 8)}</div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-medium">
                                                            {g.entreprise_nom || 'Interne'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-4 px-4 text-slate-600 font-medium">
                                                        {g.station_nom || 'Siège Social'}
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="text-xs font-medium">{g.email}</div>
                                                        <div className="text-[10px] text-primary">{g.phone || 'N/A'}</div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Dossiers Entreprises */}
                <TabsContent value="dossiers" className="space-y-4">
                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 pb-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg">Registre des Entreprises Pétrolières</CardTitle>
                                    <CardDescription>Consultation et vérification administrative des opérateurs</CardDescription>
                                </div>
                                <div className="relative w-full md:w-[350px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Filtrer par nom, sigle ou agrément..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 h-10 bg-white border-slate-200"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/20">
                                            <th className="text-left py-4 px-6 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Entreprise</th>
                                            <th className="text-left py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Numéro Agrément</th>
                                            <th className="text-left py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Région</th>
                                            <th className="text-center py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Statut</th>
                                            <th className="text-center py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Conformité</th>
                                            <th className="text-right py-4 px-6 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Détails</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredEntreprises.map(e => (
                                            <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 shrink-0 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-primary font-black shadow-sm group-hover:scale-110 transition-transform">
                                                            {e.sigle?.[0] || e.nom[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 leading-tight">{e.nom}</p>
                                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter mt-0.5">{e.type}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 font-mono text-[11px] text-slate-500">{e.numero_agrement}</td>
                                                <td className="py-4 px-4 text-slate-600 font-medium">{e.region}</td>
                                                <td className="py-4 px-4 text-center">
                                                    <Badge className={cn("text-[9px] font-black uppercase tracking-tighter", statusColor(e.statut))} variant="outline">{e.statut}</Badge>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    {e.documents_expires && e.documents_expires > 0 ? (
                                                        <div className="flex flex-col items-center">
                                                            <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] animate-pulse">
                                                                {e.documents_expires}
                                                            </Badge>
                                                            <span className="text-[9px] text-destructive font-bold mt-1">Expiré</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center">
                                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" strokeWidth={3} />
                                                            <span className="text-[9px] text-emerald-600 font-bold mt-1">Valide</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(e)} className="h-8 group-hover:bg-primary group-hover:text-white transition-all">
                                                        <Search className="h-3.5 w-3.5 mr-2" />
                                                        Fiche
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* MODAL: FICHE ADMINISTRATIVE DÉTAILLÉE */}
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 flex flex-col gap-0 border-none rounded-2xl shadow-2xl">
                        {selectedEntreprise && (
                            <>
                                <header className="bg-slate-900 text-white p-8 relative overflow-hidden shrink-0">
                                    <div className="absolute top-0 right-0 w-[40%] h-full bg-primary/20 -skew-x-12 transform translate-x-1/2" />
                                    <div className="relative z-10 flex items-center gap-6">
                                        <div className="h-24 w-24 bg-white rounded-2xl border-4 border-white/20 shadow-2xl flex items-center justify-center text-slate-900 text-3xl font-black">
                                            {selectedEntreprise.sigle?.[0] || selectedEntreprise.nom[0]}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h2 className="text-3xl font-black leading-tight">{selectedEntreprise.nom}</h2>
                                                <Badge className={cn("uppercase tracking-widest", statusColor(selectedEntreprise.statut))}>
                                                    {selectedEntreprise.statut}
                                                </Badge>
                                            </div>
                                            <p className="text-white/60 text-sm font-medium tracking-wide">Agrément N° : <span className="font-mono text-white">{selectedEntreprise.numero_agrement}</span> · Région {selectedEntreprise.region}</p>
                                        </div>
                                    </div>
                                </header>

                                <div className="flex-1 overflow-y-auto p-8">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-1 space-y-6">
                                            <section>
                                                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-4">Informations Dossier</h3>
                                                <div className="space-y-4">
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                        <Label className="text-[10px] text-muted-foreground uppercase">Type d'Acteur</Label>
                                                        <p className="font-bold text-slate-900 capitalize">{selectedEntreprise.type === 'compagnie' ? 'Compagnie Importatrice' : 'Distributeur Agréé'}</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                        <Label className="text-[10px] text-muted-foreground uppercase">Sigle</Label>
                                                        <p className="font-bold text-slate-900">{selectedEntreprise.sigle || '-'}</p>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>

                                        <div className="lg:col-span-2 space-y-8">
                                            <section>
                                                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-4">Documents Réglementaires</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {[
                                                        { label: "Agrément d'exploitation", date: "31/12/2026", type: "PDF", status: "ok" },
                                                        { label: "Licence de Distribution", date: "15/06/2025", type: "PDF", status: "expiring" },
                                                        { label: "Certificat de Conformité", date: "01/01/2027", type: "IMAGE", status: "ok" },
                                                        { label: "Assurance Professionnelle", date: "12/11/2024", type: "PDF", status: "expired" }
                                                    ].map((doc, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                                                    <FileText className="h-4 w-4 text-slate-400" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-bold text-slate-900 leading-tight">{doc.label}</p>
                                                                    <p className="text-[9px] text-muted-foreground">Expire le : {doc.date}</p>
                                                                </div>
                                                            </div>
                                                            <Badge className={cn("h-4 w-4 rounded-full p-0 flex items-center justify-center border-none", 
                                                                doc.status === 'ok' ? 'bg-emerald-500' : doc.status === 'expiring' ? 'bg-amber-500' : 'bg-red-500')}>
                                                                <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        </div>
                                    </div>
                                </div>

                                <footer className="bg-slate-50 p-6 border-t border-slate-100 flex justify-end shrink-0">
                                    <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="rounded-xl px-8">Fermer</Button>
                                </footer>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* TAB: DOCUMENTS */}
                <TabsContent value="documents" className="space-y-6">
                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-indigo-600" />
                                Référentiel des Documents Réglementaires
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                                {[
                                    { name: "Agréments d'importation", count: 42, color: "blue" },
                                    { name: "Licences de Distribution", count: 128, color: "emerald" },
                                    { name: "Dossiers Entreprises", count: 85, color: "indigo" }
                                ].map((doc, i) => (
                                    <div key={i} className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg transition-all group">
                                        <div className={`h-12 w-12 rounded-xl bg-${doc.color}-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                            <FolderOpen className={`h-6 w-6 text-${doc.color}-600`} />
                                        </div>
                                        <h3 className="font-bold text-slate-900 mb-1">{doc.name}</h3>
                                        <p className="text-2xl font-black text-slate-900">{doc.count}</p>
                                        <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest font-bold">Dernière archive: Aujourd'hui</p>
                                    </div>
                                ))}
                             </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Historique */}
                <TabsContent value="suivi">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="h-5 w-5 text-emerald-500" />
                                Historique Administratif
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[
                                    { action: "Validation Administrative", target: "Station Bambeto - Vivo", date: "Il y a 10 min", user: "Chef Service Admin" },
                                    { action: "Nouvelle Entreprise", target: "Guinea Oil Corp", date: "Il y a 1h", user: "Agent Admin" },
                                    { action: "Mise à jour Licence", target: "TotalEnergies", date: "Ce matin", user: "Gestionnaire Doc" }
                                ].map((log, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 transition-all hover:bg-white hover:shadow-sm">
                                        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-primary border border-slate-100">
                                            <Shield className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="font-bold text-slate-900">{log.action}</p>
                                                <span className="text-[10px] text-muted-foreground font-medium">{log.date}</span>
                                            </div>
                                            <p className="text-xs text-slate-500">{log.target} · <span className="text-primary font-bold">{log.user}</span></p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </DashboardLayout>
    );
}
