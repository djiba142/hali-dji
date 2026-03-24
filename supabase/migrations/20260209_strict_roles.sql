-- Migration ULTIME v3 pour appliquer strictement les deux rôles : super_admin et responsable_entreprise
-- Cette version nettoie TOUTES les politiques dépendantes signalées par l'erreur.

BEGIN;

-- 0. NETTOYAGE DES POLITIQUES DÉPENDANTES (Signalisées par l'erreur)
-- On doit supprimer ces politiques car elles bloquent toute modification de la colonne "role"

-- Table: user_roles
DROP POLICY IF EXISTS "Responsable entreprise can assign gestionnaire roles" ON public.user_roles;
DROP POLICY IF EXISTS "Les super administrateurs peuvent afficher tous les rôles" ON public.user_roles;
DROP POLICY IF EXISTS "L'administrateur de la politique etat peut afficher les rôles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admin manages all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;

-- Table: profiles
DROP POLICY IF EXISTS "Les super administrateurs et admin_etat peuvent afficher tous les profils" ON public.profiles;
DROP POLICY IF EXISTS "Les super administrateurs peuvent mettre à jour n'importe quel profil" ON public.profiles;
DROP POLICY IF EXISTS "Les super administrateurs peuvent insérer n'importe quel profil" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Responsable entreprise can view data for their company users" ON public.profiles;

-- Table: entreprises
DROP POLICY IF EXISTS "Admin etat et super admin peuvent gérer les entreprises" ON public.entreprises;
DROP POLICY IF EXISTS "Super admin see all entreprises" ON public.entreprises;
DROP POLICY IF EXISTS "Users see their own entreprise" ON public.entreprises;

-- Table: stations
DROP POLICY IF EXISTS "L'administrateur etat peut gérer toutes les stations" ON public.stations;
DROP POLICY IF EXISTS "Une entreprise responsable peut gérer ses stations" ON public.stations;
DROP POLICY IF EXISTS "Le questionnaire peut mettre à jour sa station" ON public.stations;
DROP POLICY IF EXISTS "Super admin see all stations" ON public.stations;
DROP POLICY IF EXISTS "Responsable entreprise sees their own stations" ON public.stations;

-- Table: livraisons
DROP POLICY IF EXISTS "L'administrateur et l'inspecteur peuvent afficher toutes les livraisons" ON public.livraisons;
DROP POLICY IF EXISTS "Responsable peut visualiser ses livraisons d'entreprise" ON public.livraisons;
DROP POLICY IF EXISTS "Le questionnaire peut gérer les livraisons de sa station" ON public.livraisons;

-- Table: ordres_livraison
DROP POLICY IF EXISTS "L'administrateur de la politique etat peut gérer toutes les commandes" ON public.ordres_livraison;
DROP POLICY IF EXISTS "L'inspecteur peut afficher les ordres" ON public.ordres_livraison;
DROP POLICY IF EXISTS "Responsable peut afficher ses commandes d'entreprise" ON public.ordres_livraison;

-- Table: importations
DROP POLICY IF EXISTS "L'administrateur de la politique peut gérer les importations" ON public.importations;
DROP POLICY IF EXISTS "Inspecteur peut afficher les importations" ON public.importations;

-- Table: alertes
DROP POLICY IF EXISTS "L'administrateur et l'inspecteur peuvent afficher toutes les alertes" ON public.alertes;
DROP POLICY IF EXISTS "L'administrateur etat peut gérer les alertes" ON public.alertes;
DROP POLICY IF EXISTS "Responsable peut afficher ses alertes d'entreprise" ON public.alertes;

-- Table: prix_officiels
DROP POLICY IF EXISTS "Seul admin etat peut gérer prix" ON public.prix_officiels;

-- Table: historique_stocks
DROP POLICY IF EXISTS "Le questionnaire peut insérer sa station historique" ON public.historique_stocks;

-- 1. Nettoyage des fonctions dépendantes avant de supprimer le type
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_level(uuid, public.app_role) CASCADE;

-- 2. Migration des données
ALTER TABLE public.user_roles ALTER COLUMN role TYPE TEXT USING role::text;

UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE role IN ('admin_etat', 'inspecteur');

UPDATE public.user_roles 
SET role = 'responsable_entreprise' 
WHERE role IN ('gestionnaire_station', 'responsable_entreprise');

-- 3. Suppression et Recréation du type
DROP TYPE public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('super_admin', 'responsable_entreprise');

-- 4. Restauration de la colonne role
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING role::public.app_role;

-- 5. Restauration des fonctions essentielles
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _required_role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role = _required_role FROM public.user_roles WHERE user_id = _user_id LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_level(_user_id UUID, _required_level public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.app_role;
BEGIN
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  IF user_role = 'responsable_entreprise' AND _required_level = 'responsable_entreprise' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 6. Restauration des Politiques de Sécurité (RLS) fondamentales
-- Entreprises
CREATE POLICY "Super admin see all entreprises"
  ON public.entreprises FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users see their own entreprise"
  ON public.entreprises FOR SELECT
  TO authenticated
  USING (id::text = public.get_user_entreprise_id(auth.uid()));

-- Stations
CREATE POLICY "Super admin see all stations"
  ON public.stations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Responsable entreprise sees their own stations"
  ON public.stations FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'responsable_entreprise') AND 
    entreprise_id::text = public.get_user_entreprise_id(auth.uid())
  );

-- Profiles
CREATE POLICY "Super admin manages all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Responsable entreprise views their company users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'responsable_entreprise') AND 
    entreprise_id::text = public.get_user_entreprise_id(auth.uid())
  );

-- User Roles
CREATE POLICY "Super admin manages all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

COMMIT;
