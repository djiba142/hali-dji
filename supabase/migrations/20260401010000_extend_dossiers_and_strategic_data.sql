-- ====================================================================
-- STRATEGIC BACKEND EXTENSION (DG & REGULATION)
-- Author: SIHG Strategy Agent
-- Date: 2026-04-01
-- ====================================================================

BEGIN;

-- 1. ENUMS POUR L'AVIS DG
DO $$ BEGIN
    CREATE TYPE public.avis_dg_type AS ENUM ('favorable', 'defavorable', 'reserve');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. EXTENSION DE LA TABLE DOSSIERS
-- Ajout des colonnes pour l'avis stratégique de la DG
ALTER TABLE public.dossiers_entreprise 
ADD COLUMN IF NOT EXISTS avis_dg_type public.avis_dg_type,
ADD COLUMN IF NOT EXISTS avis_dg_commentaire TEXT,
ADD COLUMN IF NOT EXISTS transmis_etat_at TIMESTAMPTZ;

-- 3. TABLE DE CONFIGURATION GLOBALE (SIHG CONFIG)
CREATE TABLE IF NOT EXISTS public.sihg_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cle TEXT UNIQUE NOT NULL,
    valeur JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Initial Config (Consommation Journalière Nationale)
INSERT INTO public.sihg_config (cle, valeur, description)
VALUES (
    'consommation_journaliere', 
    '{"essence": 800000, "gasoil": 1200000, "unite": "Litres"}'::jsonb,
    'Consommation nationale estimée pour le calcul de l''autonomie.'
) ON CONFLICT (cle) DO NOTHING;

-- 4. SYSTÈME DE NOTIFICATIONS AUTOMATIQUES (ORDRE DE RAVITAILLEMENT)

-- Fonction pour notifier les entreprises lors d'un ordre d'urgence
CREATE OR REPLACE FUNCTION public.fn_notif_ordre_ravitaillement()
RETURNS TRIGGER AS $$
DECLARE
    v_user_record RECORD;
    v_station_nom TEXT;
BEGIN
    -- On n'agit que si la priorité est 'urgente' ou 'haute'
    IF NEW.priorite IN ('urgente', 'haute') THEN
        
        -- Récupérer le nom de la station pour le message
        SELECT nom INTO v_station_nom FROM public.stations WHERE id = NEW.station_id;

        -- Trouver tous les utilisateurs liés à cette entreprise
        -- Note: entreprise_id dans profiles est stocké en TEXT, on caste pour comparer
        FOR v_user_record IN 
            SELECT user_id FROM public.profiles 
            WHERE entreprise_id = NEW.entreprise_id::text
        LOOP
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                v_user_record.user_id,
                '🚨 ORDRE DE RAVITAILLEMENT D''URGENCE',
                format('Instruction émise par la Direction Générale : Ravitaillement immédiat requis pour la station %s (%s L de %s).', 
                       v_station_nom, NEW.quantite_demandee, NEW.carburant),
                'urgent'
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur ordres_livraison
DROP TRIGGER IF EXISTS tr_notif_ordre_ravitaillement ON public.ordres_livraison;
CREATE TRIGGER tr_notif_ordre_ravitaillement
AFTER INSERT ON public.ordres_livraison
FOR EACH ROW EXECUTE PROCEDURE public.fn_notif_ordre_ravitaillement();

-- 5. POLITIQUES RLS SUR SIHG_CONFIG
ALTER TABLE public.sihg_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique pour tous authenticated" 
ON public.sihg_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gestion réservée aux Admins et DG" 
ON public.sihg_config FOR ALL TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('super_admin', 'admin_etat', 'directeur_general')
    )
);

COMMIT;
