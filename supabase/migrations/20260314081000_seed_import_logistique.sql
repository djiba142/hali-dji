-- Semage des données initiales pour les modules Importation et Logistique
INSERT INTO public.import_produits (nom, description, code_douanier) VALUES
('Essence (PMS)', 'Premium Motor Spirit - Essence super sans plomb', '2710.12.11.00'),
('Gasoil (AGO)', 'Automotive Gas Oil - Diesel', '2710.19.21.00'),
('Kérosène (Jet A1)', 'Aviation Turbine Fuel', '2710.19.11.00'),
('Fuel Oïl', 'Fuel résiduel lourd', '2710.19.31.00')
ON CONFLICT (nom) DO NOTHING;

-- Données système de base maintenues (Produits et Dépôts)

INSERT INTO public.logistique_depots (nom, localisation, capacite_max) VALUES
('Dépôt Kaloum (SGP)', 'Conakry', 1500000),
('Dépôt Kamsar', 'Boké', 800000),
('Dépôt Mamou', 'Mamou', 150000),
('Dépôt Kankan', 'Kankan', 120000)
ON CONFLICT (nom) DO NOTHING;
