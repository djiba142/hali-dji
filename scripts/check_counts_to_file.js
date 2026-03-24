import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://bjcnvbrcyezswdrefzgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY252YnJjeWV6c3dkcmVmemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDE2NTMsImV4cCI6MjA4NjA3NzY1M30.uQc8-Oz3R-m5seQC5GTs0dYawmeWpuewWHFXqAZ9eJM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: ents } = await supabase.from('entreprises').select('*');
    const { data: stations } = await supabase.from('stations').select('entreprise_id');
    
    let report = '--- ENTREPRISES ---\n';
    ents.forEach(e => {
        const count = stations.filter(s => s.entreprise_id === e.id).length;
        report += `${e.sigle || e.nom} (${e.id}): ${count} stations\n`;
    });
    
    fs.writeFileSync('scripts/counts_report.txt', report);
    console.log('Report written to scripts/counts_report.txt');
}

check();
