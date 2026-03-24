-- Enable Realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.stations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.importations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ordres_livraison;
ALTER PUBLICATION supabase_realtime ADD TABLE public.livraisons;

-- Create function to automatically generate alerts when stock is low
CREATE OR REPLACE FUNCTION public.check_stock_and_create_alert()
RETURNS TRIGGER AS $$
DECLARE
  seuil_critique INTEGER := 10;
  seuil_warning INTEGER := 25;
  essence_percent INTEGER;
  gasoil_percent INTEGER;
  alert_message TEXT;
  alert_niveau TEXT;
  existing_alert_id UUID;
BEGIN
  -- Calculate percentages
  IF NEW.capacite_essence > 0 THEN
    essence_percent := (NEW.stock_essence * 100) / NEW.capacite_essence;
  ELSE
    essence_percent := 100;
  END IF;
  
  IF NEW.capacite_gasoil > 0 THEN
    gasoil_percent := (NEW.stock_gasoil * 100) / NEW.capacite_gasoil;
  ELSE
    gasoil_percent := 100;
  END IF;
  
  -- Check for critical essence level
  IF essence_percent < seuil_critique THEN
    alert_niveau := 'critique';
    alert_message := 'Stock Essence critique (' || essence_percent || '%) - Station ' || NEW.nom || ' à ' || NEW.ville;
    
    -- Check if similar unresolved alert exists
    SELECT id INTO existing_alert_id FROM public.alertes 
    WHERE station_id = NEW.id 
      AND type = 'stock_bas' 
      AND message LIKE '%Essence%'
      AND resolu = false
    LIMIT 1;
    
    IF existing_alert_id IS NULL THEN
      INSERT INTO public.alertes (station_id, entreprise_id, type, niveau, message)
      VALUES (NEW.id, NEW.entreprise_id, 'stock_bas', alert_niveau, alert_message);
    END IF;
  ELSIF essence_percent < seuil_warning THEN
    alert_niveau := 'warning';
    alert_message := 'Stock Essence bas (' || essence_percent || '%) - Station ' || NEW.nom || ' à ' || NEW.ville;
    
    SELECT id INTO existing_alert_id FROM public.alertes 
    WHERE station_id = NEW.id 
      AND type = 'stock_bas' 
      AND message LIKE '%Essence%'
      AND resolu = false
    LIMIT 1;
    
    IF existing_alert_id IS NULL THEN
      INSERT INTO public.alertes (station_id, entreprise_id, type, niveau, message)
      VALUES (NEW.id, NEW.entreprise_id, 'stock_bas', alert_niveau, alert_message);
    END IF;
  ELSE
    -- Auto-resolve old alerts if stock is now good
    UPDATE public.alertes 
    SET resolu = true, resolu_at = now()
    WHERE station_id = NEW.id 
      AND type = 'stock_bas' 
      AND message LIKE '%Essence%'
      AND resolu = false;
  END IF;
  
  -- Check for critical gasoil level
  IF gasoil_percent < seuil_critique THEN
    alert_niveau := 'critique';
    alert_message := 'Stock Gasoil critique (' || gasoil_percent || '%) - Station ' || NEW.nom || ' à ' || NEW.ville;
    
    SELECT id INTO existing_alert_id FROM public.alertes 
    WHERE station_id = NEW.id 
      AND type = 'stock_bas' 
      AND message LIKE '%Gasoil%'
      AND resolu = false
    LIMIT 1;
    
    IF existing_alert_id IS NULL THEN
      INSERT INTO public.alertes (station_id, entreprise_id, type, niveau, message)
      VALUES (NEW.id, NEW.entreprise_id, 'stock_bas', alert_niveau, alert_message);
    END IF;
  ELSIF gasoil_percent < seuil_warning THEN
    alert_niveau := 'warning';
    alert_message := 'Stock Gasoil bas (' || gasoil_percent || '%) - Station ' || NEW.nom || ' à ' || NEW.ville;
    
    SELECT id INTO existing_alert_id FROM public.alertes 
    WHERE station_id = NEW.id 
      AND type = 'stock_bas' 
      AND message LIKE '%Gasoil%'
      AND resolu = false
    LIMIT 1;
    
    IF existing_alert_id IS NULL THEN
      INSERT INTO public.alertes (station_id, entreprise_id, type, niveau, message)
      VALUES (NEW.id, NEW.entreprise_id, 'stock_bas', alert_niveau, alert_message);
    END IF;
  ELSE
    UPDATE public.alertes 
    SET resolu = true, resolu_at = now()
    WHERE station_id = NEW.id 
      AND type = 'stock_bas' 
      AND message LIKE '%Gasoil%'
      AND resolu = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic alerts on stock update
DROP TRIGGER IF EXISTS trigger_check_stock_alerts ON public.stations;
CREATE TRIGGER trigger_check_stock_alerts
  AFTER UPDATE OF stock_essence, stock_gasoil ON public.stations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_stock_and_create_alert();