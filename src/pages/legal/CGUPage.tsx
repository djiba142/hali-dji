import React from 'react';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { CheckCircle2, AlertTriangle, Scale, UserCheck } from 'lucide-react';

export default function CGUPage() {
    return (
        <LandingLayout>
            <div className="max-w-4xl mx-auto px-4 py-20">
                <h1 className="text-4xl font-black text-[#1e3a8a] mb-8">Conditions Générales d'Utilisation</h1>

                <div className="space-y-12 text-slate-600 leading-relaxed">
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[#1e3a8a]">
                            <UserCheck className="h-6 w-6" />
                            <h2 className="text-2xl font-bold">1. Accès au Service</h2>
                        </div>
                        <p>
                            L'accès aux fonctionnalités d'administration du SIHG est strictement réservé aux personnels habilités de la SONAP, du Ministère de l'Énergie et des distributeurs agréés. Tout accès non autorisé est passible de poursuites.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[#1e3a8a]">
                            <CheckCircle2 className="h-6 w-6" />
                            <h2 className="text-2xl font-bold">2. Obligations des Utilisateurs</h2>
                        </div>
                        <p>
                            Les utilisateurs s'engagent à :
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Maintenir la confidentialité de leurs identifiants de connexion.</li>
                            <li>Fournir des données de stock et de livraison exactes et sincères.</li>
                            <li>Signaler toute faille de sécurité ou anomalie constatée.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[#1e3a8a]">
                            <AlertTriangle className="h-6 w-6" />
                            <h2 className="text-2xl font-bold">3. Sanctions</h2>
                        </div>
                        <p>
                            Toute manipulation frauduleuse des données de stock ou tentative de contournement des prix officiels via la plateforme entraînera le blocage immédiat du compte et pourra faire l'objet de sanctions administratives ou pénales par les autorités compétentes.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-3 text-[#1e3a8a]">
                            <Scale className="h-6 w-6" />
                            <h2 className="text-2xl font-bold">4. Droit Applicable</h2>
                        </div>
                        <p>
                            Les présentes CGU sont régies par le droit guinéen. En cas de litige, les tribunaux de Conakry seront seuls compétents.
                        </p>
                    </section>
                </div>
            </div>
        </LandingLayout>
    );
}
