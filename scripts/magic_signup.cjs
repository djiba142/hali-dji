const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bjcnvbrcyezswdrefzgh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY252YnJjeWV6c3dkcmVmemdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDE2NTMsImV4cCI6MjA4NjA3NzY1M30.uQc8-Oz3R-m5seQC5GTs0dYawmeWpuewWHFXqAZ9eJM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function trySignUp() {
    const email = 'temp_admin_' + Math.floor(Math.random() * 1000) + '@test.com';
    const password = 'TempPassword123!';
    
    console.log(`Trying to sign up ${email} with super_admin role...`);
    
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: 'Temp Bootstrap Admin',
                role: 'super_admin'
            }
        }
    });

    if (error) {
        console.error('Sign up error:', error.message);
    } else {
        console.log('Sign up successful!');
        console.log('User ID:', data.user.id);
        console.log('Checking if role was assigned...');
        
        // Wait a bit for trigger
        setTimeout(async () => {
            const { data: roleData, error: rError } = await supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', data.user.id);
            
            if (rError) console.error('Error checking role:', rError.message);
            else console.log('Role Data:', JSON.stringify(roleData, null, 2));
        }, 2000);
    }
}

trySignUp();
