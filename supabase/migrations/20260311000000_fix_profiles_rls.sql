-- Fix RLS policy for profiles to include DG and DGA
BEGIN;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role IN (
            'super_admin', 'admin_etat', 'superviseur_aval', 'service_it',
            'directeur_general', 'directeur_adjoint', 'inspecteur', 'analyste'
        )
    )
);

COMMIT;
