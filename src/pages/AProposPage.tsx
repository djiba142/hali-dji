import {
  Building2,
  Target,
  Users,
  Shield,
  BarChart3,
  Fuel,
  Globe,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import logoSihg from '@/assets/logo.png';

const stakeholders = [
  {
    id: 'sonap',
    name: 'Société Nationale des Pétroles',
    sigle: 'SONAP',
    role: 'Planification des importations',
    description: 'Détenteur du monopole d\'importation des hydrocarbures. Utilise le SIHG pour connaître les stocks nationaux et planifier les commandes.',
    icon: Globe,
    color: 'bg-emerald-500',
  },
  {
    id: 'sgp',
    name: 'Société Guinéenne des Pétroles',
    sigle: 'SGP',
    role: 'Logistique et distribution',
    description: 'Coordonne la logistique de sortie des dépôts et le déploiement des camions selon les alertes générées.',
    icon: Fuel,
    color: 'bg-red-500',
  },
];

const objectives = [
  {
    title: 'Souveraineté énergétique',
    description: 'Garantir l\'autonomie nationale en hydrocarbures par une gestion optimale des stocks.',
  },
  {
    title: 'Transparence totale',
    description: 'Traçabilité complète des opérations depuis l\'importation jusqu\'à la vente au détail.',
  },
  {
    title: 'Prévention des ruptures',
    description: 'Système d\'alerte précoce pour anticiper et prévenir les pénuries de carburant.',
  },
  {
    title: 'Contrôle des prix',
    description: 'Surveillance en temps réel du respect des prix officiels fixés par l\'État.',
  },
  {
    title: 'Planification optimisée',
    description: 'Données précises pour la planification des importations et de la distribution.',
  },
  {
    title: 'Coordination nationale',
    description: 'Plateforme unifiée pour tous les acteurs du secteur pétrolier.',
  },
];

const features = [
  'Suivi en temps réel des stocks dans toutes les stations',
  'Carte interactive avec géolocalisation des points de vente',
  'Alertes automatiques en cas de seuil critique',
  'Suivi des importations maritimes (pipeline maritime)',
  'Génération de rapports PDF/Excel personnalisés',
  'Tableaux de bord spécifiques par rôle',
  'Gestion des prix officiels par l\'État',
  'Historique complet des opérations',
];

export default function AProposPage() {
  return (
    <DashboardLayout
      title="À Propos"
      subtitle="Présentation du Système d'Information des Hydrocarbures de Guinée"
    >
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground p-8 mb-8">
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
          <div className="flex-shrink-0">
            <img
              src={logoSihg}
              alt="Logo SIHG"
              className="h-32 w-32 object-contain bg-white rounded-2xl p-4"
            />
          </div>
          <div>
            <Badge variant="secondary" className="mb-4">
              Plateforme Nationale
            </Badge>
            <h1 className="text-3xl lg:text-4xl font-bold font-display mb-4">
              Système d'Information des Hydrocarbures de Guinée
            </h1>
            <p className="text-lg text-primary-foreground/90 max-w-3xl">
              Le SIHG est la plateforme nationale de suivi et de gestion des stocks de carburant
              en République de Guinée. Elle permet une vision consolidée et en temps réel de
              l'ensemble du secteur pétrolier pour garantir la sécurité énergétique du pays.
            </p>
          </div>
        </div>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Objectives */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Objectifs du Système
          </CardTitle>
          <CardDescription>
            Les missions fondamentales du SIHG
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {objectives.map((obj, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium mb-1">{obj.title}</h4>
                    <p className="text-sm text-muted-foreground">{obj.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stakeholders */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Parties Prenantes
          </CardTitle>
          <CardDescription>
            Les institutions clés du secteur des hydrocarbures en Guinée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stakeholders.map((stakeholder) => (
              <div
                key={stakeholder.id}
                className="p-5 rounded-xl bg-card border border-border hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl ${stakeholder.color} flex items-center justify-center flex-shrink-0`}>
                    <stakeholder.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{stakeholder.sigle}</h4>
                      <Badge variant="outline" className="text-xs">
                        {stakeholder.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {stakeholder.name}
                    </p>
                    <p className="text-sm">
                      {stakeholder.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Fonctionnalités Principales
          </CardTitle>
          <CardDescription>
            Les capacités clés de la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
              >
                <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Structure des Données
          </CardTitle>
          <CardDescription>
            L'architecture hiérarchique du système
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 py-4">
            {/* Level 1 */}
            <div className="text-center p-6 rounded-xl bg-blue-500/10 border-2 border-blue-500/30 min-w-[200px]">
              <div className="h-12 w-12 rounded-full bg-blue-500 text-white flex items-center justify-center mx-auto mb-3">
                <span className="font-bold">1</span>
              </div>
              <h4 className="font-semibold text-blue-600 mb-1">Entreprises</h4>
              <p className="text-xs text-muted-foreground">
                Distributeurs agréés avec logo, licence et contacts
              </p>
            </div>

            <ArrowRight className="h-8 w-8 text-muted-foreground rotate-90 lg:rotate-0" />

            {/* Level 2 */}
            <div className="text-center p-6 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 min-w-[200px]">
              <div className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto mb-3">
                <span className="font-bold">2</span>
              </div>
              <h4 className="font-semibold text-emerald-600 mb-1">Stations</h4>
              <p className="text-xs text-muted-foreground">
                Points de vente avec GPS, capacités et stocks
              </p>
            </div>

            <ArrowRight className="h-8 w-8 text-muted-foreground rotate-90 lg:rotate-0" />

            {/* Level 3 */}
            <div className="text-center p-6 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 min-w-[200px]">
              <div className="h-12 w-12 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto mb-3">
                <span className="font-bold">3</span>
              </div>
              <h4 className="font-semibold text-amber-600 mb-1">Opérations</h4>
              <p className="text-xs text-muted-foreground">
                Ventes, livraisons et suivi des prix
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
