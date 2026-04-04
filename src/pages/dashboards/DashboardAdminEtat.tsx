import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Building2,
    Fuel,
    AlertTriangle,
    RefreshCw,
    TrendingUp,
    ShieldCheck,
    Truck,
    Ship,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    BarChart3,
    Users,
    FileText,
    Download,
    ShieldAlert,
    SearchCheck,
    FolderOpen,
    Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types';
import { Link } from 'react-router-dom';
import { NationalAutonomyGauge } from '@/components/charts/NationalAutonomyGauge';
import { Station, StationStatus, StationType } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateCustomReportPDF } from '@/lib/pdfExport';
import { generateExcelReport } from '@/lib/excelExport';
import { OrdreRavitaillementDialog } from '@/components/dashboard/OrdreRavitaillementDialog';
import { GuineaMap } from '@/components/map/GuineaMap';
import { CreateEntrepriseDialog } from '../../components/dashboard/CreateEntrepriseDialog';
import { CreateStationDialog } from '../../components/dashboard/CreateStationDialog';
import { SecurityAuditCard } from '@/components/dashboard/SecurityAuditCard';
import { ShieldAlert as ShieldIcon } from 'lucide-react';
import { AvisDGDialog } from '@/components/dashboard/AvisDGDialog';

interface AdminStats {
    totalEntreprises: number;
    totalStations: number;
    ordersPending: number;
    totalImportations: number;
    stationsPending: number;
}

export default function DashboardAdminEtat() {
    const { role, profile } = useAuth();
    const [stats, setStats] = useState<AdminStats>({
        totalEntreprises: 0,
        totalStations: 0,
        ordersPending: 0,
        totalImportations: 0,
        stationsPending: 0,
    });
    const [stations, setStations] = useState<Station[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
    const [dossiersSIHG, setDossiersSIHG] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOrdreDialogOpen, setIsOrdreDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [isCreateEntrepriseOpen, setIsCreateEntrepriseOpen] = useState(false);
    const [isCreateStationOpen, setIsCreateStationOpen] = useState(false);
    const [isAvisDDialogOpen, setIsAvisDDialogOpen] = useState(false);
    const [selectedDossier, setSelectedDossier] = useState<{ id: string, numero: string } | null>(null);

    const CONSOMMATION_JOURNALIERE = {
        essence: 800000,
        gasoil: 1200000,
    };

    const totalStock = useMemo(() => stations.reduce((acc, s) => ({
        essence: acc.essence + (s.stockActuel.essence || 0),
        gasoil: acc.gasoil + (s.stockActuel.gasoil || 0),
    }), { essence: 0, gasoil: 0 }), [stations]);

    const autonomie = {
        essence: totalStock.essence > 0 ? Math.round(totalStock.essence / CONSOMMATION_JOURNALIERE.essence) : 0,
        gasoil: totalStock.gasoil > 0 ? Math.round(totalStock.gasoil / CONSOMMATION_JOURNALIERE.gasoil) : 0,
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [resEntreprises, resStations, resOrders, resImportations, resRawStations, resAlerts, resDossiers] = await Promise.all([
                supabase.from('entreprises').select('*', { count: 'exact', head: true }),
                supabase.from('stations').select('*', { count: 'exact', head: true }),
                supabase.from('ordres_livraison').select('*, station:stations(nom, entreprise:entreprises(sigle))').in('statut', ['en_attente', 'approuve', 'en_cours']).order('created_at', { ascending: false }).limit(5),
                supabase.from('importations').select('*', { count: 'exact', head: true }).neq('statut', 'termine'),
                supabase.from('stations').select('*, entreprises(nom, sigle)'),
                supabase.from('alertes').select('*').eq('resolu', false).order('created_at', { ascending: false }).limit(3),
                (supabase as any).from('dossiers_entreprise').select('*, entreprises(nom, sigle)').in('statut', ['valide_jur', 'avis_dg']).order('updated_at', { ascending: false })
            ]);

            const [resAllOrdersCount, resStationsPending] = await Promise.all([
                supabase.from('ordres_livraison').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente'),
                supabase.from('stations').select('*', { count: 'exact', head: true }).eq('statut', 'attente_validation')
            ]);

            setStats({
                totalEntreprises: resEntreprises.count || 0,
                totalStations: resStations.count || 0,
                ordersPending: resAllOrdersCount.count || 0,
                totalImportations: resImportations.count || 0,
                stationsPending: resStationsPending.count || 0,
            });

            setRecentOrders(resOrders.data || []);
            setRecentAlerts(resAlerts.data || []);
            setDossiersSIHG(resDossiers.data || []);

            const mappedStations: Station[] = (resRawStations.data || []).map(s => ({
                id: s.id,
                nom: s.nom,
                code: s.code,
                adresse: s.adresse,
                ville: s.ville,
                region: s.region,
                type: s.type as StationType,
                entrepriseId: s.entreprise_id,
                entrepriseNom: s.entreprises?.nom || 'Inconnu',
                entrepriseSigle: s.entreprises?.sigle || '?',
                capacite: {
                    essence: s.capacite_essence || 0,
                    gasoil: s.capacite_gasoil || 0,
                    gpl: s.capacite_gpl || 0,
                    lubrifiants: s.capacite_lubrifiants || 0,
                },
                stockActuel: {
                    essence: s.stock_essence || 0,
                    gasoil: s.stock_gasoil || 0,
                    gpl: s.stock_gpl || 0,
                    lubrifiants: s.stock_lubrifiants || 0,
                },
                nombrePompes: s.nombre_pompes || 0,
                statut: s.statut as StationStatus,
                gestionnaire: { nom: '', telephone: '', email: '' }
            }));

            setStations(mappedStations);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            toast.error("Erreur de chargement des données");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDossierAction = async (dossierId: string, action: 'avis' | 'rejeter') => {
        if (action === 'avis') {
            const dossier = dossiersSIHG.find(d => d.id === dossierId);
            if(dossier) {
                setSelectedDossier({ id: dossier.id, numero: dossier.numero_dossier });
                setIsAvisDDialogOpen(true);
            }
            return;
        }

        let nextStatut: string = '';
        if (action === 'rejeter') nextStatut = 'rejete';

        try {
            const { error } = await (supabase as any)
                .from('dossiers_entreprise')
                .update({ statut: nextStatut })
                .eq('id', dossierId);

            if (error) throw error;

            toast.success(`Dossier mis à jour : ${nextStatut.replace(/_/g, ' ')}`);
            fetchData();
        } catch (error: any) {
            toast.error("Erreur lors de la mise à jour du dossier");
        }
    };

    const handleGenerateReport = async () => {
        try {
            const reportData = stations.reduce((acc: any[], s) => {
                const existing = acc.find(e => e.sigle === s.entrepriseSigle);
                if (existing) {
                    existing.stockEssence += s.stockActuel.essence;
                    existing.stockGasoil += s.stockActuel.gasoil;
                    existing.stations += 1;
                } else {
                    acc.push({
                        nom: s.entrepriseNom,
                        sigle: s.entrepriseSigle || 'N/A',
                        stockEssence: s.stockActuel.essence,
                        stockGasoil: s.stockActuel.gasoil,
                        stations: 1
                    });
                }
                return acc;
            }, []);

            await generateCustomReportPDF({
                type: 'stock-national',
                title: 'RAPPORT NATIONAL DE SITUATION ENERGETIQUE',
                data: { entreprises: reportData },
                signerRole: role || 'admin_etat',
                signerName: profile?.full_name || 'Direction SONAP'
            });
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error("Erreur de génération du rapport");
        }
    };

    const handleExportExcel = async () => {
        try {
            const headers = ['Compagnie', 'Stock Essence (L)', 'Stock Gasoil (L)', 'Stations'];
            const data = stations.reduce((acc: any[], s) => {
                const existing = acc.find(e => e.nom === s.entrepriseNom);
                if (existing) {
                    existing.stockEssence += s.stockActuel.essence;
                    existing.stockGasoil += s.stockActuel.gasoil;
                    existing.stations += 1;
                } else {
                    acc.push({
                        nom: s.entrepriseNom,
                        stockEssence: s.stockActuel.essence,
                        stockGasoil: s.stockActuel.gasoil,
                        stations: 1
                    });
                }
                return acc;
            }, []).map((e: any) => [e.nom, e.stockEssence, e.stockGasoil, e.stations]);

            await generateExcelReport({
                title: 'CONSOLIDATION NATIONALE DES STOCKS — SIHG',
                filename: `Etat_National_Stocks_${new Date().toISOString().slice(0, 10)}`,
                headers,
                data,
                signerRole: role || 'admin_etat',
                signerName: profile?.full_name || 'Direction Générale'
            });
        } catch (error) {
            console.error('Error generating excel:', error);
            toast.error("Erreur d'exportation Excel");
        }
    };

    const roleLabel = useMemo(() => {
        if (role === 'directeur_general') return 'Directeur Général (DG)';
        if (role === 'directeur_adjoint') return 'Directeur Général Adjoint (DGA)';
        if (role === 'super_admin') return 'Super Administrateur';
        return 'Administrateur État';
    }, [role]);

    return (
        <DashboardLayout
            title={`Pilotage ${roleLabel}`}
            subtitle="Organe de Régulation et de Supervision Étatique (SONAP)"
        >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-1 bg-primary rounded-full" />
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                            Pilotage {roleLabel} SONAP
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Supervision stratégique et régulation nationale
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2 bg-white/50 border-slate-200">
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Actualiser
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline"
                        className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold"
                        onClick={handleExportExcel}
                    >
                        <Download className="h-4 w-4" />
                        Excel Certifié
                    </Button>
                    <Button 
                        size="sm" 
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 font-bold"
                        onClick={handleGenerateReport}
                    >
                        <FileText className="h-4 w-4" />
                        PDF National
                    </Button>
                    {(['admin_etat', 'directeur_general', 'directeur_adjoint', 'super_admin'].includes(role || '')) && (
                        <Button 
                            size="sm" 
                            className="gap-2 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 font-bold"
                            onClick={() => setIsOrdreDialogOpen(true)}
                        >
                            <ShieldAlert className="h-4 w-4" />
                            Ordre Ravitaillement
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard title="Compagnies Agréées" value={stats.totalEntreprises} subtitle="Acteurs enregistrées" icon={Building2} />
                <StatCard title="Parc de Stations" value={stats.totalStations} subtitle="Points de distribution" icon={Fuel} />
                <StatCard title="Commandes en Attente" value={stats.ordersPending} subtitle="Validation requise" icon={Clock} variant={stats.ordersPending > 0 ? 'warning' : 'default'} />
                <StatCard title="Importations Actives" value={stats.totalImportations} subtitle="Navires en mouvement" icon={Ship} variant="primary" />
            </div>

            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="bg-slate-100/50 p-1 rounded-2xl border border-slate-200">
                    <TabsTrigger value="overview" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 text-xs font-bold uppercase">Vue d'Ensemble</TabsTrigger>
                    <TabsTrigger value="dossiers" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 text-xs font-bold uppercase flex gap-2">
                        Flux Dossiers SIHG 
                        {dossiersSIHG.length > 0 && <Badge className="bg-amber-500 text-white border-none ml-1 h-4 px-1 text-[9px]">{dossiersSIHG.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="stations" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 text-xs font-bold uppercase">Cartographie</TabsTrigger>
                    <TabsTrigger value="security" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 text-xs font-bold uppercase flex gap-2">
                        <ShieldIcon className="h-3.5 w-3.5" />
                        Audit Sécurité
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp className="h-32 w-32" /></div>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                                        <BarChart3 className="h-5 w-5 text-primary-foreground" />
                                        Autonomie Énergétique Nationale
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-4">
                                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                            <NationalAutonomyGauge daysRemaining={autonomie.essence} fuelType="essence" />
                                        </div>
                                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                            <NationalAutonomyGauge daysRemaining={autonomie.gasoil} fuelType="gasoil" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-lg">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <AlertCircle className="h-5 w-5 text-orange-500" />
                                            Alertes Système
                                        </CardTitle>
                                    </div>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link to="/alertes">Voir tout <ChevronRight className="h-4 w-4 ml-1" /></Link>
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {recentAlerts.length === 0 ? (
                                            <p className="text-center text-muted-foreground italic py-6">Aucune alerte active</p>
                                        ) : (
                                            recentAlerts.map((alert) => (
                                                <div key={alert.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                                                    <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                                        <AlertTriangle className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold">{alert.message}</p>
                                                        <p className="text-[10px] text-muted-foreground uppercase">{alert.type}</p>
                                                    </div>
                                                    <Badge variant="outline" className="border-orange-200 text-orange-600">{alert.niveau}</Badge>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="lg:col-span-1 border-none shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    Commandes Récentes
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {recentOrders.length === 0 ? (
                                    <p className="text-center text-muted-foreground italic py-8">Aucune commande</p>
                                ) : (
                                    recentOrders.map((order) => (
                                        <div key={order.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge variant="outline" className="text-[10px]">{order.station?.entreprise?.sigle}</Badge>
                                                <Badge className="text-[9px] uppercase">{order.statut}</Badge>
                                            </div>
                                            <h4 className="text-sm font-bold">{order.station?.nom}</h4>
                                            <p className="text-xs text-slate-600 mt-1 capitalize">{order.carburant} : {order.quantite_demandee?.toLocaleString()} L</p>
                                        </div>
                                    ))
                                )}
                                <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                                    <Link to="/admin/commandes">Voir tout le flux</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[
                            { label: 'Entreprises', icon: Building2, path: '/entreprises', color: 'bg-blue-100 text-blue-600' },
                            { label: 'Stations', icon: Fuel, path: '/stations', color: 'bg-emerald-100 text-emerald-600' },
                            { label: 'Nouvelle Entreprise', icon: Plus, action: () => setIsCreateEntrepriseOpen(true), color: 'bg-blue-600 text-white' },
                            { label: 'Nouvelle Station', icon: Plus, action: () => setIsCreateStationOpen(true), color: 'bg-emerald-600 text-white' },
                            { label: 'Importations', icon: Ship, path: '/importations', color: 'bg-indigo-100 text-indigo-600' },
                            { label: 'Utilisateurs', icon: Users, path: '/utilisateurs', color: 'bg-purple-100 text-purple-600' },
                            { label: 'Rapports', icon: BarChart3, path: '/rapports', color: 'bg-amber-100 text-amber-600' },
                            { label: 'Dossiers', icon: FolderOpen, path: '/dossiers', color: 'bg-slate-100 text-slate-600' }
                        ].map((action, i) => (
                            <Card key={i} className="cursor-pointer hover:shadow-md transition-all group border-none bg-white" onClick={action.action}>
                                {action.path ? (
                                    <Link to={action.path}>
                                        <CardContent className="flex flex-col items-center py-6">
                                            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-all shadow-sm", action.color)}>
                                                <action.icon className="h-6 w-6" />
                                            </div>
                                            <h4 className="text-xs font-bold text-slate-800">{action.label}</h4>
                                        </CardContent>
                                    </Link>
                                ) : (
                                    <CardContent className="flex flex-col items-center py-6">
                                        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-all shadow-sm", action.color)}>
                                            <action.icon className="h-6 w-6" />
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-800">{action.label}</h4>
                                    </CardContent>
                                )}
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="dossiers">
                    <Card className="border-none shadow-xl overflow-hidden rounded-[2rem] bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                            <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                <FolderOpen className="h-6 w-6 text-primary" />
                                Instructions & Avis Direction Générale
                            </CardTitle>
                            <CardDescription className="text-xs font-bold text-slate-500 italic uppercase">
                                Revue finale des dossiers certifiés par le juridique avant validation d'état
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="text-left py-5 px-8 font-black uppercase text-[10px] text-slate-400 tracking-widest">Référence</th>
                                            <th className="text-left py-5 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Entreprise</th>
                                            <th className="text-left py-5 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Type Demande</th>
                                            <th className="text-left py-5 px-6 font-black uppercase text-[10px] text-slate-400 tracking-widest">Statut</th>
                                            <th className="text-right py-5 px-8 font-black uppercase text-[10px] text-slate-400 tracking-widest">Avis DG</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {dossiersSIHG.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-20 text-center">
                                                    <FolderOpen className="h-12 w-12 mx-auto text-slate-200 mb-4" />
                                                    <p className="text-sm font-bold text-slate-400 uppercase">Aucun dossier en attente d'avis DG</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            dossiersSIHG.map((d) => (
                                                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="py-6 px-8">
                                                        <div className="text-xs font-black text-slate-900 mb-1">{d.numero_dossier}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold">{format(new Date(d.created_at || new Date()), 'dd/MM/yyyy')}</div>
                                                    </td>
                                                    <td className="py-6 px-6">
                                                        <div className="text-xs font-black text-indigo-600 uppercase mb-1">{d.entreprises?.sigle || d.entite_nom}</div>
                                                        <p className="text-[10px] text-slate-500 font-medium">{d.entreprises?.nom}</p>
                                                    </td>
                                                    <td className="py-6 px-6">
                                                        <div className="text-xs font-bold text-slate-600 capitalize">{d.type_demande?.replace(/_/g, ' ')}</div>
                                                    </td>
                                                    <td className="py-6 px-6">
                                                        <Badge className={cn(
                                                            "text-[10px] font-black uppercase tracking-widest border-none px-3 py-1",
                                                            d.statut === 'valide_jur' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                                        )}>
                                                            {d.statut === 'valide_jur' ? 'Certifié Juridique' : 'Avis DG Rendu'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-6 px-8 text-right">
                                                        <div className="flex items-center justify-end gap-2 group-hover:opacity-100 transition-opacity">
                                                            {d.statut === 'valide_jur' && (
                                                                <Button 
                                                                    size="sm" 
                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase h-8 px-4"
                                                                    onClick={() => handleDossierAction(d.id, 'avis')}
                                                                >
                                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Favorable
                                                                </Button>
                                                            )}
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline"
                                                                className="border-red-200 text-red-600 hover:bg-red-50 font-black text-[9px] uppercase h-8 px-4"
                                                                onClick={() => handleDossierAction(d.id, 'rejeter')}
                                                            >
                                                                Rejeter
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" asChild>
                                                                <Link to={`/dossiers/${d.id}`}><ChevronRight className="h-4 w-4" /></Link>
                                                            </Button>
                                                        </div>
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
                <TabsContent value="stations" className="h-[600px] rounded-2xl overflow-hidden border border-slate-200">
                    <GuineaMap stations={stations} showControls={true} />
                </TabsContent>
                <TabsContent value="security">
                    <SecurityAuditCard />
                </TabsContent>
            </Tabs>

            <OrdreRavitaillementDialog 
                open={isOrdreDialogOpen} 
                onOpenChange={setIsOrdreDialogOpen} 
                onSuccess={fetchData}
            />

            <CreateEntrepriseDialog 
                open={isCreateEntrepriseOpen} 
                onOpenChange={setIsCreateEntrepriseOpen} 
                onSuccess={fetchData}
            />

            <CreateStationDialog 
                open={isCreateStationOpen} 
                onOpenChange={setIsCreateStationOpen} 
                onSuccess={fetchData}
            />

            <AvisDGDialog
                open={isAvisDDialogOpen}
                onOpenChange={setIsAvisDDialogOpen}
                dossierId={selectedDossier?.id || ''}
                dossierNumero={selectedDossier?.numero || ''}
                onSuccess={fetchData}
            />
        </DashboardLayout>
    );
}
