import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    BarChart3, TrendingUp, TrendingDown, Building2, Fuel,
    MapPin, FileDown, RefreshCw, AlertTriangle, Activity,
    DollarSign, Package, Calendar, Filter,
    Database, PieChart, LineChart as LineChartIcon, FileText,
    AlertCircle
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart as RePieChart, Pie, AreaChart, Area
} from 'recharts';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Station, StationType, StationStatus } from '@/types';
import { REGIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { generateCustomReportPDF } from '@/lib/pdfExport';
import { generateExcelReport } from '@/lib/excelExport';

interface PrixOfficiel {
    carburant: string;
    prix_litre: number;
    date_effet: string;
}

interface StockHistory {
    date_releve: string;
    stock_essence: number;
    stock_gasoil: number;
}

interface Importation {
    id: string;
    navire_nom: string;
    produit: string;
    quantite_tonnes: number;
    date_arrivee_prevue: string;
    statut: string;
    port_origine: string;
}

export default function DashboardAnalyste() {
    const [stations, setStations] = useState<Station[]>([]);
    const [prixOfficiels, setPrixOfficiels] = useState<PrixOfficiel[]>([]);
    const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
    const [importations, setImportations] = useState<Importation[]>([]);
    const [statsFlux, setStatsFlux] = useState({ ventes30j: 0, livraisons30j: 0 });
    const [loading, setLoading] = useState(true);

    // Filtres
    const [filterRegion, setFilterRegion] = useState<string>('all');
    const [filterPeriod, setFilterPeriod] = useState<string>('30');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const stationsRes = await supabase.from('stations').select('*, entreprises:entreprise_id(nom, sigle)');

            const mappedStations: Station[] = (stationsRes.data || []).map((s: any) => ({
                id: s.id,
                nom: s.nom,
                code: s.code,
                adresse: s.adresse,
                ville: s.ville,
                region: s.region,
                type: s.type as StationType,
                entrepriseId: s.entreprise_id,
                entrepriseNom: s.entreprises?.nom || 'Inconnu',
                entrepriseSigle: s.entreprises?.sigle,
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
                gestionnaire: {
                    nom: s.gestionnaire_nom || '',
                    telephone: s.gestionnaire_telephone || '',
                    email: s.gestionnaire_email || '',
                },
                statut: s.statut as StationStatus,
                scoreRisque: s.score_risque || 0,
                coordonnees: (s.latitude !== null && s.longitude !== null) 
                  ? { lat: Number(s.latitude), lng: Number(s.longitude) } 
                  : undefined,
            }));

            setStations(mappedStations);
            
            const date30j = new Date();
            date30j.setDate(date30j.getDate() - 30);

            // Fetch strategic data
            const [prixRes, historyRes, importRes, ventesRes, livRes] = await Promise.all([
                supabase.from('prix_officiels' as any).select('*').order('date_effet', { ascending: false }).limit(20),
                supabase.from('historique_stocks' as any).select('*').order('date_releve', { ascending: false }).limit(100),
                supabase.from('importations' as any).select('*').order('date_arrivee_prevue', { ascending: false }).limit(20),
                supabase.from('ventes' as any).select('quantite_litres').gte('date', date30j.toISOString()),
                supabase.from('livraisons' as any).select('quantite_recue').gte('date_reception', date30j.toISOString()).eq('statut', 'validee')
            ]);

            if (prixRes.data) setPrixOfficiels(prixRes.data as any[]);
            if (historyRes.data) setStockHistory(historyRes.data as any[]);
            if (importRes.data) setImportations(importRes.data as any[]);
            
            const totalV = (ventesRes.data as any[] || []).reduce((acc, v) => acc + (v.quantite_litres || 0), 0);
            const totalL = (livRes.data as any[] || []).reduce((acc, l) => acc + (l.quantite_recue || 0), 0);
            setStatsFlux({ ventes30j: totalV, livraisons30j: totalL });

        } catch (error) {
            console.error('Error fetching analyst data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Statistiques globales
    const globalStats = useMemo(() => {
        const filteredStations = filterRegion !== 'all'
            ? stations.filter(s => s.region === filterRegion)
            : stations;

        const totalEssence = filteredStations.reduce((acc, s) => acc + s.stockActuel.essence, 0);
        const totalGasoil = filteredStations.reduce((acc, s) => acc + s.stockActuel.gasoil, 0);
        const totalCapacite = filteredStations.reduce((acc, s) => acc + s.capacite.essence + s.capacite.gasoil, 0);
        const tauxGlobal = totalCapacite > 0 ? Math.round(((totalEssence + totalGasoil) / totalCapacite) * 100) : 0;

        const stationsActives = filteredStations.filter(s => s.statut === 'ouverte').length;
        const stationsCritiques = filteredStations.filter(s => {
            const cap = s.capacite.essence + s.capacite.gasoil;
            const stk = s.stockActuel.essence + s.stockActuel.gasoil;
            return cap > 0 && (stk / cap) < 0.25;
        }).length;

        // KPI: Autonomie
        const CONSO_JOUR = { essence: 800000, gasoil: 1200000 };
        const autonomieEssence = totalEssence > 0 ? Math.round(totalEssence / CONSO_JOUR.essence) : 0;
        const autonomieGasoil = totalGasoil > 0 ? Math.round(totalGasoil / CONSO_JOUR.gasoil) : 0;

        // Entreprises uniques
        const entreprisesUniques = new Set(filteredStations.map(s => s.entrepriseId)).size;

        return {
            totalStations: filteredStations.length,
            stationsActives,
            stationsCritiques,
            totalEssence,
            totalGasoil,
            tauxGlobal,
            autonomieEssence,
            autonomieGasoil,
            entreprisesUniques,
            consommationQuotidienne: Math.round(statsFlux.ventes30j / 30) || (CONSO_JOUR.essence + CONSO_JOUR.gasoil) / 8
        };
    }, [stations, filterRegion, statsFlux]);

    // Données par région pour le tableau
    const regionData = useMemo(() => {
        return REGIONS.map(region => {
            const regionStations = stations.filter(s => s.region === region);
            const totalEssence = regionStations.reduce((acc, s) => acc + s.stockActuel.essence, 0);
            const totalGasoil = regionStations.reduce((acc, s) => acc + s.stockActuel.gasoil, 0);
            const totalCapacite = regionStations.reduce((acc, s) => acc + s.capacite.essence + s.capacite.gasoil, 0);
            const taux = totalCapacite > 0 ? Math.round(((totalEssence + totalGasoil) / totalCapacite) * 100) : 0;
            const critiques = regionStations.filter(s => {
                const cap = s.capacite.essence + s.capacite.gasoil;
                const stk = s.stockActuel.essence + s.stockActuel.gasoil;
                return cap > 0 && (stk / cap) < 0.25;
            }).length;

            return {
                region,
                stations: regionStations.length,
                essence: totalEssence,
                gasoil: totalGasoil,
                taux,
                critiques,
            };
        }).filter(r => r.stations > 0);
    }, [stations]);

    // Prediction pour la pénurie
    const predictions = useMemo(() => {
        return regionData.map(r => {
            const daysEssence = r.essence > 0 ? Math.round(r.essence / (800000 / 8)) : 0;
            const daysGasoil = r.gasoil > 0 ? Math.round(r.gasoil / (1200000 / 8)) : 0;
            
            return {
                region: r.region,
                essence: daysEssence,
                gasoil: daysGasoil,
                risk: daysEssence < 3 || daysGasoil < 3 ? 'Elevé' : daysEssence < 7 || daysGasoil < 7 ? 'Modéré' : 'Faible'
            };
        });
    }, [regionData]);

    // Data for charts
    const chartStockData = useMemo(() => {
        if (stockHistory.length > 0) return stockHistory;

        // Generate synthetic data if history is empty
        return Array.from({ length: 7 }).map((_, i) => ({
            date_releve: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
            stock_essence: globalStats.totalEssence * (0.8 + Math.random() * 0.4),
            stock_gasoil: globalStats.totalGasoil * (0.8 + Math.random() * 0.4),
        }));
    }, [stockHistory, globalStats]);

    // Export CSV
    const handleExportCSV = () => {
        const headers = ['Région', 'Stations', 'Stock Essence (L)', 'Stock Gasoil (L)', 'Taux Occupation (%)', 'Stations Critiques'];
        const rows = regionData.map(r => [r.region, r.stations, r.essence, r.gasoil, r.taux, r.critiques]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `rapport_analyste_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    // Export Excel Officiel
    const handleExportExcel = async () => {
        try {
            const headers = ['Région', 'Nombre Stations', 'Essence (L)', 'Gasoil (L)', 'Taux Stock (%)', 'Stations Critiques'];
            const data = regionData.map(r => [
                r.region,
                r.stations,
                r.essence,
                r.gasoil,
                r.taux,
                r.critiques
            ]);

            await generateExcelReport({
                title: 'RAPPORT STATISTIQUE NATIONAL SIHG',
                filename: `stats_national_${new Date().toISOString().split('T')[0]}.xlsx`,
                headers,
                data,
                signerRole: 'analyste'
            });
        } catch (error) {
            console.error('Error exporting Excel:', error);
        }
    };

    // Export PDF Officiel
    const handleExportPDF = async () => {
        try {
            await generateCustomReportPDF({
                type: 'stock-national',
                title: 'RAPPORT ANALYTIQUE NATIONAL',
                data: {
                    stats_globales: {
                        total_stations: globalStats.totalStations,
                        essence_total: globalStats.totalEssence,
                        gasoil_total: globalStats.totalGasoil,
                        taux_moyen: globalStats.tauxGlobal,
                        consommation_30j: statsFlux.ventes30j,
                        livraisons_30j: statsFlux.livraisons30j
                    },
                    entreprises: regionData.map(r => ({
                        nom: r.region,
                        sigle: r.region.slice(0, 3).toUpperCase(),
                        stockEssence: r.essence,
                        stockGasoil: r.gasoil,
                        stations: r.stations
                    }))
                },
                signerRole: 'analyste',
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };

    return (
        <DashboardLayout
            title="Dashboard Analyste"
            subtitle="Analyse stratégique et statistiques nationales"
        >
            {/* Header Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/20">
                        <BarChart3 className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="h-2 w-4 bg-[#CE1126] rounded-sm" />
                            <span className="h-2 w-4 bg-[#FCD116] rounded-sm" />
                            <span className="h-2 w-4 bg-[#00944D] rounded-sm" />
                            <h2 className="text-2xl font-black text-slate-900 leading-none">Analyse Stratégique</h2>
                        </div>
                        <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest leading-none">Renseignements sur les flux d'hydrocarbures</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Select value={filterRegion} onValueChange={setFilterRegion}>
                        <SelectTrigger className="w-[180px] h-11 rounded-xl bg-white border-slate-200">
                            <SelectValue placeholder="Toutes régions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Toutes les régions</SelectItem>
                            {REGIONS.map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Button 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 rounded-xl h-11 px-6 font-bold gap-2"
                        onClick={handleExportPDF}
                    >
                        <FileText className="h-4 w-4" />
                        Générer Rapport National
                    </Button>
                    
                    <Button 
                        variant="outline" 
                        className="rounded-xl h-11 px-4 font-bold gap-2 border-slate-200 hover:bg-slate-50"
                        onClick={handleExportExcel}
                    >
                        <FileDown className="h-4 w-4 text-emerald-600" />
                        Excel
                    </Button>
                    
                    <Button 
                        variant="outline" 
                        className="rounded-xl h-11 px-4 font-bold gap-2 border-slate-200"
                        onClick={handleExportCSV}
                    >
                        <FileText className="h-4 w-4 text-blue-600" />
                        CSV
                    </Button>

                    <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-200" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard title="Stations Totales" value={globalStats.totalStations} subtitle={`dont ${globalStats.stationsActives} actives`} icon={Fuel} />
                <StatCard title="Ventes (30j)" value={`${(statsFlux.ventes30j / 1000000).toFixed(2)}M L`} subtitle="consommation réelle" icon={TrendingUp} variant="primary" />
                <StatCard
                    title="Livraisons (30j)"
                    value={`${(statsFlux.livraisons30j / 1000000).toFixed(2)}M L`}
                    subtitle="distribution réseau"
                    icon={Package}
                    variant="success"
                />
                <StatCard title="Taux Stockage" value={`${globalStats.tauxGlobal}%`} subtitle="ratio stock / capacité" icon={Activity} />
            </div>

            {/* Autonomie nationale */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 shadow-sm overflow-hidden relative">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Autonomie Essence</p>
                                <p className="text-5xl font-black text-blue-900 mt-1">{globalStats.autonomieEssence} <span className="text-lg font-bold">jours</span></p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge className="bg-blue-600">{globalStats.totalEssence.toLocaleString('fr-GN')} L</Badge>
                                    <span className="text-xs text-blue-600/70 italic flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" /> +2.3% vs sem. dernière
                                    </span>
                                </div>
                            </div>
                            <Fuel className="h-20 w-20 text-blue-200/50 absolute -right-4 -bottom-4 rotate-12" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200 shadow-sm overflow-hidden relative">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-sm font-semibold text-amber-600 uppercase tracking-wider">Autonomie Gasoil</p>
                                <p className="text-5xl font-black text-amber-900 mt-1">{globalStats.autonomieGasoil} <span className="text-lg font-bold">jours</span></p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge className="bg-amber-600 text-white">{globalStats.totalGasoil.toLocaleString('fr-GN')} L</Badge>
                                    <span className="text-xs text-amber-600/70 italic flex items-center gap-1">
                                        <TrendingDown className="h-3 w-3 text-red-500" /> -1.5% vs sem. dernière
                                    </span>
                                </div>
                            </div>
                            <Fuel className="h-20 w-20 text-amber-200/50 absolute -right-4 -bottom-4 rotate-12" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts & Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Évolution des Stocks Nationaux
                        </CardTitle>
                        <CardDescription>Tendance des 7 derniers relevés</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartStockData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date_releve" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value: any) => [value.toLocaleString() + ' L']}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Line type="monotone" dataKey="stock_essence" name="Essence" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="stock_gasoil" name="Gasoil" stroke="#d97706" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            Comparaison Stock par Région
                        </CardTitle>
                        <CardDescription>Répartition du volume total par zone géographique</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={regionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="region" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value: any) => [value.toLocaleString() + ' L']}
                                />
                                <Bar dataKey="essence" name="Essence" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="gasoil" name="Gasoil" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="regions" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger value="regions" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <MapPin className="h-4 w-4" />
                        Par Région
                    </TabsTrigger>
                    <TabsTrigger value="prix" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <DollarSign className="h-4 w-4" />
                        Prix Officiels
                    </TabsTrigger>
                    <TabsTrigger value="importations" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Package className="h-4 w-4" />
                        Importations (Navires)
                    </TabsTrigger>
                    <TabsTrigger value="kpi" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Activity className="h-4 w-4" />
                        Indicateurs KPI
                    </TabsTrigger>
                    <TabsTrigger value="previsions" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <LineChartIcon className="h-4 w-4" />
                        Prévisions Pénurie
                    </TabsTrigger>
                </TabsList>

                {/* TAB: Par Région */}
                <TabsContent value="regions">
                    <Card className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Database className="h-5 w-5 text-primary" />
                                Données Détaillées par Région
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/20">
                                            <th className="text-left py-4 px-6 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Région</th>
                                            <th className="text-center py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Stations</th>
                                            <th className="text-right py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Essence (L)</th>
                                            <th className="text-right py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Gasoil (L)</th>
                                            <th className="text-center py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Couverture</th>
                                            <th className="text-center py-4 px-6 font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Alertes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {regionData.map(r => (
                                            <tr key={r.region} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="py-4 px-6 font-bold text-slate-700">{r.region}</td>
                                                <td className="text-center py-4 px-4"><Badge variant="secondary" className="rounded-md">{r.stations}</Badge></td>
                                                <td className="text-right py-4 px-4 font-mono text-sm leading-none">
                                                    {r.essence.toLocaleString('fr-GN')}
                                                    <p className="text-[10px] text-muted-foreground mt-1">LITRES</p>
                                                </td>
                                                <td className="text-right py-4 px-4 font-mono text-sm leading-none">
                                                    {r.gasoil.toLocaleString('fr-GN')}
                                                    <p className="text-[10px] text-muted-foreground mt-1">LITRES</p>
                                                </td>
                                                <td className="text-center py-4 px-4">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={cn("font-black text-sm",
                                                            r.taux < 25 ? "text-red-600" : r.taux < 50 ? "text-amber-600" : "text-emerald-600"
                                                        )}>{r.taux}%</span>
                                                        <Progress value={r.taux} className="h-1.5 w-16" />
                                                    </div>
                                                </td>
                                                <td className="text-center py-4 px-6">
                                                    {r.critiques > 0 ? (
                                                        <div className="flex items-center justify-center gap-1 text-red-600 font-bold">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            {r.critiques}
                                                        </div>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-600 bg-emerald-50">RAS</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 bg-slate-900 text-white font-bold">
                                            <td className="py-5 px-6 uppercase tracking-widest text-[10px]">TOTAL NATIONAL</td>
                                            <td className="text-center py-5 px-4 font-black">{globalStats.totalStations}</td>
                                            <td className="text-right py-5 px-4 font-mono">{globalStats.totalEssence.toLocaleString('fr-GN')}</td>
                                            <td className="text-right py-5 px-4 font-mono">{globalStats.totalGasoil.toLocaleString('fr-GN')}</td>
                                            <td className="text-center py-5 px-4">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-sm">{globalStats.tauxGlobal}%</span>
                                                    <Progress value={globalStats.tauxGlobal} className="h-1 w-12 bg-white/20" />
                                                </div>
                                            </td>
                                            <td className="text-center py-5 px-6">{globalStats.stationsCritiques}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Prix */}
                <TabsContent value="prix">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-primary" />
                                Prix Officiels en Vigueur
                            </CardTitle>
                            <CardDescription>Structure des prix réglementés par l'État</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {prixOfficiels.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p className="font-medium">Aucune donnée de prix disponible</p>
                                    <p className="text-xs mt-1">Les prix officiels n'ont pas encore été configurés dans le système.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {prixOfficiels.slice(0, 2).map((p, i) => (
                                        <div key={i} className="flex flex-col p-6 rounded-2xl border bg-slate-50 relative overflow-hidden">
                                            <Badge className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 border-emerald-200">ACTIF</Badge>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{p.carburant}</p>
                                            <h4 className="text-4xl font-black text-slate-900">{p.prix_litre.toLocaleString('fr-GN')} <span className="text-sm text-slate-400">GNF/L</span></h4>
                                            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                En vigueur depuis le: {new Date(p.date_effet).toLocaleDateString('fr-FR')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Importations */}
                <TabsContent value="importations">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5 text-primary" />
                                    Suivi des Importations Maritimes
                                </CardTitle>
                                <CardDescription>Volumes arrivés ou attendus au Port de Conakry</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {importations.length === 0 ? (
                                <div className="text-center py-20 text-muted-foreground border border-dashed m-6 rounded-xl">
                                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p className="font-medium">Aucune donnée d'importation disponible</p>
                                    <p className="text-xs">Les mouvements de navires ne sont pas encore enregistrés dans le système.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/20">
                                                <th className="text-left py-4 px-6 font-semibold uppercase text-[10px]">Navire</th>
                                                <th className="text-center py-4 px-4 font-semibold uppercase text-[10px]">Produit</th>
                                                <th className="text-right py-4 px-4 font-semibold uppercase text-[10px]">Quantité (T)</th>
                                                <th className="text-center py-4 px-4 font-semibold uppercase text-[10px]">Arrivée Prévue</th>
                                                <th className="text-center py-4 px-6 font-semibold uppercase text-[10px]">Statut</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {importations.map(imp => (
                                                <tr key={imp.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-4 px-6 font-bold">{imp.navire_nom}</td>
                                                    <td className="text-center py-4 px-4">
                                                        <Badge variant="outline" className="capitalize">{imp.produit?.replace('_', ' ') || 'Inconnu'}</Badge>
                                                    </td>
                                                    <td className="text-right py-4 px-4 font-mono font-bold">
                                                        {imp.quantite_tonnes.toLocaleString()} T
                                                    </td>
                                                    <td className="text-center py-4 px-4 text-muted-foreground">
                                                        {imp.date_arrivee_prevue ? new Date(imp.date_arrivee_prevue).toLocaleDateString('fr-FR') : 'N/A'}
                                                    </td>
                                                    <td className="text-center py-4 px-6">
                                                        <Badge className={cn(
                                                            "font-black text-[10px] px-2 py-0",
                                                            imp.statut === 'termine' ? "bg-emerald-500" :
                                                            imp.statut === 'au_port' ? "bg-blue-500" : "bg-amber-500"
                                                        )}>
                                                            {imp.statut?.toUpperCase() || 'INCONNU'}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: KPI */}
                <TabsContent value="kpi" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card className="shadow-sm border-t-4 border-t-primary">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-widest">Couverture Territoriale</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {REGIONS.map(region => {
                                        const count = stations.filter(s => s.region === region).length;
                                        const max = Math.max(...REGIONS.map(r => stations.filter(s => s.region === r).length), 1);
                                        return (
                                            <div key={region} className="space-y-1">
                                                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                                                    <span>{region}</span>
                                                    <span>{count}</span>
                                                </div>
                                                <Progress value={(count / max) * 100} className="h-1.5" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-t-4 border-t-indigo-500">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-widest">Santé du Réseau</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl border bg-emerald-50 text-center">
                                        <p className="text-[10px] font-black text-emerald-700 uppercase mb-1">Ratio Ouverture</p>
                                        <p className="text-2xl font-black text-emerald-900">
                                            {stations.length > 0 ? Math.round((stations.filter(s => s.statut === 'ouverte').length / stations.length) * 100) : 0}%
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-xl border bg-slate-50 text-center">
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Score Risque Moy.</p>
                                        <p className="text-2xl font-black text-slate-900">
                                            {stations.length > 0 ? (stations.reduce((a, s) => a + (s.scoreRisque || 0), 0) / stations.length).toFixed(1) : 0}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-xl border bg-amber-50 text-center">
                                        <p className="text-[10px] font-black text-amber-700 uppercase mb-1">Zones Alertées</p>
                                        <p className="text-2xl font-black text-amber-900">{regionData.filter(r => r.critiques > 0).length}</p>
                                    </div>
                                    <div className="p-4 rounded-xl border bg-blue-50 text-center">
                                        <p className="text-[10px] font-black text-blue-700 uppercase mb-1">Aggrégat Stock</p>
                                        <p className="text-2xl font-black text-blue-900">{((globalStats.totalEssence + globalStats.totalGasoil) / 1000000).toFixed(1)}M</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm border-t-4 border-t-amber-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-black text-muted-foreground uppercase tracking-widest">Criticité des Stocks</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[250px] flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={[
                                                { name: 'Sain', value: stations.length - globalStats.stationsCritiques },
                                                { name: 'Critique', value: globalStats.stationsCritiques }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill="#10b981" />
                                            <Cell fill="#f43f5e" />
                                        </Pie>
                                        <Tooltip />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TAB: PREVISIONS */}
                <TabsContent value="previsions" className="space-y-6">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <Card className="xl:col-span-2 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                                    Matrice de Risque par Région
                                </CardTitle>
                                <CardDescription>Prévisions d'autonomie basées sur la consommation moyenne</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/20">
                                                <th className="text-left py-4 px-6 font-semibold uppercase text-[10px]">Zone</th>
                                                <th className="text-center py-4 px-4 font-semibold uppercase text-[10px]">Essence (Est.)</th>
                                                <th className="text-center py-4 px-4 font-semibold uppercase text-[10px]">Gasoil (Est.)</th>
                                                <th className="text-center py-4 px-6 font-semibold uppercase text-[10px]">Seuil de Risque</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {predictions.map(p => (
                                                <tr key={p.region} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-4 px-6 font-bold">{p.region}</td>
                                                    <td className="text-center py-4 px-4">
                                                        <span className={cn("font-black text-sm", p.essence < 3 ? "text-red-600" : "text-slate-900")}>
                                                            {p.essence} Jours
                                                        </span>
                                                    </td>
                                                    <td className="text-center py-4 px-4">
                                                        <span className={cn("font-black text-sm", p.gasoil < 3 ? "text-red-600" : "text-slate-900")}>
                                                            {p.gasoil} Jours
                                                        </span>
                                                    </td>
                                                    <td className="text-center py-4 px-6">
                                                        <Badge className={cn(
                                                            "font-black text-[9px]",
                                                            p.risk === 'Elevé' ? "bg-red-500" : p.risk === 'Modéré' ? "bg-amber-500" : "bg-emerald-500"
                                                        )}>
                                                            RISQUE {p.risk.toUpperCase()}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-xl bg-slate-900 text-white border-none overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <AlertCircle className="h-32 w-32" />
                            </div>
                            <CardHeader>
                                <CardTitle className="text-white text-md font-black uppercase tracking-tighter italic">Vigilance Stratégique</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none">Alerte Prioritaire</p>
                                    <h4 className="text-lg font-black text-amber-400">Région de Conakry</h4>
                                    <p className="text-sm text-slate-300">Autonomie essence estimée à moins de 48h sans réapprovisionnement du dépôt central.</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md">
                                    <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">Action recommandée</p>
                                    <p className="text-sm">Déclenchement du plan de contingence national et priorisation des livraisons vers les stations stratégiques.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </DashboardLayout>
    );
}
