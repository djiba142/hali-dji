const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bjcnvbrcyezswdrefzgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY252YnJjeWV6c3dkcmVmemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDE2NTMsImV4cCI6MjA4NjA3NzY1M30.uQc8-Oz3R-m5seQC5GTs0dYawmeWpuewWHFXqAZ9eJM';

const supabase = createClient(supabaseUrl, supabaseKey);

const requestedEmails = [
    'ib26@gmail.com',
    'Ibtdiallo123@gmail.com',
    'massa@gmail.com',
    'ft234@gmail.com',
    'layeoumarconde2005@nexus.com',
    'lconde2025@gmail.com',
    'hadjiratoudiallo393@nexus.com',
    'halidiallo2005@gmail.com',
    'halima234@gmail.com',
    'hdiallo2025@gmail.com'
];

async function checkProfiles() {
    const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('email', requestedEmails);

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log('--- Matching Profiles Found ---');
    console.log(JSON.stringify(data, null, 2));
    
    const foundEmails = data.map(p => p.email);
    const missing = requestedEmails.filter(e => !foundEmails.includes(e));
    
    if (missing.length > 0) {
        console.log('--- Missing Profiles ---');
        console.log(missing);
    }
}

checkProfiles();
