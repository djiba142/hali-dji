-- SIHG Data Seeding: 5 Stations per Enterprise
-- Geographic distribution across Guinea (Conakry, Kindia, Boké, Labé, Kankan, Mamou, N'Zérékoré, Faranah)

-- 1. TOTAL Stations
INSERT INTO public.stations (nom, code, entreprise_id, ville, region, adresse, type, statut, capacite_essence, capacite_gasoil, stock_essence, stock_gasoil, nombre_pompes) VALUES
('TOTAL Belle Vue', 'TO-BEL-452', 'e8e5f5f3-05ba-4f82-b8e7-0c043589bf25', 'Dixinn', 'Conakry', 'Route du Niger', 'urbaine', 'ouverte', 50000, 80000, 12450, 45800, 6),
('TOTAL Kindia Manquepas', 'TO-KIN-812', 'e8e5f5f3-05ba-4f82-b8e7-0c043589bf25', 'Kindia', 'Kindia', 'Quartier Manquepas', 'urbaine', 'ouverte', 40000, 60000, 32100, 15600, 4),
('TOTAL Labé Yimbaya', 'TO-LAB-102', 'e8e5f5f3-05ba-4f82-b8e7-0c043589bf25', 'Labé', 'Labé', 'Avenue Alpha Yaya', 'urbaine', 'ouverte', 45000, 70000, 8900, 52000, 4),
('TOTAL Kankan Centre', 'TO-KAN-334', 'e8e5f5f3-05ba-4f82-b8e7-0c043589bf25', 'Kankan', 'Kankan', 'Route Nationale 1', 'urbaine', 'ouverte', 60000, 90000, 45000, 32000, 6),
('TOTAL N''Zérékoré Horizon', 'TO-NZE-990', 'e8e5f5f3-05ba-4f82-b8e7-0c043589bf25', 'N''Zérékoré', 'N''Zérékoré', 'Boulevard Central', 'urbaine', 'ouverte', 40000, 60000, 21000, 12000, 4);

-- 2. SHELL Stations
INSERT INTO public.stations (nom, code, entreprise_id, ville, region, adresse, type, statut, capacite_essence, capacite_gasoil, stock_essence, stock_gasoil, nombre_pompes) VALUES
('SHELL Kipé Centre', 'SH-KIP-221', '1c76aac1-f5be-4073-9007-676360037cdc', 'Ratoma', 'Conakry', 'Carrefour Kipé', 'urbaine', 'ouverte', 50000, 80000, 34000, 61000, 6),
('SHELL Coyah 1', 'SH-COY-776', '1c76aac1-f5be-4073-9007-676360037cdc', 'Coyah', 'Kindia', 'Route Nationale 1', 'routiere', 'ouverte', 60000, 100000, 15000, 82000, 4),
('SHELL Boké Port', 'SH-BOK-112', '1c76aac1-f5be-4073-9007-676360037cdc', 'Boké', 'Boké', 'Quartier Port', 'urbaine', 'ouverte', 40000, 60000, 28000, 14000, 4),
('SHELL Mamou Gare', 'SH-MAM-543', '1c76aac1-f5be-4073-9007-676360037cdc', 'Mamou', 'Mamou', 'Près de la Gare', 'routiere', 'ouverte', 45000, 75000, 12000, 63000, 4),
('SHELL Siguiri Mine', 'SH-SIG-887', '1c76aac1-f5be-4073-9007-676360037cdc', 'Siguiri', 'Kankan', 'Cité Minière', 'industrielle', 'ouverte', 100000, 200000, 45000, 120000, 8);

-- 3. KP Stations
INSERT INTO public.stations (nom, code, entreprise_id, ville, region, adresse, type, statut, capacite_essence, capacite_gasoil, stock_essence, stock_gasoil, nombre_pompes) VALUES
('KP Dubréka Ville', 'KP-DUB-303', 'e0772e8d-a78d-45b2-b92a-c2c59fa27209', 'Dubréka', 'Kindia', 'Entrée Ville', 'urbaine', 'ouverte', 40000, 60000, 31000, 42000, 4),
('KP Kaloum Palace', 'KP-KAL-001', 'e0772e8d-a78d-45b2-b92a-c2c59fa27209', 'Kaloum', 'Conakry', 'Boulbinet', 'urbaine', 'ouverte', 50000, 70000, 15000, 56000, 4),
('KP Matoto Marché', 'KP-MAT-554', 'e0772e8d-a78d-45b2-b92a-c2c59fa27209', 'Matoto', 'Conakry', 'Grand Marché', 'urbaine', 'ouverte', 45000, 80000, 8000, 24000, 6),
('KP Sangarédi 1', 'KP-SAN-221', 'e0772e8d-a78d-45b2-b92a-c2c59fa27209', 'Sangarédi', 'Boké', 'Zone Industrielle', 'industrielle', 'ouverte', 80000, 150000, 42000, 98000, 6),
('KP Faranah Fleuve', 'KP-FAR-902', 'e0772e8d-a78d-45b2-b92a-c2c59fa27209', 'Faranah', 'Faranah', 'Berges du Niger', 'urbaine', 'ouverte', 35000, 50000, 19000, 15000, 2);

-- 4. TMI Stations
INSERT INTO public.stations (nom, code, entreprise_id, ville, region, adresse, type, statut, capacite_essence, capacite_gasoil, stock_essence, stock_gasoil, nombre_pompes) VALUES
('TMI Kamsar Cité', 'TM-KAM-112', '2b66d8a8-9340-485c-9df4-dd6a34d95066', 'Kamsar', 'Boké', 'Cité CBG', 'urbaine', 'ouverte', 40000, 60000, 35000, 21000, 4),
('TMI Kissidougou Sud', 'TM-KIS-778', '2b66d8a8-9340-485c-9df4-dd6a34d95066', 'Kissidougou', 'Faranah', 'Route de Guéckédou', 'routiere', 'ouverte', 45000, 70000, 12000, 45000, 4),
('TMI Guéckédou Commerce', 'TM-GUE-443', '2b66d8a8-9340-485c-9df4-dd6a34d95066', 'Guéckédou', 'N''Zérékoré', 'Place du Marché', 'urbaine', 'ouverte', 30000, 50000, 18000, 9000, 2),
('TMI Macenta Forêt', 'TM-MAC-665', '2b66d8a8-9340-485c-9df4-dd6a34d95066', 'Macenta', 'N''Zérékoré', 'Route de Sérédou', 'urbaine', 'ouverte', 35000, 55000, 24000, 31000, 4),
('TMI Dalaba Frais', 'TM-DAL-110', '2b66d8a8-9340-485c-9df4-dd6a34d95066', 'Dalaba', 'Mamou', 'Plateau Dalaba', 'urbaine', 'ouverte', 30000, 45000, 7000, 15000, 2);

-- 5. STAR Stations
INSERT INTO public.stations (nom, code, entreprise_id, ville, region, adresse, type, statut, capacite_essence, capacite_gasoil, stock_essence, stock_gasoil, nombre_pompes) VALUES
('STAR Pita Fouta', 'ST-PIT-441', '6eaa5b55-18c5-410d-8503-92df36528e0f', 'Pita', 'Mamou', 'Centre-Ville', 'urbaine', 'ouverte', 30000, 50000, 14000, 22000, 2),
('STAR Mali Loura', 'ST-MAL-772', '6eaa5b55-18c5-410d-8503-92df36528e0f', 'Mali', 'Labé', 'Route de Kedougou', 'urbaine', 'ouverte', 25000, 40000, 9000, 18000, 2),
('STAR Gaoual Bauxite', 'ST-GAO-332', '6eaa5b55-18c5-410d-8503-92df36528e0f', 'Gaoual', 'Boké', 'Carrefour Gaoual', 'urbaine', 'ouverte', 30000, 50000, 12000, 8000, 2),
('STAR Forécariah Mer', 'ST-FOR-119', '6eaa5b55-18c5-410d-8503-92df36528e0f', 'Forécariah', 'Kindia', 'Route de Pamelap', 'urbaine', 'ouverte', 35000, 55000, 22000, 34000, 4),
('STAR Boffa Rio', 'ST-BOF-661', '6eaa5b55-18c5-410d-8503-92df36528e0f', 'Boffa', 'Boké', 'Près du Pont', 'urbaine', 'ouverte', 40000, 60000, 15000, 41000, 4);
