-- ================================================
-- ACCÈS ANALYTIQUE NATIONAL POUR LA CAS
-- ================================================

-- 1. OBSERVATIONS : Accès lecture pour les analystes
DROP POLICY IF EXISTS "Analysts can view all observations" ON public.observations;
CREATE POLICY "Analysts can view all observations" 
ON public.observations FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'analyste'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval')
  )
);

-- 2. ALERTES : Accès lecture pour les analystes
DROP POLICY IF EXISTS "Analysts can view all alertes" ON public.alertes;
CREATE POLICY "Analysts can view all alertes" 
ON public.alertes FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'analyste'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval')
  )
);

-- 3. VENTES : Vérification et extension pour les analystes
-- La politique précédente "Lecture Ventes autorisée" inclut déjà 'analyste'
-- Mais on s'assure qu'ils voient TOUT (pas de restriction station_id si analyste)
DROP POLICY IF EXISTS "Lecture Ventes autorisée" ON public.ventes;
CREATE POLICY "Lecture Ventes autorisée" 
ON public.ventes FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval', 'analyste')
  )
  OR EXISTS (
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
  OR station_id IN (
    SELECT id FROM public.stations 
    WHERE entreprise_id::UUID IN (
      SELECT entreprise_id::UUID FROM public.profiles 
      WHERE user_id = auth.uid() AND entreprise_id IS NOT NULL AND entreprise_id != ''
    )
    OR id IN (
      SELECT station_id::UUID FROM public.profiles 
      WHERE user_id = auth.uid() AND station_id IS NOT NULL AND station_id != ''
    )
  )
);

-- 4. LIVRAISONS : Extension pour les analystes
DROP POLICY IF EXISTS "Lecture Livraisons" ON public.livraisons;
CREATE POLICY "Lecture Livraisons" 
ON public.livraisons FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval', 'inspecteur', 'analyste')
  )
  OR station_id IN (
    SELECT s.id FROM public.stations s
    WHERE s.entreprise_id::UUID IN (
      SELECT entreprise_id::UUID FROM public.profiles 
      WHERE user_id = auth.uid() AND entreprise_id IS NOT NULL AND entreprise_id != ''
    )
    OR s.id IN (
      SELECT station_id::UUID FROM public.profiles 
      WHERE user_id = auth.uid() AND station_id IS NOT NULL AND station_id != ''
    )
  )
);

-- 5. QUOTAS : On s'assure que les analystes voient tout
-- Les Quotas Nationaux sont déjà ouverts à tous les authentifiés (SELECT true)
-- Quotas Entreprises : Extension
DROP POLICY IF EXISTS "Lecture Quotas Entreprises" ON quotas_entreprises;
CREATE POLICY "Lecture Quotas Entreprises" 
ON quotas_entreprises FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval', 'inspecteur', 'analyste')
  )
  OR entreprise_id IN (
    SELECT entreprise_id::UUID FROM public.profiles 
    WHERE user_id = auth.uid() AND entreprise_id IS NOT NULL AND entreprise_id != ''
  )
);
