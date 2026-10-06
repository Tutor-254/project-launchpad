import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function checkAdminUsers() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in environment variables');
    console.error('SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Querying admin users from database...\n');

    // Query user_roles table for admin users
    const { data: adminUsers, error } = await client
      .from('user_roles')
      .select(`
        user_id,
        role,
        profiles (
          id,
          email,
          full_name,
          avatar_url,
          created_at
        )
      `)
      .eq('role', 'admin');

    if (error) {
      console.error('Error querying admin users:', error);
      process.exit(1);
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log('❌ No admin users found in the database');
      process.exit(0);
    }

    console.log(`✅ Found ${adminUsers.length} admin user(s):\n`);
    console.log('='.repeat(60));

    adminUsers.forEach((entry, index) => {
      const profile = entry.profiles;
      console.log(`\n${index + 1}. Admin User`);
      console.log('-'.repeat(40));
      console.log(`   Name:     ${profile?.full_name || 'N/A'}`);
      console.log(`   Email:    ${profile?.email || 'N/A'}`);
      console.log(`   User ID:  ${entry.user_id}`);
      console.log(`   Role:     ${entry.role}`);
      console.log(`   Joined:   ${profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}`);
    });

    console.log('\n' + '='.repeat(60));
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

checkAdminUsers();
