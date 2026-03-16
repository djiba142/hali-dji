import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bjcnvbrcyezswdrefzgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY252YnJjeWV6c3dkcmVmemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDE2NTMsImV4cCI6MjA4NjA3NzY1M30.uQc8-Oz3R-m5seQC5GTs0dYawmeWpuewWHFXqAZ9eJM';

const supabase = createClient(supabaseUrl, supabaseKey);

const ents = [
    { id: "e8e5f5f3-05ba-4f82-b8e7-0c043589bf25", sigle: "TOTAL", count: 6 },
    { id: "1c76aac1-f5be-4073-9007-676360037cdc", sigle: "SHELL", count: 7 },
    { id: "e0772e8d-a78d-45b2-b92a-c2c59fa27209", sigle: "KP", count: 8 },
    { id: "2b66d8a8-9340-485c-9df4-dd6a34d95066", sigle: "TMI", count: 5 },
    { id: "6eaa5b55-18c5-410d-8503-92df36528e0f", sigle: "STAR", count: 10 }
];

const guineanData = [
  { nom: "Station Belle Vue", ville: "Dixinn", region: "Conakry", adresse: "Route du Niger", lat: 9.537, lng: -13.677 },
  { nom: "Station Kipé Centre", ville: "Ratoma", region: "Conakry", adresse: "Carrefour Kipé", lat: 9.610, lng: -13.620 },
  { nom: "Station Coyah 1", ville: "Coyah", region: "Kindia", adresse: "Route Nationale 1", lat: 9.700, lng: -13.380 },
  { nom: "Station Boké Port", ville: "Boké", region: "Boké", adresse: "Quartier Port", lat: 10.940, lng: -14.296 },
  { nom: "Station Labé Yimbaya", ville: "Labé", region: "Labé", adresse: "Avenue Alpha Yaya", lat: 11.318, lng: -12.283 },
  { nom: "Station Kankan Kouroussa", ville: "Kankan", region: "Kankan", adresse: "Route de Kissidougou", lat: 10.385, lng: -9.305 },
  { nom: "Station Mamou Centre", ville: "Mamou", region: "Mamou", adresse: "Près de la Gare", lat: 10.374, lng: -12.091 },
  { nom: "Station Siguiri Mine", ville: "Siguiri", region: "Kankan", adresse: "Quartier Siguiri-Koura", lat: 11.417, lng: -9.167 },
  { nom: "Station N'Zérékoré Horizon", ville: "N'Zérékoré", region: "N'Zérékoré", adresse: "Boulevard Central", lat: 7.756, lng: -8.818 },
  { nom: "Station Dubréka Ville", ville: "Dubréka", region: "Kindia", adresse: "Entrée Ville", lat: 9.791, lng: -13.523 }
];

async function seed() {
    console.log('Seeding stations to match user requirements...');
    let dataIndex = 0;
    
    for (const ent of ents) {
        const stationsToInsert = [];
        for (let i = 0; i < ent.count; i++) {
            const loc = guineanData[dataIndex % guineanData.length];
            dataIndex++;
            
            // Add slight random offset to lat/lng so they don't overlap perfectly
            const lat = loc.lat + (Math.random() - 0.5) * 0.05;
            const lng = loc.lng + (Math.random() - 0.5) * 0.05;
            
            stationsToInsert.push({
                nom: `${ent.sigle} ${loc.nom} #${i+1}`,
                code: `${ent.sigle}-${loc.ville.substring(0,3).toUpperCase()}-${100+i}`,
                entreprise_id: ent.id,
                ville: loc.ville,
                region: loc.region,
                adresse: loc.adresse,
                type: "Station-Service",
                statut: "ouverte",
                capacite_essence: 60000,
                capacite_gasoil: 90000,
                stock_essence: Math.floor(Math.random() * 40000) + 5000,
                stock_gasoil: Math.floor(Math.random() * 60000) + 5000,
                nombre_pompes: 4,
                latitude: lat,
                longitude: lng
            });
        }
        
        const { error } = await supabase.from('stations').insert(stationsToInsert);
        if (error) console.error(`Error for ${ent.sigle}:`, error);
        else console.log(`Added ${ent.count} stations for ${ent.sigle}`);
    }
    console.log('Done.');
}

seed();
