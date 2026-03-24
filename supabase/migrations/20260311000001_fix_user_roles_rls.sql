BEGIN;

DROP POLICY IF EXISTS "Les administrateurs peuvent voir tous les rôles" ON public.user_roles;
CREATE POLICY "Les administrateurs peuvent voir tous les rôles" 
ON public.user_roles FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN (
            'super_admin', 'admin_etat', 'superviseur_aval', 'service_it',
            'directeur_general', 'directeur_adjoint', 'inspecteur', 'analyste'
        )
    )
    OR user_id = auth.uid()
);

COMMIT;
