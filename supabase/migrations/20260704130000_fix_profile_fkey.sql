-- Backfill profiles for any auth users that don't have one yet.
-- This covers users who signed up before the trigger existed or where it failed.
INSERT INTO public.profiles (id, display_name, avatar_url)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ),
  au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- Backfill default student role for any users that are missing it.
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'student'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = au.id AND ur.role = 'student'
)
ON CONFLICT DO NOTHING;

-- Drop the fragile profiles FK — instructor_applications already references
-- auth.users(id) directly. Admin queries can join via user_id without this
-- extra constraint that blocks inserts when a profile row is missing.
ALTER TABLE public.instructor_applications
  DROP CONSTRAINT IF EXISTS instructor_applications_user_profile_fkey;
