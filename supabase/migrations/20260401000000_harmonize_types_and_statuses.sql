-- ====================================================================
-- HARMONIZE TYPES AND STATUSES FOR ENTREPRISES AND STATIONS
-- ====================================================================

-- 1. Update Entreprises table constraints
ALTER TABLE public.entreprises DROP CONSTRAINT IF EXISTS entreprises_type_check;
ALTER TABLE public.entreprises ADD CONSTRAINT entreprises_type_check 
    CHECK (type IN ('compagnie', 'distributeur', 'OMAP', 'TRANSPORTATEUR', 'STOCKAGE', 'DISTRIBUTEUR'));

ALTER TABLE public.entreprises DROP CONSTRAINT IF EXISTS entreprises_statut_check;
ALTER TABLE public.entreprises ADD CONSTRAINT entreprises_statut_check 
    CHECK (statut IN ('actif', 'suspendu', 'ferme', 'attente_dsa', 'attente_da', 'attente_djc', 'attente_dsi'));

-- 2. Update Stations table constraints
ALTER TABLE public.stations DROP CONSTRAINT IF EXISTS stations_type_check;
ALTER TABLE public.stations ADD CONSTRAINT stations_type_check 
    CHECK (type IN ('urbaine', 'routiere', 'depot', 'industrielle'));

ALTER TABLE public.stations DROP CONSTRAINT IF EXISTS stations_statut_check;
ALTER TABLE public.stations ADD CONSTRAINT stations_statut_check 
    CHECK (statut IN ('ouverte', 'fermee', 'en_travaux', 'attente_validation', 'attente_dsa', 'attente_da', 'attente_djc', 'attente_dsi'));
