const https = require('https');

const data = JSON.stringify({
    email: 'admin_bootstrap_' + Math.floor(Math.random() * 1000) + '@nexus.com',
    password: 'Bootstrap2026!',
    full_name: 'Bootstrap Admin',
    role: 'super_admin'
});

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY252YnJjeWV6c3dkcmVmemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDE2NTMsImV4cCI6MjA4NjA3NzY1M30.uQc8-Oz3R-m5seQC5GTs0dYawmeWpuewWHFXqAZ9eJM';

const options = {
    hostname: 'bjcnvbrcyezswdrefzgh.supabase.co',
    port: 443,
    path: '/functions/v1/create-user',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        // NO Authorization header here
        'x-admin-key': 'SIHG_BOOTSTRAP_2026',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
