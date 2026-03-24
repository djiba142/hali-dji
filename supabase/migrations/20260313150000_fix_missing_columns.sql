-- ================================================
-- CORRECTION DES COLONNES MANQUANTES ET TYPES
-- Assure que entreprise_id existe sur les tables critiques
-- ================================================

DO $$ 
BEGIN
    -- Correction pour la table livraisons
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'livraisons' AND COLUMN_NAME = 'entreprise_id') THEN
        ALTER TABLE public.livraisons ADD COLUMN entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE;
        
        -- On tente de peupler entreprise_id via station_id
        UPDATE public.livraisons l
        SET entreprise_id = s.entreprise_id
        FROM public.stations s
        WHERE l.station_id = s.id 
        AND l.entreprise_id IS NULL;
    END IF;

    -- Correction pour la table alertes (parfois entreprise_id est manquant)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'alertes' AND COLUMN_NAME = 'entreprise_id') THEN
        ALTER TABLE public.alertes ADD COLUMN entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE;

        UPDATE public.alertes a
        SET entreprise_id = s.entreprise_id
        FROM public.stations s
        WHERE a.station_id = s.id 
        AND a.entreprise_id IS NULL;
    END IF;
END $$;
