-- Migration pour les opérations de station-service SIHG
-- Tables pour les ventes, livraisons et incidents

-- Table des ventes (Sales)
CREATE TABLE IF NOT EXISTS ventes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES profiles(id),
    carburant TEXT NOT NULL CHECK (carburant IN ('essence', 'gasoil', 'gpl', 'lubrifiants')),
    quantite_litres NUMERIC NOT NULL,
    prix_unitaire NUMERIC NOT NULL,
    montant_total NUMERIC NOT NULL,
    pistolet_numero INTEGER,
    index_debut NUMERIC,
    index_fin NUMERIC,
    date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des livraisons (Deliveries)
CREATE TABLE IF NOT EXISTS livraisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    entreprise_id UUID REFERENCES entreprises(id) ON DELETE CASCADE,
    produit TEXT NOT NULL CHECK (produit IN ('essence', 'gasoil', 'gpl', 'lubrifiants')),
    quantite_prevue NUMERIC NOT NULL,
    quantite_recue NUMERIC,
    numero_bon TEXT UNIQUE,
    camion_plaque TEXT,
    chauffeur_nom TEXT,
    statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_cours', 'validee', 'rejetee')),
    date_depart TIMESTAMPTZ,
    date_reception TIMESTAMPTZ,
    valide_par UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table des incidents / pannes
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    signale_par UUID REFERENCES profiles(id),
    type TEXT NOT NULL, -- 'panne_pompe', 'probleme_iot', 'fuite', 'autre'
    description TEXT,
    priorite TEXT DEFAULT 'normale' CHECK (priorite IN ('basse', 'normale', 'haute', 'critique')),
    statut TEXT DEFAULT 'ouvert' CHECK (statut IN ('ouvert', 'en_cours', 'resolu', 'ferme')),
    date_signalement TIMESTAMPTZ DEFAULT now(),
    date_resolution TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE ventes ENABLE ROW LEVEL SECURITY;
ALTER TABLE livraisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for now - anyone authenticated can view/insert in their enterprise/station context)
-- In a real app, we'd use more complex RLS with get_user_station_id()
CREATE POLICY "Public Read Access Ventes" ON ventes FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Ventes" ON ventes FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Access Livraisons" ON livraisons FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Livraisons" ON livraisons FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access Livraisons" ON livraisons FOR UPDATE USING (true);

CREATE POLICY "Public Read Access Incidents" ON incidents FOR SELECT USING (true);
CREATE POLICY "Public Insert Access Incidents" ON incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access Incidents" ON incidents FOR UPDATE USING (true);
