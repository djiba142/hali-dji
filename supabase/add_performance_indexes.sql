-- Performance Optimization: Add Missing Indexes for 2s Load Time Target
-- These indexes dramatically improve query performance on large datasets

-- Stations table indexes
CREATE INDEX IF NOT EXISTS idx_stations_entreprise_id 
ON stations(entreprise_id);

CREATE INDEX IF NOT EXISTS idx_stations_region 
ON stations(region);

CREATE INDEX IF NOT EXISTS idx_stations_statut 
ON stations(statut);

CREATE INDEX IF NOT EXISTS idx_stations_entreprise_region 
ON stations(entreprise_id, region);

-- Alertes table indexes  
CREATE INDEX IF NOT EXISTS idx_alertes_entreprise_id 
ON alertes(entreprise_id);

CREATE INDEX IF NOT EXISTS idx_alertes_station_id 
ON alertes(station_id);

CREATE INDEX IF NOT EXISTS idx_alertes_resolu 
ON alertes(resolu);

CREATE INDEX IF NOT EXISTS idx_alertes_niveau 
ON alertes(niveau);

CREATE INDEX IF NOT EXISTS idx_alertes_created_at 
ON alertes(created_at DESC);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_entreprise_id 
ON profiles(entreprise_id);

CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON profiles(role);

-- Entreprises table indexes
CREATE INDEX IF NOT EXISTS idx_entreprises_sigle 
ON entreprises(sigle);

-- Importations table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_importations_date_arrivee 
ON importations(date_arrivee_prevue DESC);

CREATE INDEX IF NOT EXISTS idx_importations_statut 
ON importations(statut);

-- Enable query optimization statistics
ANALYZE stations;
ANALYZE alertes;
ANALYZE profiles;
ANALYZE entreprises;
ANALYZE importations;

-- Vacuum to recover disk space
VACUUM ANALYZE;
