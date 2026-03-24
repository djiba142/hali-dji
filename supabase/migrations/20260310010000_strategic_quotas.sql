-- Migration: Strategic Quotas for Entreprises
-- Adding quota management for the national regulator (Admin Etat)

BEGIN;

-- 1. Add quota columns to entreprises table
ALTER TABLE public.entreprises 
ADD COLUMN IF NOT EXISTS quota_essence INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quota_gasoil INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quota_gpl INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quota_lubrifiants INTEGER DEFAULT 0;

-- 2. Create a table for Quota History/Logs (to track changes)
CREATE TABLE IF NOT EXISTS public.quotas_historique (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE,
    carburant TEXT NOT NULL,
    ancien_quota INTEGER,
    nouveau_quota INTEGER,
    modifie_par UUID REFERENCES auth.users(id),
    date_modification TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quotas_historique ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin etat and analyste can view quota history"
ON public.quotas_historique FOR SELECT
TO authenticated
USING (can_access_level(auth.uid(), 'analyste'));

CREATE POLICY "Admin etat can manage quota history"
ON public.quotas_historique FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin_etat'));

-- 3. Function to log quota changes
CREATE OR REPLACE FUNCTION public.log_quota_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.quota_essence != NEW.quota_essence) THEN
        INSERT INTO public.quotas_historique (entreprise_id, carburant, ancien_quota, nouveau_quota, modifie_par)
        VALUES (NEW.id, 'essence', OLD.quota_essence, NEW.quota_essence, auth.uid());
    END IF;
    IF (OLD.quota_gasoil != NEW.quota_gasoil) THEN
        INSERT INTO public.quotas_historique (entreprise_id, carburant, ancien_quota, nouveau_quota, modifie_par)
        VALUES (NEW.id, 'gasoil', OLD.quota_gasoil, NEW.quota_gasoil, auth.uid());
    END IF;
    -- (Add others if needed)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_log_quota_changes
AFTER UPDATE OF quota_essence, quota_gasoil ON public.entreprises
FOR EACH ROW
EXECUTE FUNCTION public.log_quota_changes();

COMMIT;
