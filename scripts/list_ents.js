import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bjcnvbrcyezswdrefzgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY252YnJjeWV6c3dkcmVmemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDE2NTMsImV4cCI6MjA4NjA3NzY1M30.uQc8-Oz3R-m5seQC5GTs0dYawmeWpuewWHFXqAZ9eJM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAll() {
    const { data: ents, error } = await supabase.from('entreprises').select('id, nom, sigle');
    if (error) {
        console.error(error);
        return;
    }
    console.log(JSON.stringify(ents, null, 2));
}

listAll();
