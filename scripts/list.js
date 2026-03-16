import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://bjcnvbrcyezswdrefzgh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY252YnJjeWV6c3dkcmVmemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDE2NTMsImV4cCI6MjA4NjA3NzY1M30.uQc8-Oz3R-m5seQC5GTs0dYawmeWpuewWHFXqAZ9eJM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function listEntreprises() {
  const { data, error } = await supabase.from('entreprises').select('id, nom, sigle')
  if (error) {
    console.error('Error fetching enterprises:', error)
    return
  }
  fs.writeFileSync('scripts/ents.json', JSON.stringify(data, null, 2))
  console.log('Saved to scripts/ents.json')
}

listEntreprises()
