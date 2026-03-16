import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function listStations() {
  console.log('Fetching stations from database...')
  const { data, error } = await supabase
    .from('stations')
    .select('id, nom, code, ville, region, adresse')
  
  if (error) {
    console.error('Error fetching stations:', error.message)
    return
  }
  
  if (data && data.length > 0) {
    console.log(`\n✅ ${data.length} stations found in the database:`)
    console.table(data)
  } else {
    console.log('\n❌ No stations found in the database. The table is empty.')
  }
}

listStations()
