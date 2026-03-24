import React from 'react';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { HelpCircle, ChevronDown, MessageCircle } from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQPage() {
    const faqs = [
        {
            q: "Qui a accès au SIHG ?",
            a: "L'accès est limité aux personnels accrédités de la SONAP, du Ministère de l'Énergie et aux gérants de stations-service via leurs comptes distributeurs officiels."
        },
        {
            q: "Comment sont mesurés les stocks ?",
            a: "Les stocks sont mesurés par des capteurs IoT à ultrasons installés dans chaque cuve. Les données sont transmises par réseau sécurisé toutes les 15 minutes."
        },
        {
            q: "Que faire en cas d'erreur de prix affiché ?",
            a: "Les prix sont fixés centralement par l'État. Si une erreur est constatée, le gérant doit immédiatement ouvrir un ticket de support depuis son tableau de bord."
        },
        {
            q: "La plateforme fonctionne-t-elle sans internet ?",
            a: "Le SIHG dispose d'un mode hors-ligne pour la saisie manuelle. Les données sont synchronisées automatiquement dès que la connexion est rétablie."
        }
    ];

    return (
        <LandingLayout>
            <div className="max-w-4xl mx-auto px-4 py-20">
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 text-[#f97316] text-sm font-black uppercase tracking-widest">
                        <HelpCircle className="h-4 w-4" />
                        FAQ
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-[#1e3a8a]">Questions Fréquentes</h1>
                    <p className="text-slate-500 text-lg">
                        Tout ce que vous devez savoir sur le fonctionnement du Système Intégré des Hydrocarbures.
                    </p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8">
                    <Accordion type="single" collapsible className="w-full">
                        {faqs.map((faq, i) => (
                            <AccordionItem key={i} value={`item-${i}`} className="border-b border-slate-100 last:border-0 py-2">
                                <AccordionTrigger className="text-left font-bold text-slate-800 hover:text-[#1e3a8a] text-lg hover:no-underline">
                                    {faq.q}
                                </AccordionTrigger>
                                <AccordionContent className="text-slate-600 text-base leading-relaxed pt-2">
                                    {faq.a}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>

                <div className="mt-16 bg-slate-50 rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-8 border border-slate-200 border-dashed">
                    <div className="flex gap-6 items-center">
                        <div className="h-16 w-16 bg-[#1e3a8a] rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-900/20">
                            <MessageCircle className="h-8 w-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Vous avez d'autres questions ?</h3>
                            <p className="text-slate-500">Notre équipe de support est là pour vous aider 24/7.</p>
                        </div>
                    </div>
                    <button className="bg-white border-2 border-[#1e3a8a] text-[#1e3a8a] hover:bg-slate-50 px-8 py-3 rounded-2xl font-black transition-all">
                        Contactez-nous
                    </button>
                </div>
            </div>
        </LandingLayout>
    );
}
