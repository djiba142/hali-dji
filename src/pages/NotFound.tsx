import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Fuel, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("Erreur 404 : L'utilisateur a tenté d'accéder à une route inexistante :", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0f1f4a] to-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-[400px] w-[400px] bg-orange-500/10 rounded-full blur-[120px]" />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Icon */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Fuel className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* 404 Number */}
        <div className="relative mb-6">
          <h1 className="text-[140px] md:text-[200px] font-black text-white/5 leading-none select-none absolute inset-0 flex items-center justify-center">
            404
          </h1>
          <div className="relative py-12">
            <p className="text-sm font-black uppercase tracking-[0.4em] text-[#f97316] mb-4">
              Erreur 404 — Page Introuvable
            </p>
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
              Cette station est
              <br />
              <span className="text-[#f97316]">hors service</span>
            </h2>
          </div>
        </div>

        <p className="text-slate-400 text-lg mb-2 font-medium">
          La page <code className="text-[#f97316] bg-white/5 px-2 py-0.5 rounded font-mono text-sm">{location.pathname}</code> est introuvable.
        </p>
        <p className="text-slate-500 text-sm mb-10">
          Cette ressource n'existe pas ou a été déplacée dans le système d'information SIHG.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            className="bg-[#f97316] hover:bg-orange-600 text-white rounded-full px-8 h-12 gap-2 shadow-lg shadow-orange-500/20 font-black"
            asChild
          >
            <Link to="/">
              <Home className="h-4 w-4" />
              Retour à l'Accueil
            </Link>
          </Button>
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 rounded-full px-8 h-12 gap-2 font-semibold bg-transparent"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Page précédente
          </Button>
        </div>

        {/* Status indicator */}
        <div className="mt-16 flex items-center justify-center gap-2 text-slate-500 text-sm">
          <Radio className="h-4 w-4 text-slate-600" />
          <span>SIHG — Système Intégré des Hydrocarbures de Guinée</span>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
