-- Migration to automate quota consumption updates based on deliveries (livraisons)
-- 1. Function to update quantities used in the monthly quotas
CREATE OR REPLACE FUNCTION public.update_quota_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_annee INTEGER;
  v_mois INTEGER;
  v_entreprise_id UUID;
BEGIN
  -- Extract year and month from the delivery date
  -- Table livraisons has date_livraison or created_at.
  v_annee := EXTRACT(YEAR FROM NEW.date_livraison);
  v_mois := EXTRACT(MONTH FROM NEW.date_livraison);
  
  -- Get the enterprise_id from the station
  SELECT entreprise_id INTO v_entreprise_id 
  FROM public.stations 
  WHERE id = NEW.station_id;

  -- Only update if the delivery status changed to 'livree'
  IF NEW.statut = 'livree' AND (OLD.statut IS NULL OR OLD.statut != 'livree') THEN
      -- Update Station Quota
      UPDATE public.quotas_stations
      SET quantite_utilisee = quantite_utilisee + NEW.quantite,
          updated_at = now()
      WHERE station_id = NEW.station_id 
        AND annee = v_annee 
        AND mois = v_mois 
        AND produit = lower(NEW.carburant);
        
      -- Update Enterprise Quota
      IF v_entreprise_id IS NOT NULL THEN
        UPDATE public.quotas_entreprises
        SET quantite_utilisee = quantite_utilisee + NEW.quantite,
            updated_at = now()
        WHERE entreprise_id = v_entreprise_id 
          AND annee = v_annee 
          AND mois = v_mois 
          AND produit = lower(NEW.carburant);
      END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Trigger on livraisons
DROP TRIGGER IF EXISTS tr_quota_consumption ON public.livraisons;
CREATE TRIGGER tr_quota_consumption
AFTER UPDATE OF statut ON public.livraisons
FOR EACH ROW
EXECUTE FUNCTION public.update_quota_on_delivery();
