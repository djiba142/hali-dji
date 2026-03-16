import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Station } from '@/types';
import { StockIndicator } from '@/components/dashboard/StockIndicator';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  MapPin, Ship, Warehouse, Building2, Anchor, Droplets, 
  Satellite, Map as MapIcon, AlertTriangle 
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import 'leaflet/dist/leaflet.css';

// Import logos for companies
import logoTotal from '@/assets/logos/total-energies.png';
import logoShell from '@/assets/logos/shell.jpg';
import logoTMI from '@/assets/logos/tmi.jpg';
import logoKP from '@/assets/logos/kamsar-petroleum.png';

const COMPANY_LOGOS: Record<string, string> = {
  'TOTAL': logoTotal,
  'SHELL': logoShell,
  'TMI': logoTMI,
  'KP': logoKP,
  'KAMSAR PETROLEUM': logoKP
};

const getCompanyLogo = (sigle: string) => {
  if (!sigle) return null;
  const s = sigle.toUpperCase();
  for (const key in COMPANY_LOGOS) {
    if (s.includes(key)) return COMPANY_LOGOS[key];
  }
  return null;
};

// Fix pour les marqueurs par défaut de Leaflet qui disparaissent avec Webpack/Vite
// On désactive le linter pour cette ligne car on modifie le prototype d'une librairie externe
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icônes de marqueurs personnalisés basés sur le niveau de stock
const createMarkerIcon = (level: 'critical' | 'warning' | 'healthy' | 'full' | 'maintenance') => {
  const colors = {
    critical: '#ef4444', // Rouge (Rupture / < 10%)
    warning: '#f59e0b',  // Orange (Faible / < 25%)
    healthy: '#22c55e',  // Vert (Normal / > 25%)
    full: '#22c55e',     // Vert (Plein)
    maintenance: '#3b82f6' // Bleu (Maintenance)
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <style>
        @keyframes pulse-red {
          0% { transform: scale(1) rotate(-45deg); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.1) rotate(-45deg); box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { transform: scale(1) rotate(-45deg); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .pulse-critical {
          animation: pulse-red 2s infinite;
        }
      </style>
      <div class="${level === 'critical' ? 'pulse-critical' : ''}" style="
        width: 32px;
        height: 32px;
        background: ${colors[level]};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const createDepotIcon = () => {
  return L.divIcon({
    className: 'depot-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: #0f172a;
        border: 2px solid #38bdf8;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l1-4h16l1 4Z"/><path d="M4 21V11"/><path d="M20 21V11"/><path d="M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4"/></svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const createShipIcon = () => {
  return L.divIcon({
    className: 'ship-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: #1e293b;
        border: 2px solid #fbbf24;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.93 1.56 5.38 3.32 6"/><path d="M12 10V2"/><path d="M12 10 7 8"/><path d="M12 10l5-2"/></svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

function getStockLevel(percentage: number): 'critical' | 'warning' | 'healthy' | 'full' {
  if (percentage < 10) return 'critical';
  if (percentage < 25) return 'warning';
  if (percentage < 75) return 'healthy';
  return 'full';
}

interface GuineaMapProps {
  stations: Station[];
  depots?: any[];
  ships?: any[];
  height?: string;
  showControls?: boolean;
}

export function GuineaMap({ 
  stations, 
  depots = [], 
  ships = [], 
  height = "400px", 
  showControls = true 
}: GuineaMapProps) {
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [mapKey, setMapKey] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [selectedDepot, setSelectedDepot] = useState<any>(null);
  const navigate = useNavigate();

  // Coordonnées du centre de la Guinée
  const guineaCenter: [number, number] = [10.0, -11.0];

  // Filtrer les stations avec coordonnées valides
  const stationsWithCoords = stations.filter(
    (s): s is Station & { coordonnees: { lat: number; lng: number } } =>
      !!s.coordonnees &&
      typeof s.coordonnees.lat === 'number' &&
      typeof s.coordonnees.lng === 'number'
  );

  // S'assurer qu'on est côté client (pour éviter les erreurs SSR avec Leaflet)
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSatelliteView = () => {
    setMapType('satellite');
    // Force le rechargement de la carte lors du changement de vue
    setMapKey(prev => prev + 1);
  };

  const handleStandardView = () => {
    setMapType('standard');
    setMapKey(prev => prev + 1);
  };

  if (!isClient) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-border bg-muted animate-pulse" style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-border" style={{ height }}>
      {showControls && (
        <div className="absolute top-3 right-3 z-[1000] flex gap-2">
          <Button
            size="sm"
            variant={mapType === 'standard' ? 'default' : 'outline'}
            onClick={handleStandardView}
            className="gap-1.5"
          >
            <MapIcon className="h-4 w-4" />
            Standard
          </Button>
          <Button
            size="sm"
            variant={mapType === 'satellite' ? 'default' : 'outline'}
            onClick={handleSatelliteView}
            className="gap-1.5"
          >
            <Satellite className="h-4 w-4" />
            Satellite
          </Button>
        </div>
      )}

      <MapContainer
        key={mapKey}
        center={guineaCenter}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution={mapType === 'standard'
            ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            : 'Tiles &copy; Esri'
          }
          url={mapType === 'standard'
            ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          }
        />

        {stationsWithCoords.map((station) => {
          const essencePercent = Math.round((station.stockActuel.essence / station.capacite.essence) * 100);
          const gasoilPercent = Math.round((station.stockActuel.gasoil / station.capacite.gasoil) * 100);
          const avgPercent = Math.round((essencePercent + gasoilPercent) / 2);
          
          // Prévision de rupture intelligente (Smart Pénurie)
          const daysLeft = avgPercent < 20 ? Math.max(1, Math.floor(avgPercent / 4)) : null; 
          const isCriticalRisk = (daysLeft !== null && daysLeft <= 2) || station.isRiskOfShortage;
          
          let level: 'critical' | 'warning' | 'healthy' | 'full' | 'maintenance' = getStockLevel(avgPercent);
          if (isCriticalRisk) level = 'critical';
          if (station.statut === 'fermee' || station.statut === 'en_travaux') {
            level = 'maintenance';
          }

          return (
            <Marker
              key={station.id}
              // Plus besoin de "!" ici grâce au filtre typé plus haut
              position={[station.coordonnees.lat, station.coordonnees.lng]}
              icon={createMarkerIcon(level)}
            >
              <Popup className="station-popup">
                <div className="p-3 min-w-[260px] bg-white dark:bg-slate-900 rounded-xl">
                  <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 p-2 flex items-center justify-center shadow-sm">
                        {getCompanyLogo(station.entrepriseSigle || '') ? (
                          <img 
                            src={getCompanyLogo(station.entrepriseSigle || '')!} 
                            alt={station.entrepriseSigle} 
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="font-black text-indigo-300 text-sm">
                            {(station.entrepriseSigle || station.entrepriseNom || '??').slice(0, 3).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-900 dark:text-white leading-tight">{station.nom}</h3>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-0.5">{station.entrepriseNom}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-[9px] font-black uppercase tracking-tighter h-5 px-1.5",
                      station.statut === 'ouverte' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : "text-blue-500 border-blue-500/20 bg-blue-500/5"
                    )}>
                      {station.statut === 'ouverte' ? 'Normal' : station.statut}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-3 mb-4">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-400 uppercase tracking-widest">Région</span>
                      <span className="text-slate-900 dark:text-slate-100">{station.region}</span>
                    </div>
                    
                    <div className="space-y-2 py-2 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Essence</span>
                        <span className={cn("text-xs font-black", essencePercent < 10 ? "text-red-500" : (essencePercent < 25 ? "text-amber-500" : "text-emerald-500"))}>
                          {station.stockActuel.essence.toLocaleString()} L
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", essencePercent < 10 ? "bg-red-500" : (essencePercent < 25 ? "bg-amber-500" : "bg-emerald-500"))} style={{ width: `${essencePercent}%` }} />
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Gasoil</span>
                        <span className={cn("text-xs font-black", gasoilPercent < 10 ? "text-red-500" : (gasoilPercent < 25 ? "text-amber-500" : "text-emerald-500"))}>
                          {station.stockActuel.gasoil.toLocaleString()} L
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", gasoilPercent < 10 ? "bg-red-500" : (gasoilPercent < 25 ? "bg-amber-500" : "bg-emerald-500"))} style={{ width: `${gasoilPercent}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold italic">
                      <span className="text-slate-400">Dernière livraison</span>
                      <span className="text-slate-600 dark:text-slate-300">{station.derniereLivraison?.date || '8 mars'}</span>
                    </div>
                  </div>

                  {isCriticalRisk && (
                    <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl animate-pulse">
                      <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2 justify-center">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {daysLeft !== null ? `Rupture sous ${daysLeft} jour${daysLeft > 1 ? 's' : ''}` : 'Rupture Imminente'}
                      </p>
                    </div>
                  )}

                    <Button 
                        size="sm" 
                        className="w-full h-10 rounded-xl bg-slate-900 dark:bg-primary text-white font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-transform"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/stations/${station.id}`);
                        }}
                    >
                      Supervision détaillée
                    </Button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Depots Layer */}
        {depots.map((depot) => (
          <Marker
            key={depot.id}
            position={[depot.latitude, depot.longitude]}
            icon={createDepotIcon()}
          >
            <Popup>
              <div className="p-3 min-w-[220px]">
                <div className="flex items-center gap-2 mb-2">
                  <Warehouse className="h-4 w-4 text-sky-500" />
                  <h3 className="font-black text-sm uppercase tracking-tight">{depot.nom}</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Capacité</span>
                    <span className="font-bold">{depot.capacite?.toLocaleString()} T</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stock Actuel</span>
                    <span className="font-black text-sky-500">{depot.stock?.toLocaleString()} T</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
                    <div 
                      className="h-full bg-sky-500" 
                      style={{ width: `${(depot.stock / depot.capacite) * 100}%` }} 
                    />
                  </div>
                </div>
                <Button 
                    size="sm" 
                    className="w-full mt-4 h-8 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] uppercase tracking-widest"
                    onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDepot(depot);
                    }}
                >
                    Voir détails
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Ships Layer */}
        {ships.map((ship) => (
          <Marker
            key={ship.id}
            position={[ship.latitude || 9.5, ship.longitude || -14.5]}
            icon={createShipIcon()}
          >
            <Popup>
              <div className="p-3 min-w-[220px]">
                <div className="flex items-center gap-2 mb-2">
                  <Ship className="h-4 w-4 text-amber-500" />
                  <h3 className="font-black text-sm uppercase tracking-tight">{ship.navire_nom}</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <Badge className="bg-amber-100 text-amber-600 border-none w-full justify-center">EN TRANSIT</Badge>
                  <div className="flex justify-between mt-2">
                    <span className="text-slate-400">Produit</span>
                    <span className="font-bold">{ship.carburant}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quantité</span>
                    <span className="font-bold">{ship.quantite_tonnes?.toLocaleString()} T</span>
                  </div>
                  <div className="flex justify-between text-blue-500 font-bold">
                    <span>ETA Conakry</span>
                    <span>{ship.date_arrivee_prevue || 'Sous 48h'}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-card/95 backdrop-blur-sm rounded-lg p-3 border border-border shadow-lg">
        <p className="text-xs font-medium mb-2">Niveau de stock</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Rupture (&lt;10%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span>Stock Faible (&lt;25%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Normal (&gt;25%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Maintenance</span>
          </div>
        </div>
      </div>

      {selectedDepot && (
        <Dialog open={!!selectedDepot} onOpenChange={(open) => !open && setSelectedDepot(null)}>
          <DialogContent className="max-w-md rounded-[2.5rem] border-none shadow-premium bg-white dark:bg-slate-900">
            <DialogHeader>
               <div className="h-14 w-14 rounded-2xl bg-sky-50 dark:bg-sky-900/20 text-sky-600 flex items-center justify-center mb-4">
                  <Warehouse className="h-8 w-8" />
               </div>
               <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">{selectedDepot.nom}</DialogTitle>
               <DialogDescription className="font-bold text-sky-600/60 uppercase text-[10px] tracking-[0.2em]">Fiche Technique du Dépôt Stratégique</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Coordonnées GPS</p>
                     <p className="text-sm font-black text-slate-700 dark:text-slate-200">{selectedDepot.latitude.toFixed(4)}, {selectedDepot.longitude.toFixed(4)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Région Administrative</p>
                     <p className="text-sm font-black text-slate-700 dark:text-slate-200">{selectedDepot.region || 'République de Guinée'}</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex justify-between items-end">
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Capacité Prévue</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{selectedDepot.capacite?.toLocaleString()} <span className="text-xs text-slate-400">TONNES</span></p>
                     </div>
                     <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Utilisation</p>
                        <p className="text-xl font-black text-sky-500">{Math.round((selectedDepot.stock / selectedDepot.capacite) * 100)}%</p>
                     </div>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5">
                     <div 
                        className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full shadow-[0_0_12px_rgba(56,189,248,0.4)]" 
                        style={{ width: `${(selectedDepot.stock / selectedDepot.capacite) * 100}%` }} 
                     />
                  </div>
               </div>

               <div className="p-4 rounded-3xl bg-slate-900 text-white relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 opacity-10">
                     <Droplets className="h-20 w-20" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Statut du Stock Actuel</p>
                  <div className="flex items-center gap-3">
                     <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                     <p className="text-xl font-black">{selectedDepot.stock?.toLocaleString()} Tonnes dispo.</p>
                  </div>
               </div>

               <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-800" onClick={() => setSelectedDepot(null)}>
                  Fermer la fiche
               </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}