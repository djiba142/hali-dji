-- ====================================================================
-- LOGISTIC OPERATIONS & SCHEMA HARMONIZATION FIX
-- Author: SIHG System
-- Date: 2026-04-01
-- ====================================================================

BEGIN;

-- 1. ALIGN LOGISTIQUE_DEPOTS
ALTER TABLE public.logistique_depots 
ADD COLUMN IF NOT EXISTS capacite_totale DECIMAL(20,2);

-- Migrate data if needed
UPDATE public.logistique_depots 
SET capacite_totale = capacite_max 
WHERE capacite_totale IS NULL;

-- 2. ALIGN LIVRAISONS TABLE FOR THE FRONTEND EXPECTATIONS
ALTER TABLE public.livraisons
ADD COLUMN IF NOT EXISTS produit TEXT,
ADD COLUMN IF NOT EXISTS quantite_prevue NUMERIC,
ADD COLUMN IF NOT EXISTS camion_plaque TEXT,
ADD COLUMN IF NOT EXISTS date_depart TIMESTAMPTZ;

-- Migrate existing data
UPDATE public.livraisons 
SET produit = carburant, 
    quantite_prevue = quantite, 
    camion_plaque = camion_immatriculation,
    date_depart = date_livraison
WHERE produit IS NULL;

-- 3. ALIGN IMPORT_DOSSIERS FOR DASHBOARD
ALTER TABLE public.import_dossiers
ADD COLUMN IF NOT EXISTS navire_nom TEXT,
ADD COLUMN IF NOT EXISTS carburant TEXT;

-- 4. CREATE `importations` VIEW FOR BACKWARD COMPATIBILITY
-- Drop if it's a table (if someone created it manually before)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'importations' 
        AND table_type = 'BASE TABLE'
    ) THEN
        DROP TABLE public.importations CASCADE;
    END IF;
END $$;

CREATE OR REPLACE VIEW public.importations AS
SELECT 
    id,
    COALESCE(navire_nom, 'Navire Non Défini') as navire_nom,
    COALESCE(carburant, 'Produit Mixte') as carburant,
    quantite_prevue as quantite_tonnes,
    statut,
    priorite,
    date_arrivee_est,
    created_at,
    updated_at
FROM public.import_dossiers;

-- Grant access to view
GRANT SELECT ON public.importations TO authenticated;

-- 5. FUNCTION TO DISPATCH TRUCKS ATOMICALLY
CREATE OR REPLACE FUNCTION public.fn_dispatch_delivery(
    p_order_id UUID, 
    p_station_id UUID, 
    p_qty NUMERIC, 
    p_produit TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update order status
    UPDATE public.ordres_livraison 
    SET statut = 'approuve', 
        updated_at = now() 
    WHERE id = p_order_id;
    
    -- Insert livraison
    INSERT INTO public.livraisons (
        station_id,
        produit,
        carburant,
        quantite_prevue,
        quantite,
        statut,
        camion_plaque,
        camion_immatriculation,
        date_depart,
        date_livraison
    ) VALUES (
        p_station_id,
        COALESCE(p_produit, 'gasoil'),
        COALESCE(p_produit, 'gasoil'),
        p_qty,
        p_qty,
        'en_cours',
        'RC-' || floor(1000 + random() * 9000)::text,
        'RC-' || floor(1000 + random() * 9000)::text,
        now(),
        now()
    );
END;
$$;

-- 6. MAKE SURE QUOTAS EXIST AND HAVE RLS
DO $$
BEGIN
    -- Check if tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotas_stations') THEN
        ALTER TABLE public.quotas_stations ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Lecture Quotas Stations" ON public.quotas_stations;
        CREATE POLICY "Lecture Quotas Stations" ON public.quotas_stations FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Gestion Quotas Stations" ON public.quotas_stations;
        CREATE POLICY "Gestion Quotas Stations" ON public.quotas_stations FOR ALL USING (true);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotas_entreprises') THEN
        ALTER TABLE public.quotas_entreprises ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Lecture Quotas Entreprises" ON public.quotas_entreprises;
        CREATE POLICY "Lecture Quotas Entreprises" ON public.quotas_entreprises FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Gestion Quotas Entreprises" ON public.quotas_entreprises;
        CREATE POLICY "Gestion Quotas Entreprises" ON public.quotas_entreprises FOR ALL USING (true);
    END IF;
END $$;

COMMIT;
