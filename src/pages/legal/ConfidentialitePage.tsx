import React from 'react';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { Lock, Eye, ShieldCheck, FileText } from 'lucide-react';

export default function ConfidentialitePage() {
    return (
        <LandingLayout>
            <div className="max-w-4xl mx-auto px-4 py-20">
                <h1 className="text-4xl font-black text-[#1e3a8a] mb-8">Politique de Confidentialité</h1>

                <div className="space-y-12 text-slate-600 leading-relaxed">
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[#1e3a8a]">
                            <Lock className="h-6 w-6" />
                            <h2 className="text-2xl font-bold">Collecte des Données</h2>
                        </div>
                        <p>
                            Le SIHG collecte des données strictement nécessaires à la surveillance du secteur pétrolier :
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Données d'identification des responsables de stations (nom, téléphone, email).</li>
                            <li>Données de géolocalisation des infrastructures pétrolières.</li>
                            <li>Données techniques de stocks et de flux de carburant.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[#1e3a8a]">
                            <Eye className="h-6 w-6" />
                            <h2 className="text-2xl font-bold">Utilisation des Informations</h2>
                        </div>
                        <p>
                            Les données collectées sont utilisées exclusivement pour :
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>La prévention des ruptures de stock sur le territoire national.</li>
                            <li>La planification logistique de la SONAP.</li>
                            <li>La vérification de l'application des prix officiels.</li>
                            <li>L'établissement de statistiques nationales pour le Ministère de l'Énergie.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[#1e3a8a]">
                            <ShieldCheck className="h-6 w-6" />
                            <h2 className="text-2xl font-bold">Sécurité des Données</h2>
                        </div>
                        <p>
                            Toutes les données sont chiffrées et stockées sur des infrastructures certifiées. L'accès est strictement contrôlé par un système de gestion des rôles (Role-Based Access Control).
                        </p>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[#1e3a8a]">
                            <FileText className="h-6 w-6" />
                            <h2 className="text-2xl font-bold">Vos Droits</h2>
                        </div>
                        <p>
                            Conformément à la loi sur la protection des données personnelles en République de Guinée, vous disposez d'un droit d'accès, de rectification et de suppression des données vous concernant.
                        </p>
                    </section>
                </div>
            </div>
        </LandingLayout>
    );
}
