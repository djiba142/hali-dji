import { Building2, MapPin, Fuel, ChevronRight } from 'lucide-react';
import { Entreprise } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface EntrepriseCardProps {
  entreprise: Entreprise;
}

const typeLabels = {
  compagnie: 'Compagnie',
  distributeur: 'Distributeur'
};

const statusStyles = {
  actif: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  suspendu: 'bg-amber-100 text-amber-700 border-amber-200',
  ferme: 'bg-red-100 text-red-700 border-red-200'
};

const statusLabels = {
  actif: 'Actif',
  suspendu: 'Suspendu',
  ferme: 'Fermé'
};

export function EntrepriseCard({ entreprise }: EntrepriseCardProps) {
  return (
    <Link 
      to={`/entreprises/${entreprise.id}`}
      className="block stat-card group hover:border-primary/30 transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="h-14 w-14 rounded-xl bg-white flex items-center justify-center flex-shrink-0 border border-border overflow-hidden">
          {entreprise.logo ? (
            <img 
              src={entreprise.logo} 
              alt={`Logo ${entreprise.sigle}`}
              className="h-12 w-12 object-contain"
            />
          ) : (
            <span className="text-xl font-bold text-primary">
              {entreprise.sigle.substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {entreprise.nom}
            </h3>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0",
              statusStyles[entreprise.statut]
            )}>
              {statusLabels[entreprise.statut]}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {typeLabels[entreprise.type]}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {entreprise.region}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">
                {entreprise.nombreStations} stations
              </span>
            </div>
            
            <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </Link>
  );
}
