import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, BarChart3, TrendingUp, TrendingDown, Activity, Battery } from 'lucide-react';

export default function StatistiquesPage() {
  return (
    <DashboardLayout title="Statistiques Nationales">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Statistiques Nationales</h1>
            <p className="text-muted-foreground mt-1">
              Données de consommation et distribution à l'échelle nationale
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exporter les données
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consommation Totale (30j)</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">14,350 m³</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
                <span className="text-emerald-500 font-medium">+2.5%</span> par rapport au mois précédent
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Répartition Essence</CardTitle>
              <Battery className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">6,800 m³</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                <span className="text-red-500 font-medium">-1.2%</span> par rapport au mois précédent
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Répartition Gasoil</CardTitle>
              <Battery className="h-4 w-4 text-stone-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7,550 m³</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
                <span className="text-emerald-500 font-medium">+4.1%</span> par rapport au mois précédent
              </p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Régions Couvertes</CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8 / 8</div>
              <p className="text-xs text-muted-foreground mt-1">
                Couverture nationale complète
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Section: Évolution détaillée (placeholder graphique) */}
          <Card className="col-span-1 md:col-span-2 shadow-sm border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle>Évolution de la consommation par trimestre</CardTitle>
              <CardDescription>
                Analyse comparative des volumes de distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full bg-slate-50 dark:bg-slate-900 rounded-md border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <BarChart3 className="h-8 w-8 opacity-50" />
                  <p>Graphique des tendances trimestrielles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
