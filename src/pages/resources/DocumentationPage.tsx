import React from 'react';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { BookOpen, Search, Download, FileText, Settings, Database } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function DocumentationPage() {
    const sections = [
        {
            title: 'Guide d\'Utilisation',
            items: [
                'Gestion des stocks et inventaires',
                'Passation de commande à la SONAP',
                'Suivi des livraisons et bons de décharge',
                'Analyse des tableaux de bord'
            ]
        },
        {
            title: 'Documentation Technique',
            items: [
                'Installation des capteurs IoT NEXUS',
                'Configuration des terminaux de vente',
                'API de synchronisation pour distributeurs',
                'Protocoles de sécurité et chiffrement'
            ]
        }
    ];

    return (
        <LandingLayout>
            <div className="bg-slate-900 text-white py-20">
                <div className="max-w-7xl mx-auto px-4 text-center space-y-6">
                    <h1 className="text-4xl md:text-5xl font-black">Centre de Documentation</h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Retrouvez tous les guides techniques et manuels d'utilisation du Système Intégré des Hydrocarbures de Guinée.
                    </p>
                    <div className="max-w-xl mx-auto relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <Input
                            className="bg-white/10 border-white/20 pl-12 h-14 rounded-2xl text-lg focus:ring-[#f97316]"
                            placeholder="Rechercher un guide, un article..."
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-20">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sections.map((section, i) => (
                        <div key={i} className="space-y-6">
                            <h2 className="text-xl font-bold flex items-center gap-3 text-[#1e3a8a]">
                                <BookOpen className="h-6 w-6" />
                                {section.title}
                            </h2>
                            <div className="space-y-3">
                                {section.items.map((item, j) => (
                                    <button key={j} className="w-full text-left p-4 rounded-xl border border-slate-100 bg-white hover:border-[#f97316]/30 hover:shadow-md transition-all flex items-center justify-between group">
                                        <span className="text-slate-600 font-medium group-hover:text-[#1e3a8a]">{item}</span>
                                        <Download className="h-4 w-4 text-slate-400 group-hover:text-[#f97316]" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="bg-gradient-to-br from-[#1e3a8a] to-[#1e3a8a]/90 rounded-3xl p-8 text-white relative overflow-hidden">
                        <div className="relative z-10 flex flex-col h-full">
                            <Settings className="h-12 w-12 text-orange-400 mb-6" />
                            <h2 className="text-2xl font-bold mb-4">Besoin d'aide technique ?</h2>
                            <p className="text-blue-100 text-sm mb-auto">
                                Nos équipes sont disponibles pour accompagner l'installation matérielle des capteurs dans vos stations.
                            </p>
                            <button className="mt-8 bg-[#f97316] hover:bg-orange-600 px-6 py-3 rounded-xl font-bold transition-colors">
                                Contacter le support
                            </button>
                        </div>
                        <Database className="absolute -bottom-10 -right-10 h-40 w-40 text-white/5" />
                    </div>
                </div>
            </div>
        </LandingLayout>
    );
}
