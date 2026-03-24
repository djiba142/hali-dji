const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bjcnvbrcyezswdrefzgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY252YnJjeWV6c3dkcmVmemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDE2NTMsImV4cCI6MjA4NjA3NzY1M30.uQc8-Oz3R-m5seQC5GTs0dYawmeWpuewWHFXqAZ9eJM';

async function checkCount() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'temp_admin_594@test.com',
        password: 'TempPassword123!'
    });
    
    const client = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
    });
    
    const { count } = await client.from('user_roles').select('*', { count: 'exact', head: true });
    console.log('Total Roles in DB:', count);
    
    const { data: roles } = await client.from('user_roles').select('user_id, role');
    console.log('Roles:', JSON.stringify(roles, null, 2));
}

checkCount();
