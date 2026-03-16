import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, AlertCircle, BarChart, FileSearch } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function PrevisionsPage() {
  return (
    <DashboardLayout title="Prévisions Énergétiques">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Prévisions Énergétiques</h1>
            <p className="text-muted-foreground mt-1">
              Anticipation de la demande nationale et prévision des besoins d'importation
            </p>
          </div>
          <Button className="gap-2">
            <FileSearch className="h-4 w-4" />
            Nouveau Rapport
          </Button>
        </div>

        <Alert className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-300">Alerte de Prévision - Trimestre 3</AlertTitle>
          <AlertDescription className="text-blue-700/80 dark:text-blue-400/80">
            Une hausse de la demande de Gasoil de 15% est prévue dans la région de Boké en raison de l'augmentation des activités minières. Un ajustement des quotas d'importation est recommandé.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-4">
              <CardTitle className="flex items-center text-lg gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Demande Projetée (Essence)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">25,400 <span className="text-base font-normal text-muted-foreground">m³ / mois</span></div>
              <p className="text-sm text-muted-foreground mt-2">
                Prévision calculée sur les 6 prochains mois avec une croissance moyenne estimée à 3.4%.
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-4">
              <CardTitle className="flex items-center text-lg gap-2">
                <TrendingUp className="h-5 w-5 text-stone-500" />
                Demande Projetée (Gasoil)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">42,100 <span className="text-base font-normal text-muted-foreground">m³ / mois</span></div>
              <p className="text-sm text-muted-foreground mt-2">
                Prévision impactée par les grands travaux de la rentrée économique (croissance : +8.2%).
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-4">
              <CardTitle className="flex items-center text-lg gap-2">
                <BarChart className="h-5 w-5 text-indigo-500" />
                Déficit Stratégique Est.
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-amber-500">1,200 <span className="text-base wfont-normal text-muted-foreground">m³ (Gasoil)</span></div>
              <p className="text-sm text-muted-foreground mt-2">
                Gap prévu pour le mois d'octobre si les arrivages n'augmentent pas.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-t-4 border-t-indigo-500">
          <CardHeader>
            <CardTitle>Modèle Prédictif de la Demande - S2 2026</CardTitle>
            <CardDescription>
              Comparaison entre la consommation réelle et le modèle prédictif SONAP (Intelligence Énergétique Nationale)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full bg-slate-50 dark:bg-slate-900 rounded-md border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <BarChart className="h-10 w-10 opacity-50 text-indigo-500" />
                <p>Projection algorithmique AI de la Sécurité Énergétique Nationale</p>
                <Button variant="outline" size="sm" className="mt-4">
                  <Download className="mr-2 h-4 w-4" />
                  Exporter PDF Stratégique
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
