const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bjcnvbrcyezswdrefzgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY252YnJjeWV6c3dkcmVmemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDE2NTMsImV4cCI6MjA4NjA3NzY1M30.uQc8-Oz3R-m5seQC5GTs0dYawmeWpuewWHFXqAZ9eJM';

const requestedRoles = [
    { email: 'ib26@gmail.com', role: 'directeur_adjoint_aval' },
    { email: 'Ibtdiallo123@gmail.com', role: 'directeur_importation' },
    { email: 'massa@gmail.com', role: 'analyste' },
    { email: 'ft234@gmail.com', role: 'agent_logistique' },
    { email: 'layeoumarconde2005@nexus.com', role: 'service_it' },
    { email: 'lconde2025@gmail.com', role: 'directeur_juridique' },
    { email: 'hadjiratoudiallo393@nexus.com', role: 'inspecteur' },
    { email: 'halidiallo2005@gmail.com', role: 'analyste' },
    { email: 'halima234@gmail.com', role: 'personnel_admin' },
    { email: 'hdiallo2025@gmail.com', role: 'directeur_financier' }
];

async function fixAll() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const adminEmail = 'temp_admin_594@test.com';
    const adminPassword = 'TempPassword123!';
    
    console.log(`Signing in as ${adminEmail}...`);

    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword
    });

    if (signInError) {
        console.error('Sign in failed:', signInError.message);
        return;
    }

    const token = authData.session.access_token;
    console.log('Authenticated successfully. Token acquired.');

    // 2. Create a NEW client with the user's token
    const adminClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // 3. Fix all roles
    const emails = requestedRoles.map(r => r.email);
    const { data: targets, error: tError } = await adminClient.from('profiles').select('user_id, email').in('email', emails);

    if (tError) {
        console.error('Error fetching target profiles:', tError.message);
        return;
    }

    console.log(`Found ${targets.length} targets to fix.`);

    for (const target of targets) {
        const roleInfo = requestedRoles.find(r => r.email.toLowerCase() === target.email.toLowerCase());
        console.log(`Updating ${target.email} to ${roleInfo.role}...`);
        
        const { error: updError } = await adminClient.from('user_roles').upsert({
            user_id: target.user_id,
            role: roleInfo.role
        }, { onConflict: 'user_id' });

        if (updError) console.error(`Error for ${target.email}: ${updError.message}`);
        else console.log(`Fixed ${target.email}`);
    }
}

fixAll();
