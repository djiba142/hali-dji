-- Fix policy comparing UUID to TEXT
DROP POLICY IF EXISTS "Company managers can view their company's audit logs" ON public.audit_logs;

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
