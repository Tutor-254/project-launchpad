import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function checkAdminUsers() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in environment variables')
    process.exit(1)
  }

  const client = createClient(supabaseUrl, supabaseServiceKey)

  try {
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
      .eq('role', 'admin')

    if (error) {
      console.error('Error querying admin users:', error)
      process.exit(1)
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log('❌ No admin users found in the database')
      process.exit(0)
    }

    console.log(`\n✅ Found ${adminUsers.length} admin user(s):\n`)

    adminUsers.forEach((entry: any, index: number) => {
      const profile = entry.profiles
      console.log(`${index + 1}. ${profile?.full_name || 'Unknown Name'}`)
      console.log(`   Email: ${profile?.email}`)
      console.log(`   User ID: ${entry.user_id}`)
      console.log(`   Role: ${entry.role}`)
      console.log(`   Created: ${profile?.created_at}`)
      console.log('')
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    process.exit(1)
  }
}

checkAdminUsers()
