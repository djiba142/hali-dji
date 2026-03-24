-- =====================================================
-- ÉTAPE 1 : Ajout des rôles manquants (DOIT ÊTRE EXÉCUTÉ SEUL EN PREMIER)
-- Copiez et exécutez UNIQUEMENT ce bloc dans le SQL Editor de Supabase,
-- puis exécutez le reste dans une 2e requête si besoin.
-- =====================================================

-- Ajout des rôles Direction Juridique
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'directeur_juridique';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'juriste';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'charge_conformite';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'assistant_juridique';

-- Ajout des rôles Direction Administrative et Financière (DAF)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'directeur_financier';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'controleur_financier';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'comptable';

-- Ajout des rôles Direction Importation / Approvisionnement
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'directeur_importation';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent_importation';

-- Ajout des rôles Direction Logistique
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'directeur_logistique';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent_logistique';

-- Ajout des rôles Top Management & Autres
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'directeur_general';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'directeur_adjoint';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technicien_aval';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operateur_entreprise';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'responsable_stock';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent_station';
