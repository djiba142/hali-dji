-- Corriger la contrainte alertes pour inclure stock_bas utilisé par le trigger
ALTER TABLE public.alertes DROP CONSTRAINT IF EXISTS alertes_type_check;

ALTER TABLE public.alertes ADD CONSTRAINT alertes_type_check 
CHECK (type = ANY (ARRAY['stock_critical'::text, 'stock_warning'::text, 'stock_bas'::text, 'price_anomaly'::text, 'station_closed'::text, 'importation'::text, 'securite'::text]));