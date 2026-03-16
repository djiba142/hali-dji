-- Unification des organisations dans les profils

UPDATE profiles 
SET organisation = 'dsa' 
WHERE organisation IN ('dsa_direction', 'dsa_adjoint', 'dsa_terrain');

UPDATE profiles 
SET organisation = 'admin_central' 
WHERE organisation IN ('sonap_dg', 'admin_regulation');

UPDATE profiles 
SET organisation = 'logistique' 
WHERE organisation IN ('logistique_sonap', 'logistique');

-- Si d'autres tables utilisent `organisation`, elles devraient être mises à jour ici.
