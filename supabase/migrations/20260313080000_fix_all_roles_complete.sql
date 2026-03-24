-- ================================================
-- CORRECTION COMPLÈTE ENUM APP_ROLE
-- Ajoute tous les rôles manquants dans la DB Supabase
-- ================================================

-- Ajout de tous les rôles manquants un par un (IF NOT EXISTS pour la sécurité)
DO $$
BEGIN

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'admin_etat') THEN
    ALTER TYPE public.app_role ADD VALUE 'admin_etat';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'directeur_general') THEN
    ALTER TYPE public.app_role ADD VALUE 'directeur_general';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'directeur_adjoint') THEN
    ALTER TYPE public.app_role ADD VALUE 'directeur_adjoint';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'superviseur_aval') THEN
    ALTER TYPE public.app_role ADD VALUE 'superviseur_aval';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'operateur_aval') THEN
    ALTER TYPE public.app_role ADD VALUE 'operateur_aval';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'technicien_aval') THEN
    ALTER TYPE public.app_role ADD VALUE 'technicien_aval';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'inspecteur') THEN
    ALTER TYPE public.app_role ADD VALUE 'inspecteur';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'analyste') THEN
    ALTER TYPE public.app_role ADD VALUE 'analyste';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'personnel_admin') THEN
    ALTER TYPE public.app_role ADD VALUE 'personnel_admin';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'service_it') THEN
    ALTER TYPE public.app_role ADD VALUE 'service_it';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'gerant_station') THEN
    ALTER TYPE public.app_role ADD VALUE 'gerant_station';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'responsable_stock') THEN
    ALTER TYPE public.app_role ADD VALUE 'responsable_stock';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'agent_station') THEN
    ALTER TYPE public.app_role ADD VALUE 'agent_station';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'operateur_entreprise') THEN
    ALTER TYPE public.app_role ADD VALUE 'operateur_entreprise';
  END IF;

END $$;

-- ================================================
-- CORRECTION DU TRIGGER handle_new_user
-- Lit le rôle depuis le metadata du JWT, évite le rôle par défaut erroné
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_role_text TEXT;
  v_role public.app_role;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  v_role_text := COALESCE(NEW.raw_user_meta_data->>'role', '');

  -- Insérer le profil de base (ignorer si déjà présent)
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, v_full_name, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  -- Assigner le rôle uniquement si valide, sinon ne rien faire (l'admin API le fera)
  IF v_role_text != '' THEN
    BEGIN
      v_role := v_role_text::public.app_role;
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, v_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    EXCEPTION WHEN invalid_text_representation THEN
      -- Rôle invalide dans les métadonnées, on ne crée pas de rôle par défaut
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- ================================================
-- CORRECTION DES POLITIQUES RLS pour user_roles
-- Permettre aux utilisateurs autorisés de gérer les rôles
-- ================================================
DROP POLICY IF EXISTS "Admin can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service IT can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authorized roles can manage user_roles" ON public.user_roles;

CREATE POLICY "Authorized roles can manage user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN (
      'super_admin', 
      'service_it', 
      'admin_etat', 
      'directeur_general', 
      'directeur_adjoint',
      'superviseur_aval'
    )
  )
);

DROP POLICY IF EXISTS "Authorized roles can manage profiles" ON public.profiles;
CREATE POLICY "Authorized roles can manage profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN (
      'super_admin',
      'service_it',
      'admin_etat',
      'directeur_general',
      'directeur_adjoint',
      'superviseur_aval',
      'responsable_entreprise'
    )
  )
);
