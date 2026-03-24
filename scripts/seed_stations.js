import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bjcnvbrcyezswdrefzgh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY252YnJjeWV6c3dkcmVmemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDE2NTMsImV4cCI6MjA4NjA3NzY1M30.uQc8-Oz3R-m5seQC5GTs0dYawmeWpuewWHFXqAZ9eJM'

const supabase = createClient(supabaseUrl, supabaseKey)

const entreprises = [
  { id: "e8e5f5f3-05ba-4f82-b8e7-0c043589bf25", sigle: "TOTAL" },
  { id: "1c76aac1-f5be-4073-9007-676360037cdc", sigle: "SHELL" },
  { id: "e0772e8d-a78d-45b2-b92a-c2c59fa27209", sigle: "KP" },
  { id: "2b66d8a8-9340-485c-9df4-dd6a34d95066", sigle: "TMI" },
  { id: "6eaa5b55-18c5-410d-8503-92df36528e0f", sigle: "STAR" }
]

const guineanData = [
  { nom: "Station Belle Vue", ville: "Dixinn", region: "Conakry", adresse: "Route du Niger" },
  { nom: "Station Kipé Centre", ville: "Ratoma", region: "Conakry", adresse: "Carrefour Kipé" },
  { nom: "Station Coyah 1", ville: "Coyah", region: "Kindia", adresse: "Route Nationale 1" },
  { nom: "Station Boké Port", ville: "Boké", region: "Boké", adresse: "Quartier Port" },
  { nom: "Station Labé Yimbaya", ville: "Labé", region: "Labé", adresse: "Avenue Alpha Yaya" },
  { nom: "Station Kankan Kouroussa", ville: "Kankan", region: "Kankan", adresse: "Route de Kissidougou" },
  { nom: "Station Mamou Centre", ville: "Mamou", region: "Mamou", adresse: "Près de la Gare" },
  { nom: "Station Siguiri Mine", ville: "Siguiri", region: "Kankan", adresse: "Quartier Siguiri-Koura" },
  { nom: "Station N'Zérékoré Horizon", ville: "N'Zérékoré", region: "N'Zérékoré", adresse: "Boulevard Central" },
  { nom: "Station Dubréka Ville", ville: "Dubréka", region: "Kindia", adresse: "Entrée Ville" },
  { nom: "Station Kaloum Palace", ville: "Kaloum", region: "Conakry", adresse: "Boulbinet" },
  { nom: "Station Matoto Marché", ville: "Matoto", region: "Conakry", adresse: "Grand Marché" },
  { nom: "Station Sangarédi 1", ville: "Sangarédi", region: "Boké", adresse: "Zone Industrielle" },
  { nom: "Station Kamsar Cité", ville: "Kamsar", region: "Boké", adresse: "Cité CBG" },
  { nom: "Station Faranah Fleuve", ville: "Faranah", region: "Faranah", adresse: "Berges du Niger" },
  { nom: "Station Kissidougou Sud", ville: "Kissidougou", region: "Faranah", adresse: "Route de Guéckédou" },
  { nom: "Station Guéckédou Commerce", ville: "Guéckédou", region: "N'Zérékoré", adresse: "Place du Marché" },
  { nom: "Station Macenta Forêt", ville: "Macenta", region: "N'Zérékoré", adresse: "Route de Sérédou" },
  { nom: "Station Kindia Manquepas", ville: "Kindia", region: "Kindia", adresse: "Quartier Manquepas" },
  { nom: "Station Dalaba Frais", ville: "Dalaba", region: "Mamou", adresse: "Plateau Dalaba" },
  { nom: "Station Pita Fouta", ville: "Pita", region: "Mamou", adresse: "Centre-Ville" },
  { nom: "Station Mali Loura", ville: "Mali", region: "Labé", adresse: "Route de Kedougou" },
  { nom: "Station Gaoual Bauxite", ville: "Gaoual", region: "Boké", adresse: "Carrefour Gaoual" },
  { nom: "Station Forécariah Mer", ville: "Forécariah", region: "Kindia", adresse: "Route de Pamelap" },
  { nom: "Station Boffa Rio", ville: "Boffa", region: "Boké", adresse: "Près du Pont" }
]

async function seedStations() {
  console.log("Seeding stations...")
  let dataIndex = 0
  
  for (const ent of entreprises) {
    const stationsToInsert = []
    
    for (let i = 0; i < 5; i++) {
      const location = guineanData[dataIndex % guineanData.length]
      dataIndex++
      
      const code = `${ent.sigle}-${location.ville.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`
      
      stationsToInsert.push({
        nom: `${ent.sigle} ${location.nom}`,
        code: code,
        entreprise_id: ent.id,
        ville: location.ville,
        region: location.region,
        adresse: location.adresse,
        type: Math.random() > 0.3 ? "Station-Service" : "Dépôt Privé",
        statut: "ouverte",
        capacite_essence: 50000,
        capacite_gasoil: 80000,
        capacite_gpl: 10000,
        capacite_lubrifiants: 5000,
        stock_essence: Math.floor(Math.random() * 45000) + 2000,
        stock_gasoil: Math.floor(Math.random() * 70000) + 5000,
        stock_gpl: Math.floor(Math.random() * 8000),
        stock_lubrifiants: Math.floor(Math.random() * 4000),
        nombre_pompes: Math.floor(Math.random() * 4) + 2,
        latitude: 9.537 + (Math.random() - 0.5) * 2,
        longitude: -13.677 + (Math.random() - 0.5) * 2
      })
    }
    
    const { error } = await supabase.from('stations').insert(stationsToInsert)
    if (error) {
      console.error(`Error inserting stations for ${ent.sigle}:`, error)
    } else {
      console.log(`Successfully added 5 stations for ${ent.sigle}`)
    }
  }
}

seedStations()
