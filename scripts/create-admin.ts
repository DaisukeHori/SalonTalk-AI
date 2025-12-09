import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://njyuuonrjiskzanxbbwf.supabase.co';

// Service Role Key is required - get from Supabase Dashboard > Settings > API
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('\nRun with:');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-key npx tsx scripts/create-admin.ts');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createOperatorAdmin() {
  const email = 'admin@salontalk.jp';
  const password = 'AdminPassword123!';
  const name = 'Admin';

  console.log('Creating operator admin user...');

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error('Failed to create auth user:', authError.message);
    process.exit(1);
  }

  console.log('Auth user created:', authData.user.id);

  // 2. Insert into operator_admins
  const { error: insertError } = await supabase
    .from('operator_admins')
    .insert({
      id: authData.user.id,
      email,
      name,
      role: 'operator_admin',
      is_active: true,
    });

  if (insertError) {
    console.error('Failed to insert operator_admins:', insertError.message);
    // Cleanup: delete auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    process.exit(1);
  }

  console.log('\n✅ Operator admin created successfully!');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Role: operator_admin');
  console.log('\nLogin at: https://salontalk-web.vercel.app/admin/login');
}

createOperatorAdmin();
