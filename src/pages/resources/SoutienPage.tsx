import React from 'react';
import { LandingLayout } from '@/components/landing/LandingLayout';
import { Headphones, Mail, Phone, MapPin, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function SoutienPage() {
    return (
        <LandingLayout>
            <div className="max-w-7xl mx-auto px-4 py-20">
                <div className="grid lg:grid-cols-5 gap-16">
                    <div className="lg:col-span-2 space-y-12">
                        <div>
                            <h1 className="text-5xl font-black text-[#1e3a8a] leading-tight mb-6">Assistance & Soutien</h1>
                            <p className="text-slate-600 text-lg">
                                Notre centre de support technique répond aux besoins des distributeurs et des agents de l'État 24h/24 et 7j/7.
                            </p>
                        </div>

                        <div className="space-y-6">
                            {[
                                { icon: <Mail className="h-6 w-6" />, label: "Email", val: "support@sihg-guinee.gn" },
                                { icon: <Phone className="h-6 w-6" />, label: "Téléphone", val: "+224 6XX XX XX XX" },
                                { icon: <MapPin className="h-6 w-6" />, label: "Adresse", val: "Ministère de l'Énergie, Conakry" }
                            ].map((c, i) => (
                                <div key={i} className="flex gap-4 p-6 rounded-3xl bg-slate-50 border border-slate-100 items-start">
                                    <div className="h-12 w-12 rounded-2xl bg-[#1e3a8a]/10 text-[#1e3a8a] flex items-center justify-center shrink-0">
                                        {c.icon}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-widest text-[#f97316] mb-1">{c.label}</h4>
                                        <p className="font-bold text-slate-800">{c.val}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-2xl shadow-slate-200/50">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <MessageSquare className="h-7 w-7" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">Ouvrir un ticket</h2>
                                    <p className="text-slate-500 text-sm">Réponse moyenne en moins de 2 heures</p>
                                </div>
                            </div>

                            <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Nom & Prénom</Label>
                                    <Input className="h-12 bg-slate-50 border-slate-100 rounded-xl" placeholder="Ex: Mamadou Diallo" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Identifiant Station (Optionnel)</Label>
                                    <Input className="h-12 bg-slate-50 border-slate-100 rounded-xl" placeholder="Ex: CON-001" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label>Sujet de l'assistance</Label>
                                    <Input className="h-12 bg-slate-50 border-slate-100 rounded-xl" placeholder="Ex: Problème de synchronisation IoT" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label>Message détaillé</Label>
                                    <Textarea className="min-h-[150px] bg-slate-50 border-slate-100 rounded-xl resize-none" placeholder="Décrivez votre problème avec précision..." />
                                </div>
                                <div className="md:col-span-2 pt-4">
                                    <Button className="w-full h-14 bg-[#1e3a8a] hover:bg-blue-900 rounded-2xl text-lg font-black gap-3 group">
                                        Envoyer ma demande
                                        <Send className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </LandingLayout>
    );
}
