-- Migration: Update alertes constraint and policies
-- Date: 2026-03-13
-- Description: Allow new alert types for station dashboards and add RLS policies

-- Modify the alertes types
ALTER TABLE public.alertes DROP CONSTRAINT IF EXISTS alertes_type_check;
ALTER TABLE public.alertes ADD CONSTRAINT alertes_type_check CHECK (type IN ('stock_critical', 'stock_warning', 'price_anomaly', 'station_closed', 'importation', 'stock_faible', 'retard_livraison', 'rupture', 'incident_technique'));

-- Modify the alertes niveau constraints
ALTER TABLE public.alertes DROP CONSTRAINT IF EXISTS alertes_niveau_check;
ALTER TABLE public.alertes ADD CONSTRAINT alertes_niveau_check CHECK (niveau IN ('critique', 'alerte', 'info', 'haute', 'normale', 'basse', 'URGENT'));

-- Ensure RLS is enabled 
ALTER TABLE public.alertes ENABLE ROW LEVEL SECURITY;

-- Gérant peut voir les alertes de sa station
DROP POLICY IF EXISTS "Gérant peut voir les alertes de sa station" ON public.alertes;
CREATE POLICY "Gérant peut voir les alertes de sa station"
ON public.alertes
FOR SELECT
TO authenticated
USING (
    station_id IN (
        SELECT station_id FROM public.profiles WHERE user_id = auth.uid()
    )
);

-- Gérant peut résoudre les alertes de sa station
DROP POLICY IF EXISTS "Gérant peut résoudre les alertes de sa station" ON public.alertes;
CREATE POLICY "Gérant peut résoudre les alertes de sa station"
ON public.alertes
FOR UPDATE
TO authenticated
USING (
    station_id IN (
        SELECT station_id FROM public.profiles WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    station_id IN (
        SELECT station_id FROM public.profiles WHERE user_id = auth.uid()
    )
);

-- Permettre aux agents connectés de créer des alertes (utile si on veut depuis le frontend)
DROP POLICY IF EXISTS "Les agents de station peuvent créer des alertes" ON public.alertes;
CREATE POLICY "Les agents de station peuvent créer des alertes"
ON public.alertes
FOR INSERT
TO authenticated
WITH CHECK (
    station_id IN (
        SELECT station_id FROM public.profiles WHERE user_id = auth.uid()
    )
);
