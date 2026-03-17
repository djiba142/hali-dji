// SIHG v2.0.0 - Système Intégré des Hydrocarbures de Guinée
// Multi-Rôle: Super Admin, Admin État, Inspecteur, Analyste, Personnel Admin, Service IT, Resp. Entreprise
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { SessionLockOverlay } from "./components/auth/SessionLockOverlay";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RequireRole } from "./components/RequireRole";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SessionTimeout } from "./components/auth/SessionTimeout";

// Eager load critical pages (public pages)
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import NotFound from "./pages/NotFound";
import OrdersPage from "./pages/admin/OrdersPage";
import Index from "./pages/Index"; // Moved from lazy to eager load

// Lazy load non-critical pages (protected pages)
const EntreprisesPage = lazy(() => import("./pages/EntreprisesPage"));
const EntrepriseDetailPage = lazy(() => import("./pages/EntrepriseDetailPage"));
const StationsPage = lazy(() => import("./pages/StationsPage"));
const StationDetailPage = lazy(() => import("./pages/StationDetailPage"));
const AlertesPage = lazy(() => import("./pages/AlertesPage"));
const UtilisateursPage = lazy(() => import("./pages/UtilisateursPage"));
const RapportsPage = lazy(() => import("./pages/RapportsPage"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const EntrepriseInfoPage = lazy(() => import("./pages/EntrepriseInfoPage"));
const ParametresPage = lazy(() => import("./pages/ParametresPage"));
const ProfilPage = lazy(() => import("./pages/ProfilPage"));
const CartePage = lazy(() => import("./pages/CartePage"));
const ImportationsPage = lazy(() => import("./pages/ImportationsPage"));
const InspectionsPage = lazy(() => import("./pages/InspectionsPage"));
const AgentTerrainPage = lazy(() => import("./pages/AgentTerrainPage"));
const AProposPage = lazy(() => import("./pages/AProposPage"));

// Legal pages
const MentionsLegalesPage = lazy(() => import("./pages/legal/MentionsLegalesPage"));
const ConfidentialitePage = lazy(() => import("./pages/legal/ConfidentialitePage"));
const CGUPage = lazy(() => import("./pages/legal/CGUPage"));
const CookiesPage = lazy(() => import("./pages/legal/CookiesPage"));

// Resources pages
const DocumentationPage = lazy(() => import("./pages/resources/DocumentationPage"));
const FAQPage = lazy(() => import("./pages/resources/FAQPage"));
const GuidePage = lazy(() => import("./pages/resources/GuidePage"));
const SoutienPage = lazy(() => import("./pages/resources/SoutienPage"));

// Lazy load dashboards - Un par rôle
const DashboardEntreprise = lazy(() => import("@/pages/dashboards/DashboardEntreprise"));
const DashboardSuperAdmin = lazy(() => import("@/pages/dashboards/DashboardSuperAdmin"));
const DashboardAdminEtat = lazy(() => import("@/pages/dashboards/DashboardAdminEtat"));
const DashboardInspecteur = lazy(() => import("@/pages/dashboards/DashboardInspecteur"));
const DashboardAnalyste = lazy(() => import("@/pages/dashboards/DashboardAnalyste"));
const DashboardServiceIT = lazy(() => import("@/pages/dashboards/DashboardServiceIT"));
const DashboardDSA = lazy(() => import("@/pages/dashboards/DashboardDSA"));
const DashboardAdministratif = lazy(() => import("@/pages/dashboards/DashboardAdministratif"));
const DashboardLogistique = lazy(() => import("@/pages/dashboards/DashboardLogistique"));

// Intelligence & Analyse
const StatistiquesPage = lazy(() => import("@/pages/analyste/StatistiquesPage"));
const PrevisionsPage = lazy(() => import("@/pages/analyste/PrevisionsPage"));

const DashboardJuridique = lazy(() => import("@/pages/dashboards/DashboardJuridique"));
const DashboardFinance = lazy(() => import("@/pages/dashboards/DashboardFinance"));
const DashboardImportation = lazy(() => import("./pages/dashboards/DashboardImportation"));

// Finance Pages
const FinanceBudgetsPage = lazy(() => import("@/pages/finance/FinanceBudgetsPage"));
const FinanceFournisseursPage = lazy(() => import("@/pages/finance/FinanceFournisseursPage"));
const FinanceFacturesPage = lazy(() => import("@/pages/finance/FinanceFacturesPage"));
const FinancePaiementsPage = lazy(() => import("@/pages/finance/FinancePaiementsPage"));


const QuotasPage = lazy(() => import("@/pages/QuotasPage"));

// Importation Pages
const ImportFournisseursPage = lazy(() => import("@/pages/import/ImportFournisseursPage"));
const ImportDossiersPage = lazy(() => import("./pages/import/ImportDossiersPage"));
const ImportNaviresPage = lazy(() => import("./pages/import/ImportNaviresPage"));
const ImportProduitsPage = lazy(() => import("./pages/import/ImportProduitsPage"));

// Juridique Pages
const JuridiqueDossiersPage = lazy(() => import("./pages/juridique/DossiersPage"));
const JuridiqueContratsPage = lazy(() => import("./pages/juridique/ContratsPage"));
const JuridiqueConformitePage = lazy(() => import("./pages/juridique/ConformitePage"));
const JuridiqueLitigesPage = lazy(() => import("./pages/juridique/LitigesPage"));
const JuridiqueArchivesPage = lazy(() => import("./pages/juridique/ArchivesPage"));

// Logistique Pages
const LogistiqueDepotsPage = lazy(() => import("@/pages/logistique/LogistiqueDepotsPage"));
const LogistiqueReceptionsPage = lazy(() => import("./pages/logistique/LogistiqueReceptionsPage"));
const LogistiqueTransportPage = lazy(() => import("./pages/logistique/LogistiqueTransportPage"));

const AdminDossiersPage = lazy(() => import("./pages/AdminDossiersPage"));

// Loading component for lazy-loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Chargement...</p>
    </div>
  </div>
);

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

import { ThemeProvider } from "@/components/ThemeProvider";

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="sihg-ui-theme">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
          <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes - eager loaded */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                {/* Inspections: Admin + Inspecteur */}
                <Route path="/inspections" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval', 'agent_supervision_aval', 'inspecteur']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><InspectionsPage /></Suspense>} />
                </Route>
                <Route path="/agent-terrain" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'inspecteur', 'directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><AgentTerrainPage /></Suspense>} />
                </Route>
                <Route path="/acces-refuse" element={<AccessDeniedPage />} />

                {/* ═══════════════════════════════════════════════ */}
                {/* DASHBOARDS - CHAQUE RÔLE A LE SIEN             */}
                {/* ═══════════════════════════════════════════════ */}

                {/* Panel: Redirection intelligente vers le bon dashboard */}
                <Route path="/panel" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={[
                      'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 
                      'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_bureau_aval', 'agent_supervision_aval', 'controleur_distribution', 'technicien_support_dsa', 'technicien_flux', 'inspecteur', 'analyste', 
                      'personnel_admin', 'service_it', 'responsable_entreprise', 
                      'operateur_entreprise',
                      'secretaire_general',
                      'directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique',
                      'directeur_financier', 'controleur_financier', 'comptable',
                      'directeur_importation', 'agent_importation', 
                      'responsable_stations', 'gestionnaire_livraisons',
                      'directeur_administratif', 'chef_service_administratif', 'agent_administratif', 'gestionnaire_documentaire',
                      'directeur_logistique', 'agent_logistique', 'responsable_depots', 'responsable_transport', 'operateur_logistique',
                      'personnel_admin'
                    ]} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><Index /></Suspense>} />
                </Route>

                {/* Dashboard Super Admin */}
                <Route path="/dashboard/admin" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardSuperAdmin /></Suspense>} />
                </Route>

                {/* Dashboard Administrateur État (SONAP) */}
                <Route path="/dashboard/admin-etat" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardAdminEtat /></Suspense>} />
                </Route>

                {/* Dashboard DSA (Direction des Services Aval) */}
                <Route path="/dashboard/dsa" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_bureau_aval', 'agent_supervision_aval', 'controleur_distribution', 'technicien_support_dsa', 'technicien_flux', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardDSA /></Suspense>} />
                  <Route path="quotas" element={<Suspense fallback={<PageLoader />}><QuotasPage /></Suspense>} />
                </Route>

                {/* Dashboard Inspecteur */}
                <Route path="/dashboard/inspecteur" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['inspecteur', 'super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardInspecteur /></Suspense>} />
                </Route>

                {/* Dashboard Analyste */}
                <Route path="/dashboard/analyste" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['analyste', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardAnalyste /></Suspense>} />
                </Route>

                {/* Dashboard Juridique & Conformité */}
                <Route path="/dashboard/juridique" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardJuridique /></Suspense>} />
                </Route>

                {/* Dashboard Finance (DAF) */}
                <Route path="/dashboard/finance" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_financier', 'controleur_financier', 'comptable', 'super_admin', 'secretaire_general', 'directeur_general', 'directeur_adjoint', 'agent_administratif']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardFinance /></Suspense>} />
                </Route>

                {/* Dashboard Importation */}
                <Route path="/dashboard/importation" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_importation', 'agent_importation', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardImportation /></Suspense>} />
                </Route>

                {/* Dashboard Administratif */}
                <Route path="/dashboard/administratif" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_administratif', 'chef_service_administratif', 'agent_administratif', 'gestionnaire_documentaire', 'personnel_admin', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardAdministratif /></Suspense>} />
                </Route>

                {/* Workflow Dossiers SIHG - Accès partagé */}
                <Route path="/administratif/dossiers" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={[
                      'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general',
                      'directeur_administratif', 'chef_service_administratif', 'agent_administratif', 'gestionnaire_documentaire',
                      'directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval',
                      'directeur_juridique', 'juriste', 'charge_conformite', 'personnel_admin'
                    ]} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><AdminDossiersPage /></Suspense>} />
                </Route>

                {/* Dashboard Logistique */}
                <Route path="/dashboard/logistique" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_logistique', 'agent_logistique', 'responsable_depots', 'responsable_transport', 'operateur_logistique', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardLogistique /></Suspense>} />
                </Route>

                {/* Logistique Sub-Pages */}
                <Route path="/logistique/depots" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_logistique', 'responsable_depots', 'super_admin', 'directeur_general', 'directeur_adjoint']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><LogistiqueDepotsPage /></Suspense>} />
                </Route>

                <Route path="/logistique/transport" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_logistique', 'responsable_transport', 'super_admin', 'directeur_general', 'directeur_adjoint', 'responsable_entreprise', 'operateur_entreprise', 'gestionnaire_livraisons']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><LogistiqueTransportPage /></Suspense>} />
                </Route>

                <Route path="/logistique/receptions" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_logistique', 'agent_logistique', 'operateur_logistique', 'super_admin', 'directeur_general', 'directeur_adjoint']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><LogistiqueReceptionsPage /></Suspense>} />
                </Route>

                <Route path="/importations/fournisseurs" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_importation', 'agent_importation', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'directeur_aval', 'directeur_adjoint_aval']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ImportFournisseursPage /></Suspense>} />
                </Route>

                <Route path="/importations/dossiers" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_importation', 'agent_importation', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'directeur_juridique', 'juriste', 'directeur_financier', 'comptable']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ImportDossiersPage /></Suspense>} />
                </Route>

                <Route path="/importations/navires" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_importation', 'agent_importation', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'directeur_aval', 'directeur_adjoint_aval', 'technicien_flux']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ImportNaviresPage /></Suspense>} />
                </Route>

                <Route path="/importations/produits" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_importation', 'agent_importation', 'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ImportProduitsPage /></Suspense>} />
                </Route>

                {/* Module Juridique & Conformité */}
                <Route path="/juridique/dossiers" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><JuridiqueDossiersPage /></Suspense>} />
                </Route>

                <Route path="/juridique/contrats" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_juridique', 'juriste', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><JuridiqueContratsPage /></Suspense>} />
                </Route>

                <Route path="/juridique/conformite" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_juridique', 'charge_conformite', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><JuridiqueConformitePage /></Suspense>} />
                </Route>

                <Route path="/juridique/litiges" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_juridique', 'juriste', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><JuridiqueLitigesPage /></Suspense>} />
                </Route>

                <Route path="/juridique/archives" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><JuridiqueArchivesPage /></Suspense>} />
                </Route>

                <Route path="/finance/budget" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_financier', 'controleur_financier', 'super_admin', 'directeur_general', 'directeur_adjoint']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><FinanceBudgetsPage /></Suspense>} />
                </Route>

                <Route path="/finance/fournisseurs" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_financier', 'comptable', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><FinanceFournisseursPage /></Suspense>} />
                </Route>

                <Route path="/finance/factures" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_financier', 'controleur_financier', 'comptable', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><FinanceFacturesPage /></Suspense>} />
                </Route>

                <Route path="/finance/paiements" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_financier', 'comptable', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><FinancePaiementsPage /></Suspense>} />
                </Route>

                {/* Dashboard Service IT */}
                <Route path="/dashboard/service-it" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['service_it', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardServiceIT /></Suspense>} />
                </Route>

                {/* Dashboard Entreprise */}
                <Route path="/dashboard/entreprise" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['responsable_entreprise', 'responsable_stations', 'gestionnaire_livraisons', 'super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardEntreprise /></Suspense>} />
                </Route>




                {/* ═══════════════════════════════════════════════ */}
                {/* FONCTIONNALITÉS PARTAGÉES MAIS RESTREINTES      */}
                {/* ═══════════════════════════════════════════════ */}

                {/* Carte : Tous les rôles métier et stratégiques */}
                <Route path="/carte" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval', 'agent_supervision_aval', 'technicien_flux', 'inspecteur', 'analyste', 'responsable_entreprise', 'responsable_stations', 'gestionnaire_livraisons', 'operateur_entreprise', 'directeur_importation', 'directeur_juridique', 'directeur_financier']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><CartePage /></Suspense>} />
                </Route>

                {/* Entreprises : Admin + Inspecteur (lecture) + Analyste (lecture) + Personnel Admin + Directeurs */}
                <Route path="/entreprises" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_bureau_aval', 'agent_supervision_aval', 'inspecteur', 'analyste', 'directeur_juridique', 'juriste', 'directeur_importation']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><EntreprisesPage /></Suspense>} />
                </Route>

                <Route path="/entreprises/:id" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_bureau_aval', 'agent_supervision_aval', 'inspecteur', 'analyste', 'responsable_entreprise', 'operateur_entreprise', 'directeur_juridique', 'juriste', 'directeur_financier', 'directeur_importation']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><EntrepriseDetailPage /></Suspense>} />
                </Route>

                {/* Stations : Tous sauf Service IT et Personnel Admin */}
                <Route path="/stations" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval', 'agent_supervision_aval', 'inspecteur', 'analyste', 'responsable_entreprise', 'responsable_stations', 'gestionnaire_livraisons', 'operateur_entreprise', 'directeur_juridique']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><StationsPage /></Suspense>} />
                </Route>

                <Route path="/stations/:id" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval', 'agent_supervision_aval', 'inspecteur', 'analyste', 'responsable_entreprise', 'responsable_stations', 'gestionnaire_livraisons', 'operateur_entreprise']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><StationDetailPage /></Suspense>} />
                </Route>

                {/* Alertes : Admin + Inspecteur + Analyste + Entreprise */}
                <Route path="/alertes" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval', 'agent_supervision_aval', 'controleur_distribution', 'inspecteur', 'analyste', 'responsable_entreprise', 'responsable_stations', 'gestionnaire_livraisons', 'operateur_entreprise', 'directeur_juridique', 'charge_conformite']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><AlertesPage /></Suspense>} />
                </Route>

                {/* Importations: Admin + Analyste + Admin Etat + Direction Import */}
                <Route path="/importations" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_bureau_aval', 'agent_supervision_aval', 'analyste', 'directeur_importation', 'agent_importation', 'directeur_juridique']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ImportationsPage /></Suspense>} />
                </Route>

                {/* Quotas : DSA + Admin État */}
                <Route path="/quotas" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><QuotasPage /></Suspense>} />
                </Route>

                {/* Rapports : Admin + Inspecteur + Analyste + Entreprise */}
                <Route path="/rapports" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={[
                      'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 
                      'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'chef_bureau_aval', 'agent_supervision_aval', 'controleur_distribution', 'technicien_support_dsa', 'technicien_flux', 'operateur_entreprise',
                      'inspecteur', 'analyste', 'responsable_entreprise', 'responsable_stations', 'gestionnaire_livraisons',
                      'service_it',
                      'directeur_juridique', 'juriste', 'charge_conformite', 'assistant_juridique',
                      'directeur_financier', 'controleur_financier', 'comptable', 
                      'directeur_importation', 'agent_importation'
                    ]} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><RapportsPage /></Suspense>} />
                </Route>

                {/* Intelligence & Analyse (Statistiques et Prévisions) */}
                <Route path="/statistiques" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['analyste', 'directeur_general', 'directeur_adjoint', 'super_admin', 'admin_etat', 'secretaire_general']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><StatistiquesPage /></Suspense>} />
                </Route>

                <Route path="/previsions" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['analyste', 'directeur_general', 'directeur_adjoint', 'super_admin', 'admin_etat', 'secretaire_general']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><PrevisionsPage /></Suspense>} />
                </Route>

                {/* ═══════════════════════════════════════════════ */}
                {/* ADMINISTRATION SYSTÈME                          */}
                {/* ═══════════════════════════════════════════════ */}

                {/* Utilisateurs : Super Admin + Service IT */}
                <Route path="/utilisateurs" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'directeur_aval', 'directeur_adjoint_aval', 'service_it', 'responsable_entreprise', 'directeur_financier', 'directeur_juridique', 'directeur_importation']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><UtilisateursPage /></Suspense>} />
                </Route>

                {/* Commandes : Admin État, DSA, Entreprise, Inspecteur, Analyste */}
                <Route path="/admin/commandes" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['directeur_general', 'directeur_adjoint', 'admin_etat', 'secretaire_general', 'super_admin', 'directeur_aval', 'directeur_adjoint_aval', 'chef_division_distribution', 'responsable_entreprise', 'gestionnaire_livraisons', 'operateur_entreprise', 'inspecteur', 'analyste']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<OrdersPage />} />
                </Route>

                {/* Paramètres : Super Admin uniquement */}
                <Route path="/parametres" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><ParametresPage /></Suspense>} />
                </Route>

                {/* Audit : Super Admin + Service IT */}
                <Route path="/audit" element={
                  <ProtectedRoute>
                    <RequireRole allowedRoles={['super_admin', 'directeur_general', 'directeur_adjoint', 'service_it']} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<PageLoader />}><AuditPage /></Suspense>} />
                </Route>

                {/* ═══════════════════════════════════════════════ */}
                {/* PAGES COMMUNES                                  */}
                {/* ═══════════════════════════════════════════════ */}

                <Route path="/profil" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <ProfilPage />
                    </Suspense>
                  </ProtectedRoute>
                } />

                <Route path="/a-propos" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <AProposPage />
                    </Suspense>
                  </ProtectedRoute>
                } />

                <Route path="/entreprise-info" element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <EntrepriseInfoPage />
                    </Suspense>
                  </ProtectedRoute>
                } />

                {/* Pages légales (publiques) */}
                <Route path="/mentions-legales" element={<Suspense fallback={<PageLoader />}><MentionsLegalesPage /></Suspense>} />
                <Route path="/confidentialite" element={<Suspense fallback={<PageLoader />}><ConfidentialitePage /></Suspense>} />
                <Route path="/cgu" element={<Suspense fallback={<PageLoader />}><CGUPage /></Suspense>} />
                <Route path="/cookies" element={<Suspense fallback={<PageLoader />}><CookiesPage /></Suspense>} />

                {/* Pages ressources (publiques) */}
                <Route path="/documentation" element={<Suspense fallback={<PageLoader />}><DocumentationPage /></Suspense>} />
                <Route path="/faq" element={<Suspense fallback={<PageLoader />}><FAQPage /></Suspense>} />
                <Route path="/guide" element={<Suspense fallback={<PageLoader />}><GuidePage /></Suspense>} />
                <Route path="/soutien" element={<Suspense fallback={<PageLoader />}><SoutienPage /></Suspense>} />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
