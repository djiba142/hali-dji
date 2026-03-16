-- Script de peuplement des stations pour les entreprises majeures
-- A exécuter dans l'éditeur SQL de Supabase

BEGIN;

-- Nettoyage optionnel (décommenter si vous voulez repartir à zéro)
-- DELETE FROM public.stations;

-- Insertion pour TOTAL (ID: e8e5f5f3-05ba-4f82-b8e7-0c043589bf25)
INSERT INTO public.stations (nom, code, entreprise_id, ville, region, adresse, type, statut, capacite_essence, capacite_gasoil, stock_essence, stock_gasoil, nombre_pompes, latitude, longitude) VALUES
('TOTAL Belle Vue', 'TOT-CON-001', 'e8e5f5f3-05ba-4f82-b8e7-0c043589bf25', 'Dixinn', 'Conakry', 'Route du Niger, Belle Vue', 'Station-Service', 'ouverte', 60000, 80000, 45000, 52000, 6, 9.537, -13.677),
('TOTAL Kipé Centre', 'TOT-RAT-002', 'e8e5f5f3-05ba-4f82-b8e7-0c043589bf25', 'Ratoma', 'Conakry', 'Carrefour Kipé', 'Station-Service', 'ouverte', 50000, 70000, 12000, 35000, 4, 9.610, -13.620),
('TOTAL Labé Yimbaya', 'TOT-LAB-003', 'e8e5f5f3-05ba-4f82-b8e7-0c043589bf25', 'Labé', 'Labé', 'Avenue Alpha Yaya', 'Station-Service', 'ouverte', 45000, 60000, 22000, 18000, 4, 11.318, -12.283),
('TOTAL Kankan Kouroussa', 'TOT-KAN-004', 'e8e5f5f3-05ba-4f82-b8e7-0c043589bf25', 'Kankan', 'Kankan', 'Route de Kissidougou', 'Station-Service', 'ouverte', 55000, 75000, 48000, 61000, 6, 10.385, -9.305),
('TOTAL Mamou Centre', 'TOT-MAM-005', 'e8e5f5f3-05ba-4f82-b8e7-0c043589bf25', 'Mamou', 'Mamou', 'Près de la Gare', 'Station-Service', 'ouverte', 40000, 55000, 5000, 12000, 4, 10.374, -12.091),
('TOTAL Siguiri Mine', 'TOT-SIG-006', 'e8e5f5f3-05ba-4f82-b8e7-0c043589bf25', 'Siguiri', 'Kankan', 'Zone Minière', 'Station-Service', 'ouverte', 80000, 120000, 65000, 95000, 8, 11.417, -9.167);

-- Insertion pour SHELL (ID: 1c76aac1-f5be-4073-9007-676360037cdc)
INSERT INTO public.stations (nom, code, entreprise_id, ville, region, adresse, type, statut, capacite_essence, capacite_gasoil, stock_essence, stock_gasoil, nombre_pompes, latitude, longitude) VALUES
('SHELL Kaloum Palace', 'SHL-KAL-001', '1c76aac1-f5be-4073-9007-676360037cdc', 'Kaloum', 'Conakry', 'Boulbinet Centre', 'Station-Service', 'ouverte', 70000, 90000, 55000, 62000, 8, 9.509, -13.712),
('SHELL Matoto Marché', 'SHL-MAT-002', '1c76aac1-f5be-4073-9007-676360037cdc', 'Matoto', 'Conakry', 'Grand Marché Matoto', 'Station-Service', 'ouverte', 55000, 80000, 42000, 51000, 6, 9.567, -13.590),
('SHELL Coyah 1', 'SHL-COY-003', '1c76aac1-f5be-4073-9007-676360037cdc', 'Coyah', 'Kindia', 'Route Nationale 1', 'Station-Service', 'ouverte', 45000, 65000, 15000, 28000, 4, 9.700, -13.380),
('SHELL Dubréka Ville', 'SHL-DUB-004', '1c76aac1-f5be-4073-9007-676360037cdc', 'Dubréka', 'Kindia', 'Entrée Ville', 'Station-Service', 'ouverte', 50000, 75000, 31000, 44000, 6, 9.791, -13.523),
('SHELL Boké Port', 'SHL-BOK-005', '1c76aac1-f5be-4073-9007-676360037cdc', 'Boké', 'Boké', 'Quartier Port', 'Station-Service', 'ouverte', 65000, 95000, 52000, 78000, 6, 10.940, -14.296),
('SHELL Kamsar Cité', 'SHL-KAM-006', '1c76aac1-f5be-4073-9007-676360037cdc', 'Kamsar', 'Boké', 'Cité de la CBG', 'Station-Service', 'ouverte', 60000, 85000, 38000, 55000, 4, 10.650, -14.600),
('SHELL Kindia Manquepas', 'SHL-KIN-007', '1c76aac1-f5be-4073-9007-676360037cdc', 'Kindia', 'Kindia', 'Quartier Manquepas', 'Station-Service', 'ouverte', 40000, 60000, 18000, 22000, 4, 10.056, -12.865);

-- Insertion pour KP (ID: e0772e8d-a78d-45b2-b92a-c2c59fa27209)
INSERT INTO public.stations (nom, code, entreprise_id, ville, region, adresse, type, statut, capacite_essence, capacite_gasoil, stock_essence, stock_gasoil, nombre_pompes, latitude, longitude) VALUES
('KP Sangarédi 1', 'KAP-SAN-001', 'e0772e8d-a78d-45b2-b92a-c2c59fa27209', 'Sangarédi', 'Boké', 'Zone Minière', 'Station-Service', 'ouverte', 100000, 150000, 75000, 112000, 8, 11.100, -13.900),
('KP Kamsar Town', 'KAP-KAM-002', 'e0772e8d-a78d-45b2-b92a-c2c59fa27209', 'Kamsar', 'Boké', 'Centre Commercial', 'Station-Service', 'ouverte', 60000, 80000, 45000, 52000, 6, 10.650, -14.650),
('KP Conakry Port', 'KAP-CON-003', 'e0772e8d-a78d-45b2-b92a-c2c59fa27209', 'Kaloum', 'Conakry', 'Avenue Maritime', 'Station-Service', 'ouverte', 120000, 200000, 110000, 185000, 10, 9.510, -13.705);

-- Insertion pour STAR OIL (ID: 6eaa5b55-18c5-410d-8503-92df36528e0f)
INSERT INTO public.stations (nom, code, entreprise_id, ville, region, adresse, type, statut, capacite_essence, capacite_gasoil, stock_essence, stock_gasoil, nombre_pompes, latitude, longitude) VALUES
('STAR OIL N''Zérékoré', 'STA-NZE-001', '6eaa5b55-18c5-410d-8503-92df36528e0f', 'N''Zérékoré', 'N''Zérékoré', 'Boulevard Central', 'Station-Service', 'ouverte', 50000, 70000, 32000, 45000, 6, 7.756, -8.818),
('STAR OIL Kissidougou', 'STA-KIS-002', '6eaa5b55-18c5-410d-8503-92df36528e0f', 'Kissidougou', 'Faranah', 'Route de Guéckédou', 'Station-Service', 'ouverte', 40000, 55000, 15000, 22000, 4, 9.183, -9.283),
('STAR OIL Guéckédou', 'STA-GUE-003', '6eaa5b55-18c5-410d-8503-92df36528e0f', 'Guéckédou', 'N''Zérékoré', 'Place du Marché', 'Station-Service', 'ouverte', 35000, 50000, 8000, 14000, 4, 8.567, -10.133),
('STAR OIL Macenta', 'STA-MAC-004', '6eaa5b55-18c5-410d-8503-92df36528e0f', 'Macenta', 'N''Zérékoré', 'Route de Sérédou', 'Station-Service', 'ouverte', 30000, 45000, 12000, 18000, 4, 8.540, -9.470);

-- Insertion pour TMI (ID: 2b66d8a8-9340-485c-9df4-dd6a34d95066)
INSERT INTO public.stations (nom, code, entreprise_id, ville, region, adresse, type, statut, capacite_essence, capacite_gasoil, stock_essence, stock_gasoil, nombre_pompes, latitude, longitude) VALUES
('TMI Conakry Gessia', 'TMI-CON-001', '2b66d8a8-9340-485c-9df4-dd6a34d95066', 'Matoto', 'Conakry', 'Quartier Gessia', 'Station-Service', 'ouverte', 45000, 60000, 25000, 32000, 4, 9.580, -13.560),
('TMI Kindia Expo', 'TMI-KIN-002', '2b66d8a8-9340-485c-9df4-dd6a34d95066', 'Kindia', 'Kindia', 'Zone Exposition', 'Station-Service', 'ouverte', 40000, 50000, 15000, 18000, 4, 10.050, -12.850);

COMMIT;
