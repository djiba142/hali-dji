import React from 'react';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { Compass, Zap, ShieldCheck, Map, ArrowRight } from 'lucide-react';

export default function GuidePage() {
    const steps = [
        {
            title: "Activation du Compte",
            desc: "Recevez vos accès officiels de l'Autorité de Régulation et personnalisez votre profil de station.",
            icon: <Zap className="h-6 w-6" />
        },
        {
            title: "Calibration des Cuves",
            desc: "Paramétrez les capacités nominales et les seuils d'alerte critique.",
            icon: <Map className="h-6 w-6" />
        },
        {
            title: "Gestion des Commandes",
            desc: "Passez vos commandes de réapprovisionnement directement via l'interface SIHG.",
            icon: <Compass className="h-6 w-6" />
        },
        {
            title: "Validation des Prix",
            desc: "Assurez-vous que les prix à la pompe sont synchronisés avec les tarifs nationaux.",
            icon: <ShieldCheck className="h-6 w-6" />
        }
    ];

    return (
        <LandingLayout>
            <div className="max-w-7xl mx-auto px-4 py-20">
                <div className="grid lg:grid-cols-2 gap-20 items-center mb-20">
                    <div className="space-y-8">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-[#1e3a8a] text-sm font-bold">
                            Introduction
                        </div>
                        <h1 className="text-5xl font-black text-slate-900 leading-tight">
                            Bienvenue dans le guide de la <span className="text-[#f97316]">Transition Numérique</span>.
                        </h1>
                        <p className="text-slate-600 text-xl leading-relaxed">
                            Ce guide a été conçu pour accompagner les acteurs du secteur pétrolier guinéen dans l'adoption du SIHG. Optimisez votre gestion et contribuez à la sécurité nationale.
                        </p>
                    </div>
                    <div className="relative">
                        <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl bg-slate-200 flex items-center justify-center">
                            <img
                                src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200&auto=format&fit=crop"
                                alt="Support technique"
                                className="w-full h-full object-cover opacity-50 grayscale"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 transition-transform">
                                    <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-[#1e3a8a] border-b-[10px] border-b-transparent ml-1" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {steps.map((step, i) => (
                        <div key={i} className="relative p-10 bg-white rounded-[2.5rem] border border-slate-100 hover:border-[#f97316]/30 hover:shadow-2xl transition-all group">
                            <div className="absolute top-6 left-6 text-slate-100 font-black text-6xl select-none group-hover:text-orange-50 transition-colors">
                                0{i + 1}
                            </div>
                            <div className="relative z-10 space-y-6">
                                <div className="h-14 w-14 rounded-2xl bg-[#1e3a8a] text-white flex items-center justify-center group-hover:bg-[#f97316] transition-colors shadow-lg">
                                    {step.icon}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 leading-tight">{step.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </LandingLayout>
    );
}
