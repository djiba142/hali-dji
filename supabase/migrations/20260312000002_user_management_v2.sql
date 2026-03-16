-- Migration pour le système de gestion des utilisateurs et sécurité (V2)
-- Ajout des champs détaillés pour le formulaire de création d'utilisateur et sécurité

-- 1. Mise à jour de l'Enum app_role pour inclure toutes les positions requises
-- Note: Dans Supabase/PostgreSQL, on utilise ALTER TYPE ADD VALUE sil n'existe pas.
-- Mais pour une migration propre, on va s'assurer que les rôles sont cohérents.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'directeur_general') THEN
        ALTER TYPE app_role ADD VALUE 'directeur_general';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'directeur_adjoint') THEN
        ALTER TYPE app_role ADD VALUE 'directeur_adjoint';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'responsable_stock') THEN
        ALTER TYPE app_role ADD VALUE 'responsable_stock';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'agent_station') THEN
        ALTER TYPE app_role ADD VALUE 'agent_station';
    END IF;
END $$;

-- 2. Ajout des colonnes à la table 'profiles'
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS prenom TEXT,
ADD COLUMN IF NOT EXISTS sexe TEXT CHECK (sexe IN ('M', 'F')),
ADD COLUMN IF NOT EXISTS date_naissance DATE,
ADD COLUMN IF NOT EXISTS adresse TEXT,
ADD COLUMN IF NOT EXISTS matricule TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS prefecture TEXT,
ADD COLUMN IF NOT EXISTS commune TEXT,
ADD COLUMN IF NOT EXISTS first_login_done BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;

-- 3. Mise à jour de la politique RLS pour permettre aux admins de créer des profils
-- (Déjà existant normalement, mais on renforce)
DROP POLICY IF EXISTS "Les administrateurs peuvent créer des profils" ON profiles;
CREATE POLICY "Les administrateurs peuvent gérer tous les profils" 
ON profiles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_avall', 'responsable_entreprise')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_avall', 'responsable_entreprise')
  )
);

-- 4. Audit Log pour la création d'utilisateurs
COMMENT ON COLUMN profiles.first_login_done IS 'Indique si l''utilisateur a effectué sa première connexion et changé son mot de passe si requis';
