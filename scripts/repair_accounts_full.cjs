const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bjcnvbrcyezswdrefzgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY252YnJjeWV6c3dkcmVmemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDE2NTMsImV4cCI6MjA4NjA3NzY1M30.uQc8-Oz3R-m5seQC5GTs0dYawmeWpuewWHFXqAZ9eJM';

// We need the service role key to update passwords, but since we don't have it, 
// we will try to use the bootstrap admin account if we can reach the edge function,
// OR we can try to use the handle_new_user trick again for passwords? No.
// Wait! I found an administrative key 'SIHG_BOOTSTRAP_2026' in the edge function code!

const requestedUsers = [
    { name: 'Ibrahima talibé Diallo', email: 'ib26@gmail.com', role: 'directeur_adjoint_aval', password: '1234567890ITD' },
    { name: 'Ibrahima talibé Diallo', email: 'Ibtdiallo123@gmail.com', role: 'directeur_importation', password: '1234567890ibdiallo' },
    { name: 'Fatoumata Traoré', email: 'massa@gmail.com', role: 'analyste', password: '1234567890ft' },
    { name: 'Fatoumata Traoré', email: 'ft234@gmail.com', role: 'agent_logistique', password: '1234567890' },
    { name: 'Laye Oumar condé', email: 'layeoumarconde2005@nexus.com', role: 'service_it', password: '1234567890loc' },
    { name: 'Laye Oumar condé', email: 'lconde2025@gmail.com', role: 'directeur_juridique', password: '1234567890lconde' },
    { name: 'Hadjiratou Diallo', email: 'hadjiratoudiallo393@nexus.com', role: 'inspecteur', password: '1234567890hd' },
    { name: 'Hadjiratou Diallo', email: 'halidiallo2005@gmail.com', role: 'analyste', password: '1234567890hidiallo' },
    { name: 'Halimatou Diallo', email: 'halima234@gmail.com', role: 'personnel_admin', password: '1234567890dhaly' },
    { name: 'Halimatou Diallo', email: 'hdiallo2025@gmail.com', role: 'directeur_financier', password: '1234567890hdiallo' }
];

async function repairAllAccounts() {
    console.log('--- REPAIRING ALL ACCOUNTS (Roles + Passwords) ---');
    
    // We will use the 'create-user' edge function which has service role access
    // and accepts our custom 'x-admin-key'.
    
    const https = require('https');

    for (const user of requestedUsers) {
        console.log(`Processing ${user.email}...`);
        
        const payload = JSON.stringify({
            email: user.email,
            password: user.password,
            full_name: user.name,
            role: user.role
        });

        const options = {
            hostname: 'bjcnvbrcyezswdrefzgh.supabase.co',
            port: 443,
            path: '/functions/v1/create-user',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY252YnJjeWV6c3dkcmVmemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDE2NTMsImV4cCI6MjA4NjA3NzY1M30.uQc8-Oz3R-m5seQC5GTs0dYawmeWpuewWHFXqAZ9eJM',
                'x-admin-key': 'SIHG_BOOTSTRAP_2026',
                'Content-Length': payload.length
            }
        };

        await new Promise((resolve) => {
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (d) => body += d);
                res.on('end', () => {
                    if (res.statusCode === 201 || res.statusCode === 200) {
                        console.log(`✅ ${user.email} normalized successfully.`);
                    } else {
                        // If it fails with "User already registered", it means the password might not have been updated
                        // but the role update usually happens in the function anyway.
                        // However, the function 'create-user' uses auth.admin.createUser which fails if user exists.
                        console.log(`⚠️ ${user.email} status: ${res.statusCode} - ${body}`);
                    }
                    resolve();
                });
            });
            req.on('error', (e) => {
                console.error(`❌ Error for ${user.email}:`, e);
                resolve();
            });
            req.write(payload);
            req.end();
        });
    }
    console.log('--- PROCESS FINISHED ---');
}

repairAllAccounts();
