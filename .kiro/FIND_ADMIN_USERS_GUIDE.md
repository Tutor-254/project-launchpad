# How to Find Admin Users in Your Database

**Quick Answer:** Use the SQL queries below in your Supabase dashboard.

---

## Method 1: Supabase Dashboard (Easiest - 1 minute)

### Step 1: Open Supabase SQL Editor
1. Go to: https://app.supabase.com/project/nhvvgoilwseiagzbbhmx/sql/new
2. You'll see a blank SQL editor

### Step 2: Paste the Query
Copy and paste this query:

```sql
SELECT
  ur.user_id,
  ur.role,
  p.email,
  p.full_name,
  p.created_at
FROM
  user_roles ur
LEFT JOIN
  profiles p ON p.id = ur.user_id
WHERE
  ur.role = 'admin'
ORDER BY
  p.created_at DESC;
```

### Step 3: Run the Query
Click the "Run" button (or press Ctrl+Enter)

### Step 4: View Results
You'll see a table with all admin users showing:
- User ID
- Role (will be 'admin')
- Email
- Full Name
- Account Created Date

---

## Method 2: Alternative Queries

### Show All User Roles

```sql
SELECT
  ur.user_id,
  ur.role,
  p.email,
  p.full_name
FROM
  user_roles ur
LEFT JOIN
  profiles p ON p.id = ur.user_id
ORDER BY
  ur.role ASC;
```

This shows everyone with their roles (admin, instructor, learner, etc.)

---

### Just Count Admin Users

```sql
SELECT COUNT(*) as total_admin_users
FROM user_roles
WHERE role = 'admin';
```

This tells you how many admin users exist.

---

### Check Who Can Access /admin/ai-settings

```sql
SELECT
  ur.user_id,
  ur.role,
  p.email,
  p.full_name,
  CASE
    WHEN ur.role IN ('admin', 'platform_admin') THEN '✓ Can access AI settings'
    ELSE '✗ No access'
  END as ai_settings_access
FROM
  user_roles ur
LEFT JOIN
  profiles p ON p.id = ur.user_id
ORDER BY ur.role;
```

---

## Method 3: From Your Application Code

If you want to query programmatically:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nhvvgoilwseiagzbbhmx.supabase.co',
  'YOUR_SERVICE_ROLE_KEY' // From Supabase settings
)

const { data: admins, error } = await supabase
  .from('user_roles')
  .select(`
    user_id,
    role,
    profiles (
      id,
      email,
      full_name,
      created_at
    )
  `)
  .eq('role', 'admin')

console.log(admins)
```

---

## What You're Looking For

### User Roles Table Schema

```
user_roles table has:
├── user_id (UUID) - Points to auth.users
├── role (TEXT) - admin, instructor, learner, etc.
└── created_at (TIMESTAMP)

profiles table has:
├── id (UUID) - Same as user_id
├── email (TEXT)
├── full_name (TEXT)
├── avatar_url (TEXT)
└── created_at (TIMESTAMP)
```

### Expected Results

When you run the query, you'll see something like:

| user_id | role | email | full_name | created_at |
|---------|------|-------|-----------|-----------|
| abc-123 | admin | john@example.com | John Doe | 2026-01-15 |
| def-456 | admin | jane@example.com | Jane Smith | 2026-01-16 |

---

## If No Results

If the query returns **no rows**, it means:
- No admin users have been created yet
- OR all admin users haven't been assigned the admin role

### To Create an Admin User

```sql
-- First, you need a user in auth.users (created through Supabase Auth)
-- Then assign them the admin role:

INSERT INTO user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'admin');

-- Where USER_ID_HERE is their auth.users ID
```

---

## Common Issues

### "user_roles table not found"
- The table hasn't been created yet
- Run migrations first: `supabase db push`

### "profiles table not found"
- Same issue - run migrations

### "NULL values in results"
- User profile wasn't created
- They might be in auth.users but not in profiles table

---

## File Reference

All queries are saved in: `.kiro/ADMIN_USERS_QUERY.sql`

You can also use that file directly in Supabase SQL editor.

---

## Quick Links

- **Supabase Dashboard:** https://app.supabase.com/project/nhvvgoilwseiagzbbhmx/
- **SQL Editor:** https://app.supabase.com/project/nhvvgoilwseiagzbbhmx/sql/new
- **Your Project ID:** `nhvvgoilwseiagzbbhmx`

---

## Next Steps

1. **Find your admin users** using the query above
2. **Go to `/admin/ai-settings`** with that admin account
3. **Add your Gemini API key**
4. **Start building AI features!**

---

**Status:** Ready to query ✅
