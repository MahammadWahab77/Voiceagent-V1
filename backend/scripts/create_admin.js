import { supabaseAdmin } from '../src/config/supabase.js';

const email = 'Mahammad_wahab@admin.com';
const password = 'NxtWave@540540';
const role = 'admin';

async function createAdmin() {
    console.log(`Creating admin user: ${email}`);

    try {
        // 1. Create User in Supabase Auth (Auto-confirm email)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { role: role }
        });

        if (authError) {
            console.error('Error creating auth user:', authError.message);
            // If user already exists, we might want to just get their ID, but for now let's stop.
            // Or we can try to proceed if the error is "User already registered"
            if (!authError.message.includes('already registered')) {
                process.exit(1);
            }
            console.log('User might already exist, attempting to find user...');
            const { data: listUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = listUsers.users.find(u => u.email === email);
            if (existingUser) {
                authData.user = existingUser;
                console.log('Found existing user ID:', authData.user.id);
            } else {
                console.error('Could not find existing user.');
                process.exit(1);
            }
        } else {
            console.log('Auth user created successfully with ID:', authData.user.id);
        }

        const userId = authData.user.id;

        // 2. Insert into admin_users table
        const { data: tableData, error: tableError } = await supabaseAdmin
            .from('admin_users')
            .upsert({
                id: userId,
                email: email,
                role: role,
                created_at: new Date().toISOString()
            })
            .select();

        if (tableError) {
            console.error('Error inserting into admin_users:', tableError.message);
            process.exit(1);
        }

        console.log('Admin user successfully created/updated in admin_users table:', tableData);
        process.exit(0);

    } catch (err) {
        console.error('Unexpected error:', err);
        process.exit(1);
    }
}

createAdmin();
