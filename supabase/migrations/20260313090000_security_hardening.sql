-- ================================================
-- RÉVISION DE LA SÉCURITÉ (RLS) ET DURCISSEMENT (CORRIGÉ V2)
-- ================================================

-- 1. QUOTAS NATIONAUX (SONAP uniquement)
DROP POLICY IF EXISTS "Lecture Quotas Nationaux" ON quotas_nationaux;
DROP POLICY IF EXISTS "Gestion Quotas Nationaux" ON quotas_nationaux;

CREATE POLICY "Lecture Quotas Nationaux" 
ON quotas_nationaux FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Gestion Quotas Nationaux" 
ON quotas_nationaux FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint')
  )
);

-- 2. QUOTAS ENTREPRISES
DROP POLICY IF EXISTS "Lecture Quotas Entreprises" ON quotas_entreprises;
DROP POLICY IF EXISTS "Gestion Quotas Entreprises" ON quotas_entreprises;

CREATE POLICY "Lecture Quotas Entreprises" 
ON quotas_entreprises FOR SELECT 
TO authenticated 
USING (
  -- Admin / SONAP peuvent tout voir
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval', 'inspecteur')
  )
  -- Une entreprise ne voit que ses quotas
  OR entreprise_id IN (
    SELECT entreprise_id::UUID FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND entreprise_id IS NOT NULL 
    AND entreprise_id != ''
  )
);

CREATE POLICY "Gestion Quotas Entreprises" 
ON quotas_entreprises FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval')
  )
);

-- 3. QUOTAS STATIONS
DROP POLICY IF EXISTS "Lecture Quotas Stations" ON quotas_stations;
DROP POLICY IF EXISTS "Gestion Quotas Stations" ON quotas_stations;

CREATE POLICY "Lecture Quotas Stations" 
ON quotas_stations FOR SELECT 
TO authenticated 
USING (
  -- Admin / SONAP peuvent tout voir
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval', 'inspecteur')
  )
  -- Une entreprise voit les quotas de ses stations
  OR entreprise_id IN (
    SELECT entreprise_id::UUID FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND entreprise_id IS NOT NULL 
    AND entreprise_id != ''
  )
  -- Une station ne voit que son quota
  OR station_id IN (
    SELECT station_id::UUID FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND station_id IS NOT NULL 
    AND station_id != ''
  )
);

CREATE POLICY "Gestion Quotas Stations" 
ON quotas_stations FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval', 'responsable_entreprise')
  )
);

-- 4. DURCISSEMENT DES LIVRAISONS (Audit)
-- Note: La table livraisons n'a pas directement de colonne entreprise_id. 
-- Elle est liée via station_id -> stations.entreprise_id
ALTER TABLE public.livraisons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecture Livraisons" ON public.livraisons;
CREATE POLICY "Lecture Livraisons" 
ON public.livraisons FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval', 'inspecteur')
  )
  OR station_id IN (
    -- On récupère les stations autorisées pour l'utilisateur
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
