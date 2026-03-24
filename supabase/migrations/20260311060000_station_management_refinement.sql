-- Migration: Station Management Refinement
-- Date: 2026-03-11
-- Description: Adds missing columns for stations/entreprises and creates 'ventes' table

-- 1. Update Entreprises Table
ALTER TABLE public.entreprises ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.entreprises ADD COLUMN IF NOT EXISTS sigle TEXT;
ALTER TABLE public.entreprises ADD COLUMN IF NOT EXISTS type TEXT; -- 'Importateur', 'Distributeur'
ALTER TABLE public.entreprises ADD COLUMN IF NOT EXISTS numero_agrement TEXT;
ALTER TABLE public.entreprises ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.entreprises ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'actif'; -- 'actif', 'suspendu', 'ferme'

-- 2. Update Stations Table
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'urbaine'; -- 'urbaine', 'routiere', 'depot', 'industrielle'
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS nombre_cuves INTEGER DEFAULT 1;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS nombre_pompes INTEGER DEFAULT 2;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS gestionnaire_nom TEXT;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS gestionnaire_telephone TEXT;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS gestionnaire_email TEXT;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'en_attente_validation'; -- 'ouverte', 'fermee', 'en_travaux', 'en_attente_validation'

-- Ensure capacities exist
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS capacite_essence INTEGER DEFAULT 0;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS capacite_gasoil INTEGER DEFAULT 0;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS capacite_gpl INTEGER DEFAULT 0;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS capacite_lubrifiants INTEGER DEFAULT 0;

-- Ensure stocks exist
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS stock_essence INTEGER DEFAULT 0;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS stock_gasoil INTEGER DEFAULT 0;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS stock_gpl INTEGER DEFAULT 0;
ALTER TABLE public.stations ADD COLUMN IF NOT EXISTS stock_lubrifiants INTEGER DEFAULT 0;

-- 3. Create 'ventes' table
CREATE TABLE IF NOT EXISTS public.ventes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
    entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    date_vente DATE DEFAULT CURRENT_DATE,
    carburant TEXT NOT NULL, -- 'essence', 'gasoil', 'gpl'
    quantite_litres DOUBLE PRECISION NOT NULL,
    prix_unitaire DOUBLE PRECISION,
    prix_total DOUBLE PRECISION,
    enregistre_par UUID REFERENCES auth.users(id),
    notes TEXT
);

-- 4. RLS for 'ventes'
ALTER TABLE public.ventes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personnel de station peut voir ses ventes" ON public.ventes;
CREATE POLICY "Personnel de station peut voir ses ventes"
ON public.ventes
FOR SELECT
TO authenticated
USING (
    station_id IN (
        SELECT station_id FROM public.profiles WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Responsable entreprise peut voir les ventes de ses stations" ON public.ventes;
CREATE POLICY "Responsable entreprise peut voir les ventes de ses stations"
ON public.ventes
FOR SELECT
TO authenticated
USING (
    entreprise_id IN (
        SELECT entreprise_id FROM public.profiles WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "SONAP et Super Admin peuvent voir toutes les ventes" ON public.ventes;
CREATE POLICY "SONAP et Super Admin peuvent voir toutes les ventes"
ON public.ventes
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'superviseur_aval', 'operateur_aval', 'inspecteur', 'analyste')
    )
);

DROP POLICY IF EXISTS "Personnel station peut enregistrer une vente" ON public.ventes;
CREATE POLICY "Personnel station peut enregistrer une vente"
ON public.ventes
FOR INSERT
TO authenticated
WITH CHECK (
    station_id IN (
        SELECT station_id FROM public.profiles WHERE user_id = auth.uid()
    )
);

-- 5. Trigger for updating stock after sale
CREATE OR REPLACE FUNCTION public.update_stock_after_sale()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.carburant = 'essence' THEN
        UPDATE public.stations SET stock_essence = stock_essence - NEW.quantite_litres WHERE id = NEW.station_id;
    ELSIF NEW.carburant = 'gasoil' THEN
        UPDATE public.stations SET stock_gasoil = stock_gasoil - NEW.quantite_litres WHERE id = NEW.station_id;
    ELSIF NEW.carburant = 'gpl' THEN
        UPDATE public.stations SET stock_gpl = stock_gpl - NEW.quantite_litres WHERE id = NEW.station_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_stock_after_sale ON public.ventes;
CREATE TRIGGER tr_update_stock_after_sale
AFTER INSERT ON public.ventes
FOR EACH ROW
EXECUTE FUNCTION public.update_stock_after_sale();
