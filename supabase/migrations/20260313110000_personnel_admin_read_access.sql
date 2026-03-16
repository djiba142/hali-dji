-- ================================================
-- ACCÈS LECTURE SEULE POUR LE PERSONNEL ADMINISTRATIF
-- ================================================

-- 1. STATIONS : Ajout du rôle personnel_admin à l'accès lecture
DROP POLICY IF EXISTS "Inspecteurs can view relevant stations" ON public.stations;

CREATE POLICY "Personnel Admin and Inspectors can view relevant stations" 
ON public.stations FOR SELECT 
TO authenticated 
USING (
  -- Admin / SONAP / Personnel Admin peuvent tout voir
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval', 'operateur_aval', 'personnel_admin', 'analyste')
  )
  -- Inspecteurs (avec filtrage géographique si nécessaire, sinon tout voir si scope national)
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'inspecteur'
    AND (
      p.region IS NULL OR p.region = '' OR p.region = 'National'
      OR (p.region = stations.region AND (p.prefecture IS NULL OR p.prefecture = ''))
      OR (p.prefecture = stations.commune OR p.prefecture = (SELECT nom FROM public.prefectures WHERE id = stations.prefecture_id))
    )
  )
  -- Responsables entreprises et stations
  OR entreprise_id IN (
    SELECT entreprise_id::UUID FROM public.profiles 
    WHERE user_id = auth.uid() AND entreprise_id IS NOT NULL AND entreprise_id != ''
  )
  OR id IN (
    SELECT station_id::UUID FROM public.profiles 
    WHERE user_id = auth.uid() AND station_id IS NOT NULL AND station_id != ''
  )
);

-- 2. ENTREPRISES : Ajout du rôle personnel_admin à l'accès lecture
DROP POLICY IF EXISTS "Lecture publique pour les entreprises authentifiées" ON public.entreprises;
CREATE POLICY "Lecture Entreprises par rôles autorisés" 
ON public.entreprises FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval', 'operateur_aval', 'inspecteur', 'analyste', 'personnel_admin')
  )
  OR id IN (
    SELECT entreprise_id::UUID FROM public.profiles 
    WHERE user_id = auth.uid() AND entreprise_id IS NOT NULL AND entreprise_id != ''
  )
);

-- 3. PROFILES : Permettre au personnel admin de voir les profils (pour les contacts)
-- Note : RLS sur profiles est souvent plus restrictif
DROP POLICY IF EXISTS "Lecture Profils pour Personnel Admin" ON public.profiles;
CREATE POLICY "Lecture Profils pour Personnel Admin" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'personnel_admin')
  )
  OR user_id = auth.uid()
);

-- 4. VENTES : Correction pour inclure les administrateurs (oubliés dans la précédente migration)
DROP POLICY IF EXISTS "Inspecteurs can view relevant ventes" ON public.ventes;
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
