-- =========================================
-- Diagnostic Queries for Supabase Auth Setup
-- =========================================
-- Run these queries in Supabase SQL Editor to verify your configuration

-- 1. Check if profiles table exists and has correct structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. List all users and their roles
SELECT
  id,
  email,
  role,
  display_name,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- 3. Count users by role
SELECT
  role,
  COUNT(*) as count
FROM profiles
GROUP BY role
ORDER BY
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'main_user' THEN 2
    WHEN 'vip_user' THEN 3
    WHEN 'user' THEN 4
  END;

-- 4. Check RLS policies on profiles table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- 5. Check if triggers exist
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('profiles', 'posts', 'comments')
ORDER BY event_object_table, trigger_name;

-- 6. Verify auth.users matches profiles
SELECT
  'auth.users' as source,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT
  'profiles' as source,
  COUNT(*) as count
FROM profiles;

-- Expected: Both counts should match

-- 7. Check for orphaned profiles (profiles without auth.users)
SELECT p.id, p.email, p.created_at
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- Expected: No results (empty)

-- 8. Check for users without profiles
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Expected: No results (empty)

-- 9. Test RLS by checking current user
SELECT
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- If authenticated, should return your UUID and 'authenticated'
-- If not authenticated, both will be NULL

-- 10. Verify posts and comments tables if they exist
SELECT
  'posts' as table_name,
  COUNT(*) as count
FROM posts
UNION ALL
SELECT
  'comments' as table_name,
  COUNT(*) as count
FROM comments;
