-- ============================================================================
-- Query to Find All Admin Users
-- ============================================================================
-- Run this query in Supabase SQL Editor to see who has admin role
-- URL: https://app.supabase.com/project/nhvvgoilwseiagzbbhmx/sql/new

SELECT
  ur.user_id,
  ur.role,
  p.email,
  p.full_name,
  p.avatar_url,
  p.created_at as profile_created_at,
  au.created_at as auth_created_at
FROM
  user_roles ur
LEFT JOIN
  profiles p ON p.id = ur.user_id
LEFT JOIN
  auth.users au ON au.id = ur.user_id
WHERE
  ur.role = 'admin'
ORDER BY
  p.created_at DESC;

-- ============================================================================
-- Alternative: Show all user roles (admin, instructor, learner, etc.)
-- ============================================================================

SELECT
  ur.user_id,
  ur.role,
  p.email,
  p.full_name,
  p.created_at,
  COUNT(*) OVER (PARTITION BY ur.role) as count_in_role
FROM
  user_roles ur
LEFT JOIN
  profiles p ON p.id = ur.user_id
ORDER BY
  ur.role ASC,
  p.created_at DESC;

-- ============================================================================
-- Alternative: Count admin users
-- ============================================================================

SELECT
  COUNT(*) as total_admin_users,
  COUNT(CASE WHEN p.email IS NOT NULL THEN 1 END) as admins_with_profiles
FROM
  user_roles ur
LEFT JOIN
  profiles p ON p.id = ur.user_id
WHERE
  ur.role = 'admin';

-- ============================================================================
-- Alternative: Find users who can access /admin/ai-settings
-- ============================================================================
-- (Requires both admin OR platform_admin role)

SELECT
  ur.user_id,
  ur.role,
  p.email,
  p.full_name,
  CASE
    WHEN ur.role IN ('admin', 'platform_admin') THEN '✓ Can access /admin/ai-settings'
    ELSE '✗ No access'
  END as ai_settings_access,
  p.created_at
FROM
  user_roles ur
LEFT JOIN
  profiles p ON p.id = ur.user_id
ORDER BY
  CASE
    WHEN ur.role IN ('admin', 'platform_admin') THEN 1
    ELSE 2
  END,
  p.created_at DESC;
