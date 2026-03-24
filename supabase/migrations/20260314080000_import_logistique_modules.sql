-- ================================================
-- MODULE IMPORTATION & LOGISTIQUE - SIHG v2.0
-- Gestion des flux pétroliers SONAP
-- ================================================

-- 1. Ajout des rôles Importation et Logistique
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'directeur_importation') THEN
    ALTER TYPE public.app_role ADD VALUE 'directeur_importation';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'agent_importation') THEN
    ALTER TYPE public.app_role ADD VALUE 'agent_importation';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'directeur_logistique') THEN
    ALTER TYPE public.app_role ADD VALUE 'directeur_logistique';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'agent_logistique') THEN
    ALTER TYPE public.app_role ADD VALUE 'agent_logistique';
  END IF;
END $$;

-- 2. Produits Pétroliers
CREATE TABLE IF NOT EXISTS public.import_produits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL UNIQUE, -- Essence, Gasoil, Jet Fuel, Bitume, Kérosène
    code TEXT UNIQUE,
    description TEXT,
    unite TEXT DEFAULT 'Tonnes',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed initial products
INSERT INTO public.import_produits (nom, code) VALUES 
('Essence sans plomb', 'PMS'),
('Gasoil (Diesel)', 'AGO'),
('Kérosène / Jet A1', 'JET'),
('Fuel Oil', 'HFO'),
('Bitume', 'BIT')
ON CONFLICT (nom) DO NOTHING;

-- 3. Fournisseurs Internationaux (Trading)
CREATE TABLE IF NOT EXISTS public.import_fournisseurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    pays TEXT NOT NULL,
    adresse TEXT,
    contact_nom TEXT,
    contact_email TEXT,
    contact_tel TEXT,
    banque_infos JSONB,
    statut TEXT DEFAULT 'actif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Navires Pétroliers
CREATE TABLE IF NOT EXISTS public.import_navires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    imo_number TEXT UNIQUE NOT NULL, -- Numéro IMO mondial
    pavillon TEXT, -- Pays du pavillon
    capacite_mt DECIMAL(20,2), -- Capacité en Tonnes Métriques
    capitaine TEXT,
    port_attache TEXT,
    statut TEXT DEFAULT 'disponible', -- 'en_mer', 'au_port', 'disponible'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Dossiers d'Importation
CREATE TABLE IF NOT EXISTS public.import_dossiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_dossier TEXT NOT NULL UNIQUE,
    fournisseur_id UUID REFERENCES public.import_fournisseurs(id),
    produit_id UUID REFERENCES public.import_produits(id),
    quantite_prevue DECIMAL(20,2) NOT NULL,
    prix_unitaire_usd DECIMAL(20,2),
    port_depart TEXT,
    port_arrivee TEXT DEFAULT 'Port de Conakry',
    date_depart DATE,
    date_arrivee_est DATE,
    statut TEXT DEFAULT 'en_preparation', -- 'en_preparation', 'attente_juridique', 'attente_paiement', 'en_transport', 'arrive', 'livre'
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Cargaisons (Lien Dossier - Navire)
CREATE TABLE IF NOT EXISTS public.import_cargaisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dossier_id UUID REFERENCES public.import_dossiers(id),
    navire_id UUID REFERENCES public.import_navires(id),
    quantite_reelle DECIMAL(20,2),
    date_chargement TIMESTAMP WITH TIME ZONE,
    date_dechargement TIMESTAMP WITH TIME ZONE,
    certificat_qualite_url TEXT,
    statut TEXT DEFAULT 'prevue', -- 'en_chargement', 'en_transit', 'dechargee'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Dépôts Pétroliers (Logistique)
CREATE TABLE IF NOT EXISTS public.logistique_depots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL, -- Dépôt de Kaloum, Dépôt de Kankan, etc.
    localisation TEXT,
    capacite_max DECIMAL(20,2),
    responsable_id UUID REFERENCES public.profiles(user_id),
    statut TEXT DEFAULT 'actif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed initial depots
INSERT INTO public.logistique_depots (nom, localisation, capacite_max) VALUES 
('Dépôt Central de Kaloum', 'Conakry', 500000),
('Dépôt de Kamsar', 'Boké', 200000),
('Dépôt de Mamou', 'Mamou', 100000)
ON CONFLICT (nom) DO NOTHING;

-- 8. Stocks Dépôts
CREATE TABLE IF NOT EXISTS public.logistique_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    depot_id UUID REFERENCES public.logistique_depots(id),
    produit_id UUID REFERENCES public.import_produits(id),
    quantite_disponible DECIMAL(20,2) DEFAULT 0,
    seuil_alerte DECIMAL(20,2) DEFAULT 5000,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(depot_id, produit_id)
);

-- 9. Réceptions Logistiques (Workflow Import -> Logistique)
CREATE TABLE IF NOT EXISTS public.logistique_receptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cargaison_id UUID REFERENCES public.import_cargaisons(id),
    depot_id UUID REFERENCES public.logistique_depots(id),
    quantite_recue DECIMAL(20,2) NOT NULL,
    date_reception TIMESTAMP WITH TIME ZONE DEFAULT now(),
    recu_par UUID REFERENCES auth.users(id),
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Activation RLS
ALTER TABLE public.import_produits ENABLE CONTROL;
ALTER TABLE public.import_fournisseurs ENABLE CONTROL;
ALTER TABLE public.import_navires ENABLE CONTROL;
ALTER TABLE public.import_dossiers ENABLE CONTROL;
ALTER TABLE public.import_cargaisons ENABLE CONTROL;
ALTER TABLE public.logistique_depots ENABLE CONTROL;
ALTER TABLE public.logistique_stocks ENABLE CONTROL;
ALTER TABLE public.logistique_receptions ENABLE CONTROL;

-- 11. Politiques RLS Simplifiées (Super Admin + Directions concernées)
CREATE POLICY "Import users management" ON public.import_dossiers
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'directeur_importation', 'agent_importation', 'admin_etat')));

CREATE POLICY "Logistique users management" ON public.logistique_receptions
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'directeur_logistique', 'agent_logistique', 'admin_etat')));

-- 12. Trigger pour mettre à jour le stock automatiquement lors d'une réception
CREATE OR REPLACE FUNCTION public.update_depot_stock_on_reception()
RETURNS TRIGGER AS $$
DECLARE
    v_produit_id UUID;
BEGIN
    -- Récupérer le produit_id depuis la cargaison/dossier
    SELECT d.produit_id INTO v_produit_id 
    FROM public.import_cargaisons c
    JOIN public.import_dossiers d ON c.dossier_id = d.id
    WHERE c.id = NEW.cargaison_id;

    -- Insérer ou mettre à jour le stock
    INSERT INTO public.logistique_stocks (depot_id, produit_id, quantite_disponible, updated_at)
    VALUES (NEW.depot_id, v_produit_id, NEW.quantite_recue, now())
    ON CONFLICT (depot_id, produit_id) 
    DO UPDATE SET 
        quantite_disponible = public.logistique_stocks.quantite_disponible + EXCLUDED.quantite_recue,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reception_stock
AFTER INSERT ON public.logistique_receptions
FOR EACH ROW EXECUTE FUNCTION public.update_depot_stock_on_reception();
