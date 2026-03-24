-- Fix the existing process_audit_log function to use the correct columns for audit_logs
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_email TEXT;
BEGIN
    v_user_email := COALESCE(auth.jwt() ->> 'email', 'system@sihg.gov.gn');
    
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action_type, resource_type, resource_name, details)
        VALUES (auth.uid(), v_user_email, TG_OP, TG_TABLE_NAME, CAST(OLD.id AS TEXT), jsonb_build_object('old_data', to_jsonb(OLD), 'new_data', to_jsonb(NEW)));
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action_type, resource_type, resource_name, details)
        VALUES (auth.uid(), v_user_email, TG_OP, TG_TABLE_NAME, CAST(NEW.id AS TEXT), jsonb_build_object('new_data', to_jsonb(NEW)));
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (user_id, user_email, action_type, resource_type, resource_name, details)
        VALUES (auth.uid(), v_user_email, TG_OP, TG_TABLE_NAME, CAST(OLD.id AS TEXT), jsonb_build_object('old_data', to_jsonb(OLD)));
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
