import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
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

export default function DashboardPersonnelAdmin() {
    const handleAdminValidate = async (station: any) => {
        try {
            const { error } = await supabase
                .from('stations')
                .update({ statut: 'attente_djc' }) // Next: Legal (DJ/C)
                .eq('id', station.id);
            
            if (error) throw error;
            
            await notifyStationStatusUpdate(station, 'attente_djc');
            toast.success(`Validation DLA effectuée pour ${station.nom}`);
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
            const { data: stationsData } = await supabase
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
                signerRole: 'personnel_admin'
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
                signerRole: 'personnel_admin'
            });
        } catch (error) {
            console.error('Excel Export Error:', error);
        }
    };

    return (
        <DashboardLayout
            title="Personnel Administratif — Direction Logistique et Administration"
            subtitle="Gestion documentaire, dossiers réglementaires et conformité du secteur pétrolier"
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
                    <p className="text-xs font-bold text-blue-800 uppercase italic tracking-tight">Autorité de Gestion Documentaire & Conformité Administative</p>
                    <p className="text-[10px] text-blue-600 mt-0.5">Accès restreint : Archivage, suivi des agréments et visualisation du patrimoine technique. Modification des opérations et accès financier non autorisés.</p>
                </div>
            </div>

            {/* KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <StatCard title="Entreprises Pétrolières" value={entreprises.length} subtitle={`${entreprises.filter(e => e.statut === 'actif').length} dossiers actifs`} icon={Building2} />
                <StatCard title="Patrimoine Stations" value={allStations.length} subtitle="Installations vérifiées" icon={Fuel} variant="primary" />
                <StatCard title="Dossiers Documents" value={411} subtitle="Titres & Actes enregistrés" icon={FileText} />
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
                            Dossiers (DLA)
                            <Badge variant="outline" className="bg-amber-100/50 text-amber-700 border-amber-200 text-[10px] px-1 h-4">
                                {allStations.filter(s => s.statut === 'attente_dla').length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="gestionnaires" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                            <Users className="h-4 w-4" />
                            Responsables
                        </TabsTrigger>
                        <TabsTrigger value="stations" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                            <MapPin className="h-4 w-4" />
                            Installations
                        </TabsTrigger>
                        <TabsTrigger value="suivi" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                            <Activity className="h-4 w-4" />
                            Suivi Administratif
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                            <FileText className="h-4 w-4" />
                            Référentiel Documents
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
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

                {/* TAB: Validation DLA */}
                <TabsContent value="validation" className="space-y-4">
                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-amber-50/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ClipboardCheck className="h-5 w-5 text-amber-600" />
                                Dossiers en attente de validation administrative
                            </CardTitle>
                            <CardDescription>Étape 2 : Vérification du dossier DLA après validation technique DSA</CardDescription>
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
                                        {allStations.filter(s => s.statut === 'attente_dla').length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-20 text-center text-muted-foreground italic">Aucun dossier en attente (DLA)</td>
                                            </tr>
                                        ) : (
                                            allStations.filter(s => s.statut === 'attente_dla').map(s => (
                                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-4 px-6 font-bold">{s.nom}</td>
                                                    <td className="py-4 px-4">{s.region} / {s.ville}</td>
                                                    <td className="py-4 px-4 font-black text-indigo-600">{s.entreprise?.nom}</td>
                                                    <td className="py-4 px-6 text-right">
                                                        <Button 
                                                            onClick={() => handleAdminValidate(s)}
                                                            className="h-8 bg-indigo-600 hover:bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20"
                                                        >
                                                            Valider Admin (DLA)
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
                            <CardDescription>Annuaire des contacts opérationnels par entreprise et station</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/20">
                                            <th className="text-left py-4 px-6 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Nom Complet</th>
                                            <th className="text-left py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Organisation rattachée</th>
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

                {/* TAB: Stations */}
                <TabsContent value="stations" className="space-y-4">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Cadastre National des Installations</CardTitle>
                            <CardDescription>Vérification de la structure technique des points de vente</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/20">
                                            <th className="text-left py-4 px-6 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Désignation</th>
                                            <th className="text-left py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Entreprise</th>
                                            <th className="text-left py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Zone</th>
                                            <th className="text-center py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Pompes</th>
                                            <th className="text-right py-4 px-6 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Statut d'exploitation</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {allStations.map(s => (
                                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="font-bold text-slate-900">{s.nom}</div>
                                                    <div className="text-[9px] font-mono text-muted-foreground">CODE: {s.code}</div>
                                                </td>
                                                <td className="py-4 px-4 text-xs font-bold text-primary">{s.entreprise?.nom || '-'}</td>
                                                <td className="py-4 px-4 text-xs text-muted-foreground">{s.ville} ({s.region})</td>
                                                <td className="py-4 px-4 text-center font-mono">
                                                    {s.nombre_pompes || 2}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <Badge className={cn("text-[9px] font-black uppercase tracking-widest",
                                                        s.statut === 'ouverte' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                                                    )} variant="outline">
                                                        {s.statut}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
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
                                    <CardTitle className="text-lg">Archivage des Entreprises</CardTitle>
                                    <CardDescription>Consultation et vérification administrative des entreprises opérant en Guinée</CardDescription>
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
                                                        Consulter
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
                                                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-4">Informations Générales</h3>
                                                <div className="space-y-4">
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                        <Label className="text-[10px] text-muted-foreground uppercase">Type d'Acteur</Label>
                                                        <p className="font-bold text-slate-900 capitalize">{selectedEntreprise.type === 'compagnie' ? 'Compagnie Importatrice' : 'Distributeur Agréé'}</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                        <Label className="text-[10px] text-muted-foreground uppercase">Sigle Commercial</Label>
                                                        <p className="font-bold text-slate-900">{selectedEntreprise.sigle || '-'}</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                        <Label className="text-[10px] text-muted-foreground uppercase">Date de Création (SIHG)</Label>
                                                        <p className="font-bold text-slate-900">{new Date(selectedEntreprise.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <section>
                                                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-4">Contact Responsable</h3>
                                                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                                                    <p className="font-bold text-slate-900">{selectedEntreprise.contact_nom || 'Non renseigné'}</p>
                                                    <div className="mt-2 space-y-1">
                                                        <p className="text-xs text-primary flex items-center gap-2">
                                                            <Activity className="h-3 w-3" /> {selectedEntreprise.contact_telephone || 'N/A'}
                                                        </p>
                                                        <p className="text-xs text-slate-500 truncate">{selectedEntreprise.contact_email || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>

                                        <div className="lg:col-span-2 space-y-8">
                                            <section>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Installations rattachées ({entrepriseStations.length})</h3>
                                                </div>
                                                <div className="border border-slate-100 rounded-xl overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-slate-50">
                                                            <tr>
                                                                <th className="text-left py-3 px-4 font-bold text-[9px] uppercase text-slate-500">Installation</th>
                                                                <th className="text-left py-3 px-4 font-bold text-[9px] uppercase text-slate-500">Type / Ville</th>
                                                                <th className="text-right py-3 px-4 font-bold text-[9px] uppercase text-slate-500">Capacités</th>
                                                                <th className="text-right py-3 px-4 font-bold text-[9px] uppercase text-slate-500">État</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {entrepriseStations.length === 0 ? (
                                                                <tr>
                                                                    <td colSpan={4} className="py-6 text-center text-xs text-muted-foreground italic text-slate-400">Aucune station rattachée à cette entreprise</td>
                                                                </tr>
                                                            ) : entrepriseStations.map(s => (
                                                                <tr key={s.id}>
                                                                    <td className="py-3 px-4">
                                                                        <div className="font-bold text-slate-900 text-xs">{s.nom}</div>
                                                                        <div className="text-[9px] text-muted-foreground font-mono">ID: {s.code}</div>
                                                                    </td>
                                                                    <td className="py-3 px-4">
                                                                        <div className="text-[10px] font-bold text-primary uppercase">{s.type}</div>
                                                                        <div className="text-[9px] text-slate-500">{s.ville}</div>
                                                                    </td>
                                                                    <td className="py-3 px-4 text-right">
                                                                        <div className="text-[10px] font-bold text-slate-600">E: {s.capacite_essence.toLocaleString()}L</div>
                                                                        <div className="text-[10px] font-bold text-slate-600">G: {s.capacite_gasoil.toLocaleString()}L</div>
                                                                    </td>
                                                                    <td className="py-3 px-4 text-right">
                                                                        <Badge className={cn("text-[8px] font-black h-4 px-1.5", s.statut === 'ouverte' ? 'bg-emerald-50 text-emerald-600 border-none' : 'bg-red-50 text-red-600 border-none')} variant="outline">
                                                                            {s.statut}
                                                                        </Badge>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </section>

                                            <section>
                                                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-4">Documents Réglementaires & Agréments</h3>
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
                                    <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="rounded-xl px-8">Fermer la fiche</Button>
                                </footer>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* TAB: DOCUMENTS REGLEMENTAIRES */}
                <TabsContent value="documents" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { name: "Agrément d'importation", count: 42, color: "blue" },
                            { name: "Licence de Distribution", count: 128, color: "emerald" },
                            { name: "Certificat de Conformité", count: 85, color: "amber" },
                            { name: "Dossier Assurance", count: 156, color: "indigo" }
                        ].map((doc, i) => (
                            <Card key={i} className="hover:border-primary/30 transition-colors shadow-sm">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`h-10 w-10 rounded-xl bg-${doc.color}-50 flex items-center justify-center border border-${doc.color}-100`}>
                                            <ClipboardCheck className={`h-5 w-5 text-${doc.color}-600`} />
                                        </div>
                                        <Badge variant="outline" className="bg-white">{doc.count}</Badge>
                                    </div>
                                    <h3 className="font-bold text-sm text-slate-900">{doc.name}</h3>
                                    <p className="text-[10px] text-muted-foreground mt-1 tracking-tight">Dernière mise à jour: Hier</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Flux de Documents Entrants</CardTitle>
                            <CardDescription>Documents administratifs en attente de vérification technique</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { ent: "TotalEnergies", doc: "Renouvellement Agrément 2026", date: "Il y a 2h", status: "En attente" },
                                { ent: "Vivo Energy", doc: "Rapport de Conformité Annuel", date: "Il y a 5h", status: "Vérifié" },
                                { ent: "Kamsar Petroleum", doc: "Certificat Assurance Tiers", date: "Hier", status: "Vérifié" }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded bg-white flex items-center justify-center shadow-sm">
                                            <FileText className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{item.doc}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium">{item.ent} · <span className="text-blue-600">{item.date}</span></p>
                                        </div>
                                    </div>
                                    <Badge className={cn("text-[10px] font-bold h-6 px-3", item.status === 'Vérifié' ? 'bg-emerald-100 text-emerald-700 border-none' : 'bg-amber-100 text-amber-700 border-none')}>
                                        {item.status}
                                    </Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Suivi Statuts Administratifs */}
                <TabsContent value="suivi">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-amber-500" />
                                Suivi des Statuts Administratifs
                            </CardTitle>
                            <CardDescription>État des agréments et alertes de renouvellement par entreprise</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {filteredEntreprises.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground">
                                        <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm font-medium">Aucune entreprise trouvée</p>
                                    </div>
                                ) : filteredEntreprises.map(e => {
                                    const hasIssue = (e.documents_expires ?? 0) > 0;
                                    return (
                                        <div key={e.id} className={cn(
                                            "flex items-center gap-4 p-4 rounded-xl border relative overflow-hidden transition-all hover:shadow-md",
                                            hasIssue ? 'bg-amber-50 border-amber-200' : 'bg-slate-50/50 border-slate-100'
                                        )}>
                                            <div className={cn(
                                                "absolute left-0 top-0 bottom-0 w-1.5",
                                                hasIssue ? 'bg-amber-500' : 'bg-emerald-500'
                                            )} />
                                            <div className="h-11 w-11 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-black text-sm text-primary shrink-0 shadow-sm">
                                                {e.sigle?.[0] || e.nom[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-bold text-slate-900 truncate tracking-tight">{e.nom}</p>
                                                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest shrink-0", statusColor(e.statut))}>{e.statut}</Badge>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-medium">
                                                    <span className="font-mono text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-100">{e.numero_agrement}</span>
                                                    <span>·</span>
                                                    <span className="uppercase tracking-tighter">{e.region}</span>
                                                    <span>·</span>
                                                    <span className="capitalize">{e.type}</span>
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                {hasIssue ? (
                                                    <div className="bg-white p-2 rounded-lg border border-amber-200">
                                                        <Badge variant="destructive" className="text-[9px] font-black mb-1 px-2">{e.documents_expires} ALERTES</Badge>
                                                        <div className="text-[9px] text-amber-600 font-black uppercase text-center">⚠ Renouveler</div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center px-4">
                                                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                                        <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mt-1">Conforme</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </DashboardLayout>
    );
}
