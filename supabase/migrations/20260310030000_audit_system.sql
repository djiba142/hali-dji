-- Migration to create audit_logs table and related triggers
-- This table tracks all strategic actions within the SIHG system

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    action_type TEXT NOT NULL,
    resource_type TEXT,
    resource_name TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'success',
    error_message TEXT,
    entreprise_id UUID REFERENCES public.entreprises(id),
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Only super_admin and admin_etat can view all logs
CREATE POLICY "Super admins can view all logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin_etat')
  )
);

-- Policy: Users involved in the log can view their own logs
CREATE POLICY "Users can view their own logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: System can insert logs
CREATE POLICY "Allow system to insert logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entreprise_id ON public.audit_logs(entreprise_id);

-- Commentary
COMMENT ON TABLE public.audit_logs IS 'Table des journaux d''audit pour la traçabilité des actions SIHG.';
