-- Ajouté le 2026-03-16 pour aligner avec la structure SONAP demandée par l'utilisateur
-- Rôles Direction des Services Aval (DSA)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'directeur_aval';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'directeur_adjoint_aval';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'chef_division_distribution';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'chef_bureau_aval';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent_supervision_aval';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'controleur_distribution';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technicien_support_dsa';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technicien_flux';
