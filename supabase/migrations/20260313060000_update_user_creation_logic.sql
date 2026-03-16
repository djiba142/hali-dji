-- Add missing roles to app_role enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'technicien_aval') THEN
        ALTER TYPE public.app_role ADD VALUE 'technicien_aval';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'operateur_entreprise') THEN
        ALTER TYPE public.app_role ADD VALUE 'operateur_entreprise';
    END IF;
END $$;

-- Update the handle_new_user function to grab the role from metadata to stop creating bad defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_full_name TEXT;
  user_role TEXT;
BEGIN
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'gerant_station');

  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    user_full_name,
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Assign role based on metadata (or default if not provided)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;
