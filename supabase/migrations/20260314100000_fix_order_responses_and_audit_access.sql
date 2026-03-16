-- Migration to allow Enterprise to update their orders (add responses/justifications)
-- and refine DSA permissions on Audit.

BEGIN;

-- 1. Ensure Responsable Entreprise can update orders for their stations
DROP POLICY IF EXISTS "Responsable can update their company orders" ON public.ordres_livraison;

CREATE POLICY "Responsable can update their company orders"
ON public.ordres_livraison FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'responsable_entreprise') AND
  (
    entreprise_id::text = get_user_entreprise_id(auth.uid()) OR
    station_id IN (
        SELECT id FROM public.stations 
        WHERE entreprise_id::text = get_user_entreprise_id(auth.uid())
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'responsable_entreprise') AND
  (
    entreprise_id::text = get_user_entreprise_id(auth.uid()) OR
    station_id IN (
        SELECT id FROM public.stations 
        WHERE entreprise_id::text = get_user_entreprise_id(auth.uid())
    )
  )
);

-- 2. Allow updating both 'statut' and 'notes'
-- This is already covered by the POLICY above (FOR UPDATE).

-- 3. Refine Audit Log access
-- The user mentioned DSA shouldn't see Audit.
-- Let's check the current policy on audit_logs.

DROP POLICY IF EXISTS "Super Admin can view audit logs" ON public.audit_logs;
CREATE POLICY "Privileged roles can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'service_it') OR
  has_role(auth.uid(), 'directeur_general') OR
  has_role(auth.uid(), 'directeur_adjoint')
);

-- Note: admin_etat and superviseur_aval are intentionally excluded here per user request.

COMMIT;
