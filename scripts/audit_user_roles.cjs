const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bjcnvbrcyezswdrefzgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY252YnJjeWV6c3dkcmVmemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDE2NTMsImV4cCI6MjA4NjA3NzY1M30.uQc8-Oz3R-m5seQC5GTs0dYawmeWpuewWHFXqAZ9eJM';

async function checkSpecificRoles() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Auth with the temp admin we created
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'temp_admin_549@test.com',
        password: 'TempPassword123!'
    });
    
    if (authError) {
        // Try the other one if this fails
        const { data: authData2, error: authError2 } = await supabase.auth.signInWithPassword({
            email: 'temp_admin_594@test.com',
            password: 'TempPassword123!'
        });
        if (authError2) {
            console.log('AUTH_ERROR:' + authError2.message);
            return;
        }
    }

    const { data: profiles, error: pError } = await supabase.from('profiles').select('user_id, email').neq('email', null);
    const { data: roles, error: rError } = await supabase.from('user_roles').select('user_id, role');

    if (pError || rError) {
        console.log('FETCH_ERROR:' + (pError?.message || rError?.message));
        return;
    }

    console.log('--- USER_ROLES_AUDIT ---');
    profiles.forEach(p => {
        const userRoles = roles.filter(r => r.user_id === p.user_id).map(r => r.role);
        if (userRoles.length > 0) {
            console.log(`${p.email} => [${userRoles.join(', ')}]`);
        }
    });
    console.log('--- END_AUDIT ---');
}

checkSpecificRoles();
