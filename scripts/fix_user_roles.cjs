const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bjcnvbrcyezswdrefzgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY252YnJjeWV6c3dkcmVmemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDE2NTMsImV4cCI6MjA4NjA3NzY1M30.uQc8-Oz3R-m5seQC5GTs0dYawmeWpuewWHFXqAZ9eJM';

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function fixRoles() {
    const emails = requestedRoles.map(r => r.email);
    
    // 1. Get User IDs from profiles
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('user_id, email')
        .in('email', emails);

    if (pError) {
        console.error('Error fetching profiles:', pError);
        return;
    }

    console.log(`Found ${profiles.length} profiles to update.`);

    for (const profile of profiles) {
        const target = requestedRoles.find(r => r.email.toLowerCase() === profile.email.toLowerCase());
        if (target) {
            console.log(`Setting role ${target.role} for ${target.email} (${profile.user_id})...`);
            
            // 2. Upsert role in user_roles
            const { error: rError } = await supabase
                .from('user_roles')
                .upsert({ 
                    user_id: profile.user_id, 
                    role: target.role 
                }, { onConflict: 'user_id' });

            if (rError) {
                console.error(`Error updating role for ${target.email}:`, rError.message);
            } else {
                console.log(`Success: ${target.email} is now ${target.role}`);
            }
        }
    }
}

fixRoles();
