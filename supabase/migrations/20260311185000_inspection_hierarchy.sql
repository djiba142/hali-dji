-- Ajout de la hiérarchie administrative
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prefectures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
    UNIQUE(nom, region_id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertion des régions de Guinée
INSERT INTO regions (nom) VALUES 
('Conakry'), ('Kindia'), ('Boké'), ('Labé'), ('Mamou'), ('Faranah'), ('Kankan'), ('N’Zérékoré')
ON CONFLICT (nom) DO NOTHING;

-- Insertion de quelques préfectures
INSERT INTO prefectures (nom, region_id) 
SELECT 'Conakry', id FROM regions WHERE nom = 'Conakry' ON CONFLICT DO NOTHING;
INSERT INTO prefectures (nom, region_id) 
SELECT 'Kindia', id FROM regions WHERE nom = 'Kindia' ON CONFLICT DO NOTHING;
INSERT INTO prefectures (nom, region_id) 
SELECT 'Boké', id FROM regions WHERE nom = 'Boké' ON CONFLICT DO NOTHING;

-- Ajout des colonnes à la table stations
ALTER TABLE stations ADD COLUMN IF NOT EXISTS prefecture_id UUID REFERENCES prefectures(id);
ALTER TABLE stations ADD COLUMN IF NOT EXISTS commune TEXT;

-- Mise à jour de la table observations (Inspections)
-- Si la table n'existe pas, on la crée proprement
CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    station_nom TEXT,
    inspecteur_id UUID REFERENCES profiles(id),
    type TEXT NOT NULL,
    description TEXT,
    date TIMESTAMPTZ DEFAULT now(),
    statut TEXT DEFAULT 'ouverte',
    region TEXT,
    prefecture TEXT,
    photos TEXT[], -- Array d'URLs vers Supabase Storage
    stock_essence_reel NUMERIC,
    stock_gasoil_reel NUMERIC,
    ecart_essence NUMERIC,
    ecart_gasoil NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Mise à jour des profils pour inclure la préfecture
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prefecture TEXT;
