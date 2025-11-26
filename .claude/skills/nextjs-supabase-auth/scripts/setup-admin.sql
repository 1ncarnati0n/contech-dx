-- =========================================
-- Promote First User to Admin Role
-- =========================================
-- Execute this SQL in Supabase SQL Editor after creating your first account
-- Replace 'your-email@example.com' with your actual email address

-- Step 1: Verify your user exists
SELECT id, email, role, created_at
FROM profiles
WHERE email = 'your-email@example.com';

-- Step 2: Promote to admin (update the email first!)
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';

-- Step 3: Verify the update worked
SELECT id, email, role, created_at
FROM profiles
WHERE email = 'your-email@example.com';

-- Expected result: role should now be 'admin'
