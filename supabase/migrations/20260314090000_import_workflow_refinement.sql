-- ================================================
-- REFINEMENT DU WORKFLOW IMPORTATION - SIHG v2.1
-- ================================================

-- 1. Mise à jour de la table import_dossiers pour le workflow complet
ALTER TABLE public.import_dossiers 
ADD COLUMN IF NOT EXISTS contrat_url TEXT,
ADD COLUMN IF NOT EXISTS licence_url TEXT,
ADD COLUMN IF NOT EXISTS facture_url TEXT,
ADD COLUMN IF NOT EXISTS valide_juridique_par UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS valide_juridique_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS valide_finance_par UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS valide_finance_at TIMESTAMP WITH TIME ZONE;

-- Mise à jour des statuts possibles (explications via commentaires ou contraintes si nécessaire)
-- Statuts : 'en_preparation', 'attente_juridique', 'attente_paiement', 'en_transport', 'arrive', 'receptionne'

-- 2. Mise à jour des Politiques RLS pour inclure les nouvelles directions dans le module Importation
-- Suppression des anciennes politiques pour recréer proprement
DROP POLICY IF EXISTS "Import users management" ON public.import_dossiers;

CREATE POLICY "Dossiers access policy" ON public.import_dossiers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN (
                'super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint',
                'directeur_importation', 'agent_importation',
                'directeur_logistique', 'agent_logistique',
                'directeur_juridique', 'juriste', 'charge_conformite',
                'directeur_financier', 'comptable', 'controleur_financier',
                'superviseur_aval', 'operateur_aval' -- Accès lecture seule pour l'Aval
            )
        )
    );

CREATE POLICY "Dossiers creation/update policy" ON public.import_dossiers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'directeur_importation', 'agent_importation', 'directeur_logistique', 'agent_logistique')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'directeur_importation', 'agent_importation', 'directeur_logistique', 'agent_logistique')
        )
    );

-- Politique spécifique pour la validation Juridique
CREATE POLICY "Juridique validation policy" ON public.import_dossiers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'directeur_juridique', 'juriste', 'charge_conformite')
        )
    );

-- Politique spécifique pour la validation Financière
CREATE POLICY "Finance validation policy" ON public.import_dossiers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'directeur_financier', 'comptable', 'controleur_financier')
        )
    );

-- 3. Vue simplifiée pour la Direction Aval (Optionnel mais recommandé pour les jointures)
CREATE OR REPLACE VIEW public.import_dossiers_aval_view AS
SELECT 
    d.numero_dossier,
    p.nom as produit,
    d.quantite_prevue as quantite,
    f.nom as fournisseur,
    d.date_arrivee_est as eta,
    d.statut
FROM public.import_dossiers d
JOIN public.import_produits p ON d.produit_id = p.id
JOIN public.import_fournisseurs f ON d.fournisseur_id = f.id;

GRANT SELECT ON public.import_dossiers_aval_view TO authenticated;
