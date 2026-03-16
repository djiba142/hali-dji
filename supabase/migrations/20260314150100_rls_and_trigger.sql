-- =====================================================
-- ÉTAPE 2 : Politiques RLS et Trigger (EXÉCUTER APRÈS L'ÉTAPE 1)
-- =====================================================

-- Drop l'ancien constraint s'il existe
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- =====================================================
-- Mise à jour des politiques RLS sur user_roles
-- =====================================================

DROP POLICY IF EXISTS "Admins can insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can read roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_insert_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_update_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_delete_roles" ON public.user_roles;
DROP POLICY IF EXISTS "read_own_role" ON public.user_roles;
DROP POLICY IF EXISTS "select_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "insert_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "update_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "delete_user_roles" ON public.user_roles;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_user_roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "insert_user_roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN (
          'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat',
          'service_it', 'superviseur_aval', 'responsable_entreprise',
          'directeur_juridique', 'directeur_financier', 'directeur_importation', 'directeur_logistique'
        )
    )
  );

CREATE POLICY "update_user_roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN (
          'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat',
          'service_it', 'superviseur_aval', 'responsable_entreprise',
          'directeur_juridique', 'directeur_financier', 'directeur_importation', 'directeur_logistique'
        )
    )
  );

CREATE POLICY "delete_user_roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN (
          'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat',
          'service_it', 'superviseur_aval', 'responsable_entreprise',
          'directeur_juridique', 'directeur_financier', 'directeur_importation', 'directeur_logistique'
        )
    )
  );

-- =====================================================
-- Mise à jour des politiques RLS sur profiles
-- =====================================================

DROP POLICY IF EXISTS "admin_insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

CREATE POLICY "insert_profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN (
          'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat',
          'service_it', 'superviseur_aval', 'responsable_entreprise',
          'directeur_juridique', 'directeur_financier', 'directeur_importation', 'directeur_logistique'
        )
    )
  );

CREATE POLICY "update_profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN (
          'super_admin', 'directeur_general', 'directeur_adjoint', 'admin_etat',
          'service_it', 'superviseur_aval', 'responsable_entreprise',
          'directeur_juridique', 'directeur_financier', 'directeur_importation', 'directeur_logistique'
        )
    )
  );

-- =====================================================
-- Trigger pour les nouveaux utilisateurs
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_text text;
  v_role public.app_role;
  v_full_name text;
BEGIN
  v_role_text := NEW.raw_user_meta_data->>'role';
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, v_full_name)
  ON CONFLICT (user_id) DO NOTHING;

  IF v_role_text IS NOT NULL AND v_role_text != '' THEN
    BEGIN
      v_role := v_role_text::public.app_role;
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, v_role)
      ON CONFLICT (user_id) DO UPDATE SET role = v_role;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not assign role "%": %', v_role_text, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
