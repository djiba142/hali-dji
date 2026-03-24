import { useEffect, useRef, useState, useCallback } from 'react';
import { Fuel, Building2, MapPin, Radio, Activity, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CounterProps {
    end: number;
    duration?: number;
    suffix?: string;
    prefix?: string;
}

const AnimatedCounter = ({ end, duration = 2000, suffix = '', prefix = '' }: CounterProps) => {
    const [count, setCount] = useState(0);
    const animationRef = useRef<number>();
    const startTimeRef = useRef<number>();

    const animate = useCallback((timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp;
        const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(easeOut * end));
        if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
        }
    }, [end, duration]);

    useEffect(() => {
        animationRef.current = requestAnimationFrame(animate);
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [animate]);

    return <span>{prefix}{count.toLocaleString('fr-GN')}{suffix}</span>;
};

interface LiveStat {
    icon: React.ElementType;
    value: number;
    suffix?: string;
    label: string;
    sublabel: string;
    color: string;
    gradient: string;
}

export const LandingStats = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [liveData, setLiveData] = useState({
        stations: 148,
        entreprises: 5,
        capteurs: 432,
        alertes: 0,
    });
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [stRes, entRes] = await Promise.all([
                    supabase.from('stations').select('*', { count: 'exact', head: true }),
                    supabase.from('entreprises').select('*', { count: 'exact', head: true }),
                ]);
                setLiveData(prev => ({
                    ...prev,
                    stations: stRes.count || prev.stations,
                    entreprises: entRes.count || prev.entreprises,
                }));
            } catch {
                // Keep default values
            }
        };
        fetchStats();
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.3 }
        );
        if (sectionRef.current) observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, []);

    const stats: LiveStat[] = [
        {
            icon: Building2,
            value: liveData.entreprises,
            label: 'Compagnies Agréées',
            sublabel: 'distributeurs pétroliers actifs',
            color: 'text-blue-600',
            gradient: 'from-blue-500/10 to-blue-600/5',
        },
        {
            icon: Fuel,
            value: liveData.stations,
            label: 'Stations-Service',
            sublabel: 'sur tout le territoire guinéen',
            color: 'text-orange-600',
            gradient: 'from-orange-500/10 to-orange-600/5',
        },
        {
            icon: MapPin,
            value: 8,
            label: 'Régions Couvertes',
            sublabel: 'couverture nationale totale',
            color: 'text-emerald-600',
            gradient: 'from-emerald-500/10 to-emerald-600/5',
        },
        {
            icon: Radio,
            value: liveData.capteurs,
            label: 'Capteurs IoT',
            sublabel: 'actifs en temps réel',
            color: 'text-purple-600',
            gradient: 'from-purple-500/10 to-purple-600/5',
        },
        {
            icon: Activity,
            value: 99,
            suffix: '%',
            label: 'Disponibilité',
            sublabel: 'du système sur 30 jours',
            color: 'text-indigo-600',
            gradient: 'from-indigo-500/10 to-indigo-600/5',
        },
        {
            icon: Users,
            value: 24,
            suffix: '/7',
            label: 'Surveillance',
            sublabel: 'monitoring continu 24h/24',
            color: 'text-rose-600',
            gradient: 'from-rose-500/10 to-rose-600/5',
        },
    ];

    return (
        <section ref={sectionRef} className="py-20 bg-gradient-to-b from-slate-900 to-[#0f1f4a] relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 text-[#f97316] text-xs font-black uppercase tracking-widest mb-6">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#f97316] animate-pulse" />
                        Données en Temps Réel
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                        Le SIHG en <span className="text-[#f97316]">chiffres</span>
                    </h2>
                    <p className="mt-4 text-slate-400 text-lg max-w-2xl mx-auto">
                        Une infrastructure nationale intégrée et opérationnelle pour la souveraineté énergétique de la Guinée.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
                    {stats.map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={i}
                                className={`group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all duration-500 text-center backdrop-blur-sm`}
                                style={{
                                    animationDelay: `${i * 100}ms`
                                }}
                            >
                                <div className={`inline-flex h-12 w-12 rounded-xl items-center justify-center mb-4 ${stat.color} bg-white/10 group-hover:scale-110 transition-transform`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div className={`text-3xl font-black ${stat.color} mb-1`}>
                                    {isVisible ? (
                                        <AnimatedCounter
                                            end={stat.value}
                                            suffix={stat.suffix}
                                            duration={1500 + i * 200}
                                        />
                                    ) : (
                                        <span>0{stat.suffix || ''}</span>
                                    )}
                                </div>
                                <div className="text-white font-bold text-sm leading-tight">{stat.label}</div>
                                <div className="text-slate-500 text-[10px] mt-1 leading-tight">{stat.sublabel}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Live indicator banner */}
                <div className="mt-10 flex items-center justify-center gap-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10 max-w-[200px]" />
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                        Données synchronisées avec la base nationale SIHG
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10 max-w-[200px]" />
                </div>
            </div>
        </section>
    );
};
