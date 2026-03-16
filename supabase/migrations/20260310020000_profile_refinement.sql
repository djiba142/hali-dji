-- Migration: Profile Refinement with Organigram Fields
-- This script adds organisation, direction, and poste to the profiles table to match the SONAP organigram.

BEGIN;

-- Add new columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'organisation') THEN
        ALTER TABLE public.profiles ADD COLUMN organisation TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'direction') THEN
        ALTER TABLE public.profiles ADD COLUMN direction TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'profiles' AND COLUMN_NAME = 'poste') THEN
        ALTER TABLE public.profiles ADD COLUMN poste TEXT;
    END IF;
END $$;

-- Update RLS policies to ensure users can read their own new fields (already covered by existing policies usually)
-- But ensuring accessibility for admins
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('super_admin', 'admin_etat', 'superviseur_aval', 'service_it')
    )
);

COMMIT;
