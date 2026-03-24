import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bjcnvbrcyezswdrefzgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY252YnJjeWV6c3dkcmVmemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDE2NTMsImV4cCI6MjA4NjA3NzY1M30.uQc8-Oz3R-m5seQC5GTs0dYawmeWpuewWHFXqAZ9eJM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAll() {
    const { data: ents, error: err1 } = await supabase.from('entreprises').select('id, nom, sigle');
    if (err1) console.error(err1);
    else console.log('Entreprises:', JSON.stringify(ents, null, 2));

    const { data: stats, error: err2 } = await supabase.from('stations').select('id, nom, entreprise_id');
    if (err2) console.error(err2);
    else {
        const counts = {};
        stats.forEach(s => {
            counts[s.entreprise_id] = (counts[s.entreprise_id] || 0) + 1;
        });
        console.log('Station counts per entreprise:', counts);
    }
}

listAll();
