-- Migration to allow Enterprise-level fuel orders
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Add entreprise_id column to orders
ALTER TABLE public.ordres_livraison
ADD COLUMN entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE;

-- 2. Make station_id nullable (to allow orders without a specific station initially)
ALTER TABLE public.ordres_livraison
ALTER COLUMN station_id DROP NOT NULL;

-- 3. Add constraint: Must have EITHER a station OR an entreprise (or both)
ALTER TABLE public.ordres_livraison
ADD CONSTRAINT chk_order_target CHECK (station_id IS NOT NULL OR entreprise_id IS NOT NULL);

-- 4. Update RLS Policies
-- Allow Responsable Entreprise to view/create orders for their entreprise
DROP POLICY IF EXISTS "Responsable can view their entreprise ordres" ON public.ordres_livraison;

CREATE POLICY "Responsable can view their company orders"
ON public.ordres_livraison FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'responsable_entreprise') AND
  (
    entreprise_id::text = get_user_entreprise_id(auth.uid()) OR
    station_id IN (
        SELECT id FROM public.stations 
        WHERE entreprise_id::text = get_user_entreprise_id(auth.uid())
    )
  )
);

CREATE POLICY "Responsable can create orders for their company"
ON public.ordres_livraison FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'responsable_entreprise') AND
  (
    entreprise_id::text = get_user_entreprise_id(auth.uid()) OR
    station_id IN (
        SELECT id FROM public.stations 
        WHERE entreprise_id::text = get_user_entreprise_id(auth.uid())
    )
  )
);

-- 5. Add notification function (optional, but good for realtime)
-- We'll rely on Supabase Realtime client-side for now, but enabling it on the table is good practice if not default.
-- (Supabase Realtime is usually enabled by default on public tables in newer projects, but we can ensure it)
ALTER PUBLICATION supabase_realtime ADD TABLE public.ordres_livraison;

COMMIT;
