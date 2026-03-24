import React from 'react';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { Cookie, Info, ToggleRight, ShieldCheck } from 'lucide-react';

export default function CookiesPage() {
    return (
        <LandingLayout>
            <div className="max-w-4xl mx-auto px-4 py-20">
                <h1 className="text-4xl font-black text-[#1e3a8a] mb-8">Gestion des Cookies</h1>

                <div className="space-y-12 text-slate-600 leading-relaxed">
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[#1e3a8a]">
                            <Cookie className="h-6 w-6" />
                            <h2 className="text-2xl font-bold">Qu'est-ce qu'un cookie ?</h2>
                        </div>
                        <p>
                            Un cookie est un petit fichier texte déposé sur votre terminal lors de la visite d'un site. Il permet de mémoriser vos préférences et d'optimiser votre navigation.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[#1e3a8a]">
                            <ShieldCheck className="h-6 w-6" />
                            <h2 className="text-2xl font-bold">Utilisation sur le SIHG</h2>
                        </div>
                        <p>
                            Nous utilisons uniquement des cookies strictement nécessaires au fonctionnement technique de la plateforme :
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Cookies de session pour maintenir votre connexion active.</li>
                            <li>Cookies de sécurité pour prévenir les attaques de type CSRF.</li>
                            <li>Cookies de préférences pour mémoriser votre choix de langue ou de région.</li>
                        </ul>
                        <p className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm italic">
                            Note : Le SIHG ne dépose aucun cookie publicitaire ou de tracking tiers.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[#1e3a8a]">
                            <ToggleRight className="h-6 w-6" />
                            <h2 className="text-2xl font-bold">Gestion des préférences</h2>
                        </div>
                        <p>
                            La plupart des navigateurs vous permettent de refuser ou d'accepter les cookies. Cependant, si vous bloquez tous les cookies, vous ne pourrez pas utiliser les fonctions authentifiées du SIHG (Tableau de bord, gestion des stocks, etc.).
                        </p>
                    </section>
                </div>
            </div>
        </LandingLayout>
    );
}
