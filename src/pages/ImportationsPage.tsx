import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Importation } from "@/types";
import {
    Ship,
    Search,
    Filter,
    Download,
    Plus,
    Map as MapIcon,
    CheckCircle2,
    Clock,
    Timer,
    FileText,
    Shield,
    Globe,
    Maximize2,
    Activity,
    TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { generateCustomReportPDF } from "@/lib/pdfExport";
import { generateExcelReport } from "@/lib/excelExport";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function ImportationsPage() {
    const { role: currentUserRole, canModifyData, profile } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();
    const { toast } = useToast();

    const { data: importations, isLoading } = useQuery({
        queryKey: ['import-dossiers-global'],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('import_dossiers')
                .select(`
                    *,
                    fournisseur:import_fournisseurs(nom, pays),
                    produit:import_produits(nom)
                `)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const handleAction = async (action: string, data?: any) => {
        if (action === "DownloadReport") {
            try {
                toast({ title: "Génération du rapport...", description: "Préparation du document d'importation." });
                await generateCustomReportPDF({
                    type: 'importations',
                    title: 'RAPPORT DES IMPORTATIONS NATIONALES',
                    data: importations || [],
                    signerRole: 'admin_etat'
                });
                toast({ title: "Rapport généré", description: "Le document PDF a été téléchargé." });
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible de générer le rapport.", variant: "destructive" });
            }
            return;
        }

        if (action === "ExportExcel") {
          try {
            const headers = ['Dossier', 'Produit', 'Quantité (T)', 'Fournisseur', 'Pays Registre', 'Date Création', 'Statut'];
            const dataRows = (importations || []).map((imp: any) => [
              imp.numero_dossier,
              imp.produit?.nom,
              imp.quantite_prevue,
              imp.fournisseur?.nom,
              imp.fournisseur?.pays,
              new Date(imp.created_at).toLocaleDateString(),
              imp.statut.toUpperCase()
            ]);

            await generateExcelReport({
              title: 'REGISTRE NATIONAL DES IMPORTATIONS DE CARBURANT — SIHG',
              filename: `Importations_SIHG_${new Date().toISOString().slice(0, 10)}`,
              headers,
              data: dataRows,
              signerRole: currentUserRole || 'admin_etat',
              signerName: profile?.full_name || 'Direction des Importations'
            });
            toast({ title: "Succès", description: "Export Excel certifié réussi." });
          } catch (err: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: err.message });
          }
          return;
        }

        if (action.includes("Facture") || action.includes("Certificat") || action.includes("Visa") || action.includes("Bill") || action.includes("Manifeste") || action.includes("Analyse")) {
            try {
                toast({ title: "Extraction du document...", description: `Préparation de : ${action}` });
                await generateCustomReportPDF({
                    type: 'generic',
                    title: action.toUpperCase(),
                    data: data || {},
                    signerRole: 'admin_etat'
                });
            } catch (error) {
                toast({ title: "Erreur", description: "Impossible d'extraire le document.", variant: "destructive" });
            }
            return;
        }

        toast({
            title: "Action enregistrée",
            description: `${action} : Cette fonctionnalité sera liée au back-end prochainement.`,
        });
    };

    const getStatusBadge = (statut: string) => {
        switch (statut) {
            case "en_preparation":
                return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 uppercase text-[9px] font-bold">Préparation</Badge>;
            case "en_transport":
                return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 animate-pulse uppercase text-[10px] font-bold">En Transport</Badge>;
            case "arrive":
                return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 uppercase text-[10px] font-bold">Arrivé</Badge>;
            case "livre":
                return <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200 uppercase text-[10px] font-bold">Livré</Badge>;
            default:
                return <Badge variant="outline">{statut}</Badge>;
        }
    };

    const totalVolume = importations?.reduce((acc: number, imp: any) => acc + Number(imp.quantite_prevue), 0) || 0;

    return (
        <DashboardLayout title="Importations Nationales" subtitle="Suivi des flux pétroliers stratégiques au Port de Conakry">
            <div className="space-y-6 animate-fade-in">

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="glass-card overflow-hidden">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Volume Total Prévu</p>
                                    <h3 className="text-2xl font-bold mt-1">{(totalVolume / 1000).toFixed(1)}k T</h3>
                                </div>
                                <div className="bg-primary/10 p-2 rounded-lg">
                                    <Ship className="h-5 w-5 text-primary" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-xs text-green-600">
                                <Plus className="h-3 w-3 mr-1" />
                                <span>Volume centralisé SIHG</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card overflow-hidden">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Dossiers Actifs</p>
                                    <h3 className="text-2xl font-bold mt-1">{importations?.filter((i: any) => i.statut !== 'livre').length || 0}</h3>
                                </div>
                                <div className="bg-amber-500/10 p-2 rounded-lg">
                                    <Clock className="h-5 w-5 text-amber-600" />
                                </div>
                            </div>
                            <p className="mt-4 text-xs text-muted-foreground">Suivi temps réel</p>
                        </CardContent>
                    </Card>

                    <Card className="glass-card overflow-hidden">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">En Déchargement</p>
                                    <h3 className="text-2xl font-bold mt-1">{importations?.filter((i: any) => i.statut === 'arrive').length || 0}</h3>
                                </div>
                                <div className="bg-emerald-500/10 p-2 rounded-lg">
                                    <Timer className="h-5 w-5 text-blue-600" />
                                </div>
                            </div>
                            <p className="mt-4 text-xs text-muted-foreground">Navires à quai</p>
                        </CardContent>
                    </Card>

                    <Card className="glass-card overflow-hidden">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Produits Actifs</p>
                                    <h3 className="text-2xl font-bold mt-1">4/4</h3>
                                </div>
                                <div className="bg-green-500/10 p-2 rounded-lg">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                </div>
                            </div>
                            <p className="mt-4 text-xs text-muted-foreground">Essence, Gasoil, Jet A1, Fuel</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Global Map/Route Visualization Mockup */}
                <Card className="relative overflow-hidden border-none shadow-2xl bg-slate-900 text-white">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>

                    <CardHeader className="relative z-10 border-b border-white/10 backdrop-blur-md bg-white/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl flex items-center gap-3 font-black tracking-tight">
                                    <div className="p-2 bg-primary/20 rounded-lg">
                                        <Globe className="h-6 w-6 text-primary animate-pulse" />
                                    </div>
                                    PIPELINE MARITIME EN TEMPS RÉEL
                                </CardTitle>
                                <CardDescription className="text-slate-400 font-medium">Tracking satellite AIS des cargaisons stratégiques</CardDescription>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live Sync</span>
                                </div>
                                {canModifyData && (
                                    <>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="bg-white/10 border-white/20 hover:bg-white/20 text-white transition-all" 
                                            onClick={() => navigate('/carte')}
                                        >
                                            <Maximize2 className="h-4 w-4 mr-2" />
                                            Plein écran
                                        </Button>
                                        <Button variant="outline" size="sm" className="bg-white/10 border-white/20 hover:bg-white/20 text-white transition-all" onClick={() => handleAction("Synchronisation AIS")}>
                                            <Activity className="h-4 w-4 mr-2" />
                                            Synchro
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="relative z-10 p-12">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <Badge className="bg-primary/20 text-primary border-primary/30 py-1 px-3">CONAKRY CRUDE GATEWAY</Badge>
                                    <h4 className="text-4xl font-black leading-tight tracking-tighter">
                                        Suivi Stratégique <br />
                                        <span className="text-primary italic">Approvisionnement National</span>
                                    </h4>
                                    <p className="text-slate-400 max-w-md leading-relaxed">
                                        Visualisation dynamique des flux d'importation. Les navires sont géolocalisés via les signaux AIS pour garantir une continuité de livraison vers les dépôts de la SGP.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-6 p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Origine Principale</p>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
                                            <p className="font-black text-lg">Golfe de Guinée</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Destination</p>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]"></div>
                                            <p className="font-black text-lg">Port de Conakry</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative aspect-square lg:aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-inner group">
                                <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/-13.7122,9.5092,4/800x600?access_token=YOUR_ACCESS_TOKEN')] bg-cover opacity-60"></div>
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent"></div>

                                {/* Animated Ship Trajectory */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative w-full h-full">
                                        <div className="absolute top-1/2 left-1/4 h-px w-1/2 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse"></div>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                            <div className="relative">
                                                <div className="absolute inset-0 scale-150 animate-ping opacity-20 bg-primary rounded-full"></div>
                                                <Ship className="h-10 w-10 text-primary drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-float" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 flex items-center justify-between transition-transform duration-500 group-hover:translate-y-[-8px]">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                                            <Ship className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold">FLOTTE STRATÉGIQUE</p>
                                            <p className="text-[10px] text-slate-400 font-mono">Surveillance en cours</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-emerald-500 text-white font-black text-[10px]">AIS ACTIF</Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Table Section */}
                <Card className="glass-card shadow-lg border-none">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle>Registre des Importations</CardTitle>
                                <CardDescription>Liste exhaustive des dossiers de cargaisons pétrolières</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative w-full md:w-[300px]">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Rechercher un dossier..."
                                        className="pl-9 bg-white/50"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Button variant="outline" size="sm" onClick={() => handleAction("ExportExcel")} className="gap-2 border-blue-200 text-emerald-700 hover:bg-blue-50">
                                    <Download className="h-4 w-4" />
                                    <span className="hidden sm:inline">Excel Certifié</span>
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleAction("DownloadReport")} className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
                                    <FileText className="h-4 w-4" />
                                    <span className="hidden sm:inline">Rapport PDF</span>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-xl border border-slate-100 overflow-hidden shadow-sm bg-white/30">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="font-bold">Dossier</TableHead>
                                        <TableHead className="font-bold">Produit</TableHead>
                                        <TableHead className="font-bold">Quantité</TableHead>
                                        <TableHead className="font-bold">Fournisseur</TableHead>
                                        <TableHead className="font-bold">Provenance</TableHead>
                                        <TableHead className="font-bold">Date Création</TableHead>
                                        <TableHead className="font-bold">Statut</TableHead>
                                        <TableHead className="text-right font-bold">Documents</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(importations || []).filter((imp: any) => 
                                        imp.numero_dossier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        imp.fournisseur?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        imp.produit?.nom?.toLowerCase().includes(searchTerm.toLowerCase())
                                    ).map((imp: any) => (
                                        <TableRow key={imp.id} className="hover:bg-primary/5 transition-colors cursor-pointer group">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Ship className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    {imp.numero_dossier}
                                                </div>
                                            </TableCell>
                                            <TableCell>{imp.produit?.nom}</TableCell>
                                            <TableCell>{(Number(imp.quantite_prevue)).toLocaleString()} T</TableCell>
                                            <TableCell>{imp.fournisseur?.nom}</TableCell>
                                            <TableCell>{imp.fournisseur?.pays}</TableCell>
                                            <TableCell>{new Date(imp.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>{getStatusBadge(imp.statut)}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <FileText className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-[200px]">
                                                        <DropdownMenuItem className="flex items-center gap-2" onClick={() => handleAction("Facture de cargaison")}>
                                                            <FileText className="h-4 w-4 text-emerald-500" />
                                                            <span>Dossier Import</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="flex items-center gap-2" onClick={() => handleAction("Certificat Qualité")}>
                                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                            <span>Analyse Labo</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
