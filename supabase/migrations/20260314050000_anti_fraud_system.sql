-- SIHG Anti-Fraud & Advanced Security Migration

-- 1. Fraud Alerts Table
CREATE TABLE IF NOT EXISTS public.fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL, -- 'incoherence_stock', 'vente_anormale', 'connexion_suspecte'
    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    station_id UUID REFERENCES public.stations(id),
    entreprise_id UUID REFERENCES public.entreprises(id),
    details JSONB DEFAULT '{}'::jsonb,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 2. Enable Real-time for Fraud Alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.fraud_alerts;

-- 3. Incoherence Detection Function (Placeholder for logic)
CREATE OR REPLACE FUNCTION check_stock_consistency()
RETURNS TRIGGER AS $$
DECLARE
    last_stock_essence FLOAT;
    total_sales FLOAT;
    total_deliveries FLOAT;
    expected_stock FLOAT;
    diff FLOAT;
BEGIN
    -- This is a simplified logic. In a real system, we'd query transactions.
    -- If (New Stock < Old Stock) and no matching sales recorded -> Alert
    
    -- For now, let's just log high-volume drops (> 5000L in one update)
    IF (OLD.stock_essence - NEW.stock_essence) > 5000 THEN
        INSERT INTO public.fraud_alerts (type, severity, station_id, entreprise_id, details)
        VALUES (
            'vente_anormale', 
            'high', 
            NEW.id, 
            NEW.entreprise_id, 
            jsonb_build_object(
                'message', 'Chute brutale du stock d''essence détectée',
                'volume_perdu', OLD.stock_essence - NEW.stock_essence,
                'ancien_stock', OLD.stock_essence,
                'nouveau_stock', NEW.stock_essence
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger on stations (assuming stock columns are there)
DROP TRIGGER IF EXISTS tr_check_stock_fraud ON public.stations;
CREATE TRIGGER tr_check_stock_fraud
AFTER UPDATE OF stock_essence, stock_gasoil
ON public.stations
FOR EACH ROW
EXECUTE FUNCTION check_stock_consistency();

-- 5. Enhanced RLS for Security
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all fraud alerts"
ON public.fraud_alerts FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin_etat', 'directeur_general', 'inspecteur')
    )
);

-- 6. IP Tracking in Audit Logs (Handled by Supabase but we ensure the column is used)
-- Note: The server-side IP is often different, but we can capture it in the client-side log insert.
