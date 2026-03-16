-- ================================================
-- RÉVISION DE LA SÉCURITÉ POUR LES INSPECTEURS
-- Scope : National, Régional, Préfectoral, Local
-- ================================================

-- 1. STATIONS : Filtrage par zone pour les inspecteurs
DROP POLICY IF EXISTS "Inspecteurs can view relevant stations" ON public.stations;
CREATE POLICY "Inspecteurs can view relevant stations" 
ON public.stations FOR SELECT 
TO authenticated 
USING (
  -- Si l'utilisateur est un inspecteur
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'inspecteur'
    AND (
      -- Scope National : pas de région définie ou 'National'
      p.region IS NULL OR p.region = '' OR p.region = 'National'
      -- Scope Régional : région correspond
      OR (p.region = stations.region AND (p.prefecture IS NULL OR p.prefecture = ''))
      -- Scope Préfectoral : préfecture correspond
      OR (p.prefecture = stations.commune OR p.prefecture = (SELECT nom FROM public.prefectures WHERE id = stations.prefecture_id))
    )
  )
  -- Conserver les accès pour les autres rôles (définis ailleurs ou ajoutés ici pour sécurité)
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval', 'operateur_aval')
  )
);

-- 2. OBSERVATIONS : Filtrage par zone pour les inspecteurs
DROP POLICY IF EXISTS "Inspecteurs can view relevant observations" ON public.observations;
CREATE POLICY "Inspecteurs can view relevant observations" 
ON public.observations FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'inspecteur'
    AND (
      p.region IS NULL OR p.region = '' OR p.region = 'National'
      OR (p.region = observations.region AND (p.prefecture IS NULL OR p.prefecture = ''))
      OR (p.prefecture = observations.prefecture)
    )
  )
  OR auth.uid() = (SELECT user_id FROM public.profiles WHERE id = inspecteur_id) -- L'auteur peut toujours voir
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval')
  )
);

-- 3. ALERTE : Filtrage par zone pour les inspecteurs
ALTER TABLE public.alertes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inspecteurs can view relevant alertes" ON public.alertes;
CREATE POLICY "Inspecteurs can view relevant alertes" 
ON public.alertes FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'inspecteur'
    AND (
      p.region IS NULL OR p.region = '' OR p.region = 'National'
      -- On vérifie via la station liée à l'alerte
      OR EXISTS (
        SELECT 1 FROM public.stations s
        WHERE s.id = alertes.station_id
        AND (
          (p.region = s.region AND (p.prefecture IS NULL OR p.prefecture = ''))
          OR (p.prefecture = s.commune OR p.prefecture = (SELECT nom FROM public.prefectures WHERE id = s.prefecture_id))
        )
      )
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval')
  )
);

-- 4. VENTES : Filtrage par zone pour les inspecteurs
DROP POLICY IF EXISTS "Inspecteurs can view relevant ventes" ON public.ventes;
CREATE POLICY "Inspecteurs can view relevant ventes" 
ON public.ventes FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'inspecteur'
    AND (
      p.region IS NULL OR p.region = '' OR p.region = 'National'
      OR EXISTS (
        SELECT 1 FROM public.stations s
        WHERE s.id = ventes.station_id
        AND (
          (p.region = s.region AND (p.prefecture IS NULL OR p.prefecture = ''))
          OR (p.prefecture = s.commune OR p.prefecture = (SELECT nom FROM public.prefectures WHERE id = s.prefecture_id))
        )
      )
    )
  )
);

-- 5. LIVRAISONS : Filtrage par zone pour les inspecteurs
DROP POLICY IF EXISTS "Inspecteurs can view relevant livraisons" ON public.livraisons;
CREATE POLICY "Inspecteurs can view relevant livraisons" 
ON public.livraisons FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'inspecteur'
    AND (
      p.region IS NULL OR p.region = '' OR p.region = 'National'
      OR EXISTS (
        SELECT 1 FROM public.stations s
        WHERE s.id = livraisons.station_id
        AND (
          (p.region = s.region AND (p.prefecture IS NULL OR p.prefecture = ''))
          OR (p.prefecture = s.commune OR p.prefecture = (SELECT nom FROM public.prefectures WHERE id = s.prefecture_id))
        )
      )
    )
  )
);

-- 6. QUOTAS STATIONS : Filtrage par zone pour les inspecteurs
DROP POLICY IF EXISTS "Inspecteurs can view relevant quotas stations" ON public.quotas_stations;
CREATE POLICY "Inspecteurs can view relevant quotas stations" 
ON public.quotas_stations FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'inspecteur'
    AND (
      p.region IS NULL OR p.region = '' OR p.region = 'National'
      OR EXISTS (
        SELECT 1 FROM public.stations s
        WHERE s.id = quotas_stations.station_id
        AND (
          (p.region = s.region AND (p.prefecture IS NULL OR p.prefecture = ''))
          OR (p.prefecture = s.commune OR p.prefecture = (SELECT nom FROM public.prefectures WHERE id = s.prefecture_id))
        )
      )
    )
  )
);

