
-- Migration: Workflow Compleat des Dossiers Administratifs SIHG
-- Date: 2026-03-16

-- Update Dossiers Table Statuses
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dossiers' AND column_name = 'statut') THEN
        -- Add check constraint for statuses if it doesn't exist
        -- But for now we just want to expand the allowed values logic in app.
    END IF;
END $$;

-- Track workflow steps better
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS current_step TEXT DEFAULT 'enregistrement';
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS rccm_url TEXT;
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS nif_url TEXT;
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS statuts_url TEXT;
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS autorisation_url TEXT;

-- Validation tracking columns
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS valide_par_da UUID REFERENCES auth.users(id);

-- Update status meanings:
-- 'nouveau' : Just submitted by company
-- 'en_cours_verification' : Registered by Agent Admin
-- 'analyse_technique' : Processed by DSA
-- 'analyse_administrative' : Processed by DA
-- 'analyse_juridique' : Processed by DJ/C
-- 'approuve' : Final decision by DG/DGA
-- 'rejete' : Final decision
-- 'archive' : Archived by Document Manager

-- Add RLS for new roles
CREATE POLICY "Direction Administrative can manage dossiers" ON public.dossiers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('directeur_administratif', 'chef_service_administratif', 'agent_administratif', 'gestionnaire_documentaire')
        )
    );

CREATE POLICY "Direction Aval can manage dossiers technical step" ON public.dossiers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('directeur_aval', 'directeur_adjoint_aval', 'chef_bureau_aval')
        )
    );

-- Trigger for notification when status change
-- (Simplified version using public.notifications if table exists)
CREATE OR REPLACE FUNCTION public.notify_dossier_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.statut <> NEW.statut THEN
        -- Insert into notifications table (assuming it has correct structure)
        -- Placeholder for real notification logic
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_dossier_status_change ON public.dossiers;
CREATE TRIGGER tr_dossier_status_change
    AFTER UPDATE ON public.dossiers
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_dossier_status_change();
