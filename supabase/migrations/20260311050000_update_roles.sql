-- Migration to update app_role enum and profiles table
-- 1. Update app_role enum (Supabase specific way is to use DO block or drop/recreate)
-- Since we can't easily alter enum values in some Postgres versions without dropping, we'll try to add them if they don't exist.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'directeur_general') THEN
        ALTER TYPE public.app_role ADD VALUE 'directeur_general';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'directeur_adjoint') THEN
        ALTER TYPE public.app_role ADD VALUE 'directeur_adjoint';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'gerant_station') THEN
        ALTER TYPE public.app_role ADD VALUE 'gerant_station';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'responsable_stock') THEN
        ALTER TYPE public.app_role ADD VALUE 'responsable_stock';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'agent_station') THEN
        ALTER TYPE public.app_role ADD VALUE 'agent_station';
    END IF;
END
$$;

-- 2. Add validation status to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'actif';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT true;

-- Update existing gestionnaire_station roles to gerant_station
UPDATE public.user_roles SET role = 'gerant_station' WHERE role = 'gestionnaire_station';

-- 3. Update RLS policies to include new roles
-- We need to ensure directeur_general and directeur_adjoint have same or more access than admin_etat

-- Example: Audit logs policy
DROP POLICY IF EXISTS "Super admins can view all logs" ON public.audit_logs;
CREATE POLICY "Super admins and SONAP DG/DGA can view all logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint')
  )
);
