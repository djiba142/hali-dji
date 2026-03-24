-- Table pour les entreprises (distributeurs pétroliers)
CREATE TABLE public.entreprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  sigle TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('compagnie', 'distributeur')),
  numero_agrement TEXT UNIQUE NOT NULL,
  region TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu', 'ferme')),
  logo_url TEXT,
  contact_nom TEXT,
  contact_telephone TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour les stations-service
CREATE TABLE public.stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE NOT NULL,
  nom TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  adresse TEXT NOT NULL,
  ville TEXT NOT NULL,
  region TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  type TEXT NOT NULL CHECK (type IN ('urbaine', 'routiere', 'depot')),
  capacite_essence INTEGER NOT NULL DEFAULT 0,
  capacite_gasoil INTEGER NOT NULL DEFAULT 0,
  capacite_gpl INTEGER NOT NULL DEFAULT 0,
  capacite_lubrifiants INTEGER NOT NULL DEFAULT 0,
  stock_essence INTEGER NOT NULL DEFAULT 0,
  stock_gasoil INTEGER NOT NULL DEFAULT 0,
  stock_gpl INTEGER NOT NULL DEFAULT 0,
  stock_lubrifiants INTEGER NOT NULL DEFAULT 0,
  nombre_pompes INTEGER NOT NULL DEFAULT 2,
  gestionnaire_nom TEXT,
  gestionnaire_telephone TEXT,
  gestionnaire_email TEXT,
  statut TEXT NOT NULL DEFAULT 'ouverte' CHECK (statut IN ('ouverte', 'fermee', 'en_travaux', 'attente_validation')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour les livraisons
CREATE TABLE public.livraisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE NOT NULL,
  carburant TEXT NOT NULL CHECK (carburant IN ('essence', 'gasoil', 'gpl', 'lubrifiants')),
  quantite INTEGER NOT NULL,
  date_livraison TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT, -- Dépôt d'origine
  camion_immatriculation TEXT,
  chauffeur_nom TEXT,
  bon_livraison TEXT,
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'livree', 'annulee')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour les ordres de livraison (SGP)
CREATE TABLE public.ordres_livraison (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE NOT NULL,
  carburant TEXT NOT NULL CHECK (carburant IN ('essence', 'gasoil', 'gpl', 'lubrifiants')),
  quantite_demandee INTEGER NOT NULL,
  priorite TEXT NOT NULL DEFAULT 'normale' CHECK (priorite IN ('urgente', 'haute', 'normale', 'basse')),
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuve', 'en_cours', 'livre', 'annule')),
  date_demande TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_approbation TIMESTAMPTZ,
  date_expedition TIMESTAMPTZ,
  date_livraison TIMESTAMPTZ,
  approuve_par UUID REFERENCES auth.users(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour les importations maritimes (SONAP)
CREATE TABLE public.importations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  navire_nom TEXT NOT NULL,
  carburant TEXT NOT NULL CHECK (carburant IN ('essence', 'gasoil', 'gpl', 'lubrifiants')),
  quantite_tonnes INTEGER NOT NULL,
  port_origine TEXT,
  date_depart TIMESTAMPTZ,
  date_arrivee_prevue TIMESTAMPTZ,
  date_arrivee_effective TIMESTAMPTZ,
  statut TEXT NOT NULL DEFAULT 'en_route' CHECK (statut IN ('planifie', 'en_route', 'au_port', 'dechargement', 'termine')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour les alertes
CREATE TABLE public.alertes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
  entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('stock_critical', 'stock_warning', 'price_anomaly', 'station_closed', 'importation')),
  niveau TEXT NOT NULL CHECK (niveau IN ('critique', 'alerte', 'info')),
  message TEXT NOT NULL,
  resolu BOOLEAN NOT NULL DEFAULT false,
  resolu_par UUID REFERENCES auth.users(id),
  resolu_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour les prix officiels
CREATE TABLE public.prix_officiels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carburant TEXT NOT NULL CHECK (carburant IN ('essence', 'gasoil', 'gpl', 'lubrifiants')),
  prix_litre DECIMAL(10,2) NOT NULL,
  date_effet TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_par UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour l'historique des stocks (pour les graphiques)
CREATE TABLE public.historique_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE NOT NULL,
  date_releve DATE NOT NULL,
  stock_essence INTEGER NOT NULL DEFAULT 0,
  stock_gasoil INTEGER NOT NULL DEFAULT 0,
  stock_gpl INTEGER NOT NULL DEFAULT 0,
  stock_lubrifiants INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(station_id, date_releve)
);

-- Enable RLS on all tables
ALTER TABLE public.entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livraisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordres_livraison ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.importations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prix_officiels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historique_stocks ENABLE ROW LEVEL SECURITY;

-- Function to get user's entreprise_id
CREATE OR REPLACE FUNCTION public.get_user_entreprise_id(_user_id uuid)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT entreprise_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Function to get user's station_id
CREATE OR REPLACE FUNCTION public.get_user_station_id(_user_id uuid)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT station_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for entreprises
CREATE POLICY "Authenticated users can view all entreprises"
  ON public.entreprises FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin etat and super admin can manage entreprises"
  ON public.entreprises FOR ALL
  TO authenticated
  USING (can_access_level(auth.uid(), 'admin_etat'));

-- RLS Policies for stations
CREATE POLICY "Authenticated users can view all stations"
  ON public.stations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin etat can manage all stations"
  ON public.stations FOR ALL
  TO authenticated
  USING (can_access_level(auth.uid(), 'admin_etat'));

CREATE POLICY "Responsable entreprise can manage their stations"
  ON public.stations FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'responsable_entreprise') AND
    entreprise_id::text = get_user_entreprise_id(auth.uid())
  );

CREATE POLICY "Gestionnaire can update their station"
  ON public.stations FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'gestionnaire_station') AND
    id::text = get_user_station_id(auth.uid())
  );

-- RLS Policies for livraisons
CREATE POLICY "Admin and inspecteur can view all livraisons"
  ON public.livraisons FOR SELECT
  TO authenticated
  USING (can_access_level(auth.uid(), 'inspecteur'));

CREATE POLICY "Responsable can view their entreprise livraisons"
  ON public.livraisons FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'responsable_entreprise') AND
    station_id IN (
      SELECT id FROM public.stations 
      WHERE entreprise_id::text = get_user_entreprise_id(auth.uid())
    )
  );

CREATE POLICY "Gestionnaire can manage their station livraisons"
  ON public.livraisons FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'gestionnaire_station') AND
    station_id::text = get_user_station_id(auth.uid())
  );

-- RLS Policies for ordres_livraison
CREATE POLICY "Admin etat can manage all ordres"
  ON public.ordres_livraison FOR ALL
  TO authenticated
  USING (can_access_level(auth.uid(), 'admin_etat'));

CREATE POLICY "Inspecteur can view ordres"
  ON public.ordres_livraison FOR SELECT
  TO authenticated
  USING (can_access_level(auth.uid(), 'inspecteur'));

CREATE POLICY "Responsable can view their entreprise ordres"
  ON public.ordres_livraison FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'responsable_entreprise') AND
    station_id IN (
      SELECT id FROM public.stations 
      WHERE entreprise_id::text = get_user_entreprise_id(auth.uid())
    )
  );

-- RLS Policies for importations (SONAP only)
CREATE POLICY "Admin etat can manage importations"
  ON public.importations FOR ALL
  TO authenticated
  USING (can_access_level(auth.uid(), 'admin_etat'));

CREATE POLICY "Inspecteur can view importations"
  ON public.importations FOR SELECT
  TO authenticated
  USING (can_access_level(auth.uid(), 'inspecteur'));

-- RLS Policies for alertes
CREATE POLICY "Admin and inspecteur can view all alertes"
  ON public.alertes FOR SELECT
  TO authenticated
  USING (can_access_level(auth.uid(), 'inspecteur'));

CREATE POLICY "Admin etat can manage alertes"
  ON public.alertes FOR ALL
  TO authenticated
  USING (can_access_level(auth.uid(), 'admin_etat'));

CREATE POLICY "Responsable can view their entreprise alertes"
  ON public.alertes FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'responsable_entreprise') AND
    entreprise_id::text = get_user_entreprise_id(auth.uid())
  );

-- RLS Policies for prix_officiels
CREATE POLICY "All authenticated can view prix"
  ON public.prix_officiels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admin etat can manage prix"
  ON public.prix_officiels FOR ALL
  TO authenticated
  USING (can_access_level(auth.uid(), 'admin_etat'));

-- RLS Policies for historique_stocks
CREATE POLICY "All authenticated can view historique"
  ON public.historique_stocks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Gestionnaire can insert their station historique"
  ON public.historique_stocks FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'gestionnaire_station') AND
    station_id::text = get_user_station_id(auth.uid())
  );

-- Triggers for updated_at
CREATE TRIGGER update_entreprises_updated_at
  BEFORE UPDATE ON public.entreprises
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stations_updated_at
  BEFORE UPDATE ON public.stations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ordres_livraison_updated_at
  BEFORE UPDATE ON public.ordres_livraison
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_importations_updated_at
  BEFORE UPDATE ON public.importations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial data
INSERT INTO public.prix_officiels (carburant, prix_litre) VALUES
  ('essence', 12500),
  ('gasoil', 11500),
  ('gpl', 8000),
  ('lubrifiants', 25000);

-- Insert sample entreprises
INSERT INTO public.entreprises (nom, sigle, type, numero_agrement, region, logo_url, contact_nom, contact_telephone, contact_email) VALUES
  ('TotalEnergies Guinée', 'TOTAL', 'compagnie', 'AGR-2024-001', 'Conakry', NULL, 'Mamadou Diallo', '+224 622 00 00 01', 'contact@total.gn'),
  ('Shell Guinée', 'SHELL', 'compagnie', 'AGR-2024-002', 'Conakry', NULL, 'Fatoumata Camara', '+224 622 00 00 02', 'contact@shell.gn'),
  ('Kamsar Petroleum', 'KP', 'distributeur', 'AGR-2024-003', 'Boké', NULL, 'Ibrahima Sow', '+224 622 00 00 03', 'contact@kp.gn'),
  ('Trade Market International', 'TMI', 'distributeur', 'AGR-2024-004', 'Conakry', NULL, 'Alpha Barry', '+224 622 00 00 04', 'contact@tmi.gn'),
  ('Star Oil Guinée', 'STAR', 'distributeur', 'AGR-2024-005', 'Kindia', NULL, 'Ousmane Bah', '+224 622 00 00 05', 'contact@staroil.gn');

-- Insert sample stations
INSERT INTO public.stations (entreprise_id, nom, code, adresse, ville, region, latitude, longitude, type, capacite_essence, capacite_gasoil, stock_essence, stock_gasoil, nombre_pompes, gestionnaire_nom, gestionnaire_telephone)
SELECT 
  e.id,
  'Station ' || e.sigle || ' ' || s.ville,
  e.sigle || '-' || s.code,
  s.adresse,
  s.ville,
  s.region,
  s.lat,
  s.lng,
  s.type,
  s.cap_ess,
  s.cap_gas,
  s.stock_ess,
  s.stock_gas,
  s.pompes,
  'Gestionnaire ' || s.code,
  '+224 622 00 ' || s.code
FROM public.entreprises e
CROSS JOIN (VALUES
  ('001', 'Conakry', 'Conakry', 'Avenue de la République', 9.5092, -13.7122, 'urbaine', 50000, 50000, 35000, 28000, 8),
  ('002', 'Kindia', 'Kindia', 'Route Nationale 1', 10.0601, -12.8628, 'routiere', 30000, 30000, 8000, 12000, 4),
  ('003', 'Boké', 'Boké', 'Centre-ville', 10.9322, -14.2917, 'urbaine', 40000, 40000, 32000, 25000, 6),
  ('004', 'Mamou', 'Mamou', 'Carrefour Principal', 10.3741, -12.0912, 'routiere', 25000, 25000, 5000, 8000, 4),
  ('005', 'Labé', 'Labé', 'Quartier Commercial', 11.3181, -12.2856, 'urbaine', 35000, 35000, 28000, 22000, 6)
) AS s(code, ville, region, adresse, lat, lng, type, cap_ess, cap_gas, stock_ess, stock_gas, pompes)
WHERE e.sigle IN ('TOTAL', 'SHELL');

-- Insert sample importations
INSERT INTO public.importations (navire_nom, carburant, quantite_tonnes, port_origine, date_depart, date_arrivee_prevue, statut) VALUES
  ('MT Atlantic Star', 'gasoil', 30000, 'Rotterdam', now() - interval '5 days', now() + interval '3 days', 'en_route'),
  ('MT Gulf Pride', 'essence', 25000, 'Abidjan', now() - interval '2 days', now() + interval '1 day', 'en_route'),
  ('MT Ocean Carrier', 'gasoil', 20000, 'Dakar', now() - interval '1 day', now(), 'au_port');

-- Insert sample alertes
INSERT INTO public.alertes (station_id, type, niveau, message)
SELECT s.id, 'stock_warning', 'alerte', 'Stock de gasoil inférieur à 25% de la capacité'
FROM public.stations s
WHERE s.stock_gasoil::float / NULLIF(s.capacite_gasoil, 0) < 0.25
LIMIT 3;