import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Truck, Plus, Search, MapPin, Navigation, 
  Calendar, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, ShieldCheck
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function LogistiqueTransportPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <DashboardLayout 
      title="Transport Interne & Dispatch" 
      subtitle="Planification des mouvements de produits entre les dépôts et les centres de distribution."
    >
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Truck className="h-24 w-24" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Flotte Nationale</p>
            <h3 className="text-4xl font-black mt-1">128</h3>
            <p className="text-xs mt-4 flex items-center gap-1.5 bg-white/10 w-fit px-3 py-1 rounded-full">
              <CheckCircle2 className="h-3 w-3" /> Camions-citernes actifs
            </p>
          </Card>

          <Card className="border-none shadow-lg p-6">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">En transit aujourd'hui</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">14,200 T</h3>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                    T{i}
                  </div>
                ))}
              </div>
              <span className="text-xs font-bold text-blue-600">32 Trajets en cours</span>
            </div>
          </Card>

          <Card className="border-none shadow-lg p-6">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Alertes Sécurité</p>
            <h3 className="text-3xl font-black text-red-600 mt-1 flex items-center gap-2">
              03 <AlertTriangle className="h-6 w-6" />
            </h3>
            <p className="text-xs mt-4 text-slate-500">Retards météo ou incidents mineurs répertoriés.</p>
          </Card>
        </div>

        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border mt-8">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Rechercher un trajet, un camion ou un dépôt..." 
              className="pl-10 h-11 border-none bg-slate-50 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="h-11 px-6 rounded-xl gap-2 shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Planifier un Convoi
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TransportCard 
            id="TR-2026-881"
            from="Dépôt Kaloum"
            to="Dépôt Mamou"
            product="Essence"
            quantity="450 T"
            trucks={15}
            status="en_transit"
            eta="14:00"
          />
          <TransportCard 
            id="TR-2026-884"
            from="Port de Kamsar"
            to="Dépôt Kaloum"
            product="Gasoil"
            quantity="1,200 T"
            trucks={30}
            status="prevu"
            eta="18 Mars"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

function TransportCard({ id, from, to, product, quantity, trucks, status, eta }: any) {
  const statusConfig: any = {
    en_transit: "bg-blue-50 text-blue-600 border-blue-100",
    prevu: "bg-slate-50 text-slate-500 border-slate-100",
    termine: "bg-emerald-50 text-emerald-600 border-emerald-100"
  };

  return (
    <Card className="border-none shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300">
      <CardContent className="p-0">
        <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white border shadow-sm flex items-center justify-center text-indigo-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Transport ID</p>
              <h4 className="font-bold text-slate-900">{id}</h4>
            </div>
          </div>
          <Badge className={cn("px-3 py-1 uppercase text-[10px] font-black border-none", statusConfig[status])}>
            {status.replace('_', ' ')}
          </Badge>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-8 justify-between relative">
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Origine</p>
              <p className="font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-blue-500" /> {from}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Navigation className="h-4 w-4" />
              </div>
              <div className="h-px w-20 bg-slate-200 absolute top-1/2 -z-10" />
            </div>
            <div className="flex-1 text-right">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Destination</p>
              <p className="font-bold text-slate-900 flex items-center gap-2 justify-end">
                {to} <MapPin className="h-3.5 w-3.5 text-emerald-500" />
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Produit</p>
              <p className="text-sm font-black text-slate-900">{product}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Volume</p>
              <p className="text-sm font-black text-slate-900">{quantity}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-slate-400">Arrivée</p>
              <p className="text-sm font-black text-indigo-600 flex items-center justify-end gap-1">
                <Clock className="h-3.5 w-3.5" /> {eta}
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-dashed">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {[1,2,3].map(i => <div key={i} className="h-5 w-5 rounded-full border border-white bg-slate-200" />)}
              </div>
              <span className="text-[10px] font-bold text-slate-500">{trucks} citernes escortées</span>
            </div>
            <Button variant="ghost" size="sm" className="h-8 rounded-lg text-primary font-bold text-[10px] uppercase gap-2 hover:bg-primary/5">
              Suivi GPS <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
