-- Migration: Add extra validation columns to dossiers
-- Date: 2026-03-16

ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS valide_par_dsa UUID REFERENCES auth.users(id);
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS valide_par_djc UUID REFERENCES auth.users(id);
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS valide_par_dsi UUID REFERENCES auth.users(id);

-- Update RLS for Direction Juridique
CREATE POLICY "Direction Juridique can view and update dossiers analyze step" ON public.dossiers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('directeur_juridique', 'juriste', 'charge_conformite')
        )
    );

-- Update RLS for DG/DGA (DSI role used as proxy or super admins)
CREATE POLICY "Direction General can approve dossiers" ON public.dossiers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('directeur_general', 'directeur_adjoint', 'super_admin')
        )
    );
