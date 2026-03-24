-- Final SQL setup for SIHG v2.0 roles and audit
-- This ensures all roles are available and audit table exists

-- 1. Extend app_role if needed
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

-- 2. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    action_type TEXT NOT NULL,
    resource_type TEXT,
    resource_name TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    ip_address TEXT,
    user_agent TEXT,
    entreprise_id UUID REFERENCES public.entreprises(id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);

-- Disable RLS for internal logging if needed, or enable with policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own logs
CREATE POLICY "Users can insert their own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin_etat', 'directeur_general', 'directeur_adjoint', 'service_it')
  )
);

-- Allow company managers to see logs for their company
CREATE POLICY "Company managers can view their company's audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'responsable_entreprise'
  ) AND (
    entreprise_id IN (
      SELECT NULLIF(entreprise_id, '')::uuid FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- Update profile status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'actif';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT true;
