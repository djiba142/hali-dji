-- Migration pour le système national de gestion des quotas SIHG (SONAP)
-- Permet une gestion multiniveau : État -> Entreprises -> Stations

-- 1. Quotas Nationaux (Fixés par la SONAP / Présidence)
CREATE TABLE IF NOT EXISTS quotas_nationaux (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annee INTEGER NOT NULL,
    mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
    produit TEXT NOT NULL CHECK (produit IN ('essence', 'gasoil', 'gpl', 'lubrifiants')),
    quantite_prevue NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(annee, mois, produit)
);

-- 2. Quotas par Entreprise (Allocation État -> Compagnie)
CREATE TABLE IF NOT EXISTS quotas_entreprises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
    annee INTEGER NOT NULL,
    mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
    produit TEXT NOT NULL CHECK (produit IN ('essence', 'gasoil', 'gpl', 'lubrifiants')),
    quantite_allouee NUMERIC NOT NULL DEFAULT 0,
    quantite_utilisee NUMERIC NOT NULL DEFAULT 0,
    statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu', 'depasse')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(entreprise_id, annee, mois, produit)
);

-- 3. Quotas par Station (Répartition Compagnie -> Station)
CREATE TABLE IF NOT EXISTS quotas_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
    annee INTEGER NOT NULL,
    mois INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
    produit TEXT NOT NULL CHECK (produit IN ('essence', 'gasoil', 'gpl', 'lubrifiants')),
    quantite_allouee NUMERIC NOT NULL DEFAULT 0,
    quantite_utilisee NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(station_id, annee, mois, produit)
);

-- Activation de la sécurité (RLS)
ALTER TABLE quotas_nationaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotas_entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotas_stations ENABLE ROW LEVEL SECURITY;

-- Politiques RLS (Accessibles à tous les utilisateurs authentifiés pour le moment, à affiner selon les rôles)
CREATE POLICY "Lecture Quotas Nationaux" ON quotas_nationaux FOR SELECT USING (true);
CREATE POLICY "Gestion Quotas Nationaux" ON quotas_nationaux FOR ALL USING (true); -- Devrait être restreint à admin_etat / super_admin

CREATE POLICY "Lecture Quotas Entreprises" ON quotas_entreprises FOR SELECT USING (true);
CREATE POLICY "Gestion Quotas Entreprises" ON quotas_entreprises FOR ALL USING (true);

CREATE POLICY "Lecture Quotas Stations" ON quotas_stations FOR SELECT USING (true);
CREATE POLICY "Gestion Quotas Stations" ON quotas_stations FOR ALL USING (true);

-- Insertion de données de test pour 2026 (Juin) pour illustrer le système
INSERT INTO quotas_nationaux (annee, mois, produit, quantite_prevue) VALUES 
(2026, 6, 'essence', 50000000),
(2026, 6, 'gasoil', 80000000)
ON CONFLICT DO NOTHING;
