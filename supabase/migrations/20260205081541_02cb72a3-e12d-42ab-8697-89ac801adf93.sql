-- Ajouter le type 'securite' à la contrainte des alertes
ALTER TABLE public.alertes DROP CONSTRAINT IF EXISTS alertes_type_check;

ALTER TABLE public.alertes ADD CONSTRAINT alertes_type_check 
CHECK (type = ANY (ARRAY['stock_critical'::text, 'stock_warning'::text, 'price_anomaly'::text, 'station_closed'::text, 'importation'::text, 'securite'::text]));