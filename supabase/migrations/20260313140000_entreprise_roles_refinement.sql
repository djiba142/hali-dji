-- ================================================
-- RÉPÉRETOIRE DES RÔLES ENTREPRISES ET LOGISTIQUE
-- Affinement des accès pour Responsable Entreprise et Opérateur Entreprise
-- ================================================

-- 1. Mise à jour de la hiérarchie pour inclure les nouveaux rôles
CREATE OR REPLACE FUNCTION public.can_access_level(_user_id UUID, _required_level public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.app_role;
  role_hierarchy INTEGER;
  required_hierarchy INTEGER;
BEGIN
  SELECT role INTO user_role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  
  -- Hiérarchie SIHG v2.0
  role_hierarchy := CASE user_role
    WHEN 'super_admin' THEN 1
    WHEN 'admin_etat' THEN 2
    WHEN 'directeur_general' THEN 2
    WHEN 'directeur_adjoint' THEN 3
    WHEN 'superviseur_aval' THEN 4
    WHEN 'inspecteur' THEN 4
    WHEN 'analyste' THEN 4
    WHEN 'personnel_admin' THEN 4
    WHEN 'service_it' THEN 5
    WHEN 'operateur_aval' THEN 5
    WHEN 'technicien_aval' THEN 5
    WHEN 'responsable_entreprise' THEN 6
    WHEN 'operateur_entreprise' THEN 7
    WHEN 'gerant_station' THEN 8
    WHEN 'responsable_stock' THEN 9
    WHEN 'agent_station' THEN 10
    ELSE 99
  END;
  
  required_hierarchy := CASE _required_level
    WHEN 'super_admin' THEN 1
    WHEN 'admin_etat' THEN 2
    WHEN 'directeur_general' THEN 2
    WHEN 'directeur_adjoint' THEN 3
    WHEN 'superviseur_aval' THEN 4
    WHEN 'inspecteur' THEN 4
    WHEN 'analyste' THEN 4
    WHEN 'personnel_admin' THEN 4
    WHEN 'service_it' THEN 5
    WHEN 'operateur_aval' THEN 5
    WHEN 'technicien_aval' THEN 5
    WHEN 'responsable_entreprise' THEN 6
    WHEN 'operateur_entreprise' THEN 7
    WHEN 'gerant_station' THEN 8
    WHEN 'responsable_stock' THEN 9
    WHEN 'agent_station' THEN 10
    ELSE 99
  END;
  
  RETURN role_hierarchy <= required_hierarchy;
END;
$$;

-- 2. POLITIQUES DE SÉCURITÉ POUR LES ENTREPRISES (Lecture Restreinte)

-- STATIONS : Une entreprise ne voit que ses stations
DROP POLICY IF EXISTS "Responsable entreprise can view their stations" ON public.stations;
CREATE POLICY "Responsable entreprise can view their stations"
ON public.stations FOR SELECT
TO authenticated
USING (
  entreprise_id::text = (SELECT entreprise_id FROM public.profiles WHERE user_id = auth.uid())
  OR can_access_level(auth.uid(), 'inspecteur')
);

-- VENTES : Une entreprise voit les ventes de ses stations uniquement
DROP POLICY IF EXISTS "Entreprise can view their sales" ON public.ventes;
CREATE POLICY "Entreprise can view their sales"
ON public.ventes FOR SELECT
TO authenticated
USING (
  entreprise_id::text = (SELECT entreprise_id FROM public.profiles WHERE user_id = auth.uid())
  OR can_access_level(auth.uid(), 'inspecteur')
);

-- LIVRAISONS : Supervision logistique
DROP POLICY IF EXISTS "Entreprise can view their deliveries" ON public.livraisons;
CREATE POLICY "Entreprise can view their deliveries"
ON public.livraisons FOR SELECT
TO authenticated
USING (
  entreprise_id::text = (SELECT entreprise_id FROM public.profiles WHERE user_id = auth.uid())
  OR can_access_level(auth.uid(), 'inspecteur')
);

-- ALERTES : Réception des alertes de ses stations
DROP POLICY IF EXISTS "Entreprise can view their alerts" ON public.alertes;
CREATE POLICY "Entreprise can view their alerts"
ON public.alertes FOR SELECT
TO authenticated
USING (
  entreprise_id::text = (SELECT entreprise_id FROM public.profiles WHERE user_id = auth.uid())
  OR station_id IN (
    SELECT id FROM public.stations 
    WHERE entreprise_id::text = (SELECT entreprise_id FROM public.profiles WHERE user_id = auth.uid())
  )
  OR can_access_level(auth.uid(), 'inspecteur')
);

-- ORDRES DE LIVRAISON (Planification logistique)
DROP POLICY IF EXISTS "Entreprise can view their orders" ON public.ordres_livraison;
CREATE POLICY "Entreprise can view their orders"
ON public.ordres_livraison FOR SELECT
TO authenticated
USING (
  station_id IN (
    SELECT id FROM public.stations 
    WHERE entreprise_id::text = (SELECT entreprise_id FROM public.profiles WHERE user_id = auth.uid())
  )
  OR can_access_level(auth.uid(), 'inspecteur')
);
