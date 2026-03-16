-- Unification de la direction système dans la dsi
UPDATE profiles 
SET organisation = 'dsi' 
WHERE organisation = 'direction_systeme';

-- Suppression du rôle (poste) "Directeur du Système SIHG (Super Admin)"
-- Nous le remplaçons par "Super Administrateur National" pour les utilisateurs existants.
UPDATE profiles
SET poste = 'Super Administrateur National'
WHERE poste = 'Directeur du Système SIHG (Super Admin)';
