# Database Schema Reference

Complete Supabase database schema for Next.js authentication with role-based access control.

## Execution Order

Execute these SQL blocks in the Supabase SQL Editor in this exact order:

1. Base Schema (profiles, posts, comments)
2. Role System Extension
3. Admin Promotion (using setup-admin.sql)

## Base Schema

This creates the foundational tables and RLS policies.

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- PROFILES TABLE
-- ===========================================
-- Stores user profile information
-- Linked to auth.users via foreign key

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- POSTS TABLE
-- ===========================================
-- Example content table with author relationship

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- COMMENTS TABLE
-- ===========================================
-- Example nested content with relationships

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================
-- Improve query performance

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Posts Policies
CREATE POLICY "Anyone can view posts"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own posts"
  ON posts FOR DELETE
  USING (auth.uid() = author_id);

-- Comments Policies
CREATE POLICY "Anyone can view comments"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own comments"
  ON comments FOR DELETE
  USING (auth.uid() = author_id);
```

## Role System Extension

This adds the 4-tier role system and admin capabilities.

```sql
-- ===========================================
-- ADD ROLE COLUMN
-- ===========================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
CHECK (role IN ('admin', 'main_user', 'vip_user', 'user'));

-- ===========================================
-- ADD PROFILE METADATA COLUMNS
-- ===========================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ===========================================
-- ROLE INDEX
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ===========================================
-- PROFILE UPDATE TRIGGER
-- ===========================================

CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at_trigger ON profiles;

CREATE TRIGGER update_profiles_updated_at_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- ===========================================
-- ROLE-BASED RLS POLICIES
-- ===========================================

-- Users can update their own profile (excluding role changes)
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Role can only be changed by admins
    (role = (SELECT role FROM profiles WHERE id = auth.uid()) OR
     (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admins can delete any profile
CREATE POLICY "Admins can delete any profile"
  ON profiles FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ===========================================
-- UPDATE SIGNUP TRIGGER FOR ROLES
-- ===========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- ACTIVITY LOGS (OPTIONAL)
-- ===========================================
-- Track user actions for audit trail

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view all logs"
  ON user_activity_logs FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Users can view their own logs
CREATE POLICY "Users can view their own logs"
  ON user_activity_logs FOR SELECT
  USING (auth.uid() = user_id);
```

## Schema Explanation

### Tables

**profiles**
- Primary user data table
- id matches auth.users.id (managed by Supabase Auth)
- Always reference profiles, not auth.users in foreign keys
- Auto-created on signup via trigger

**posts** (example)
- Content created by users
- author_id references profiles(id)
- CASCADE delete when author deleted
- updated_at auto-maintained by trigger

**comments** (example)
- Nested content
- References both posts and profiles
- Demonstrates multi-table relationships

**user_activity_logs** (optional)
- Audit trail for user actions
- JSONB details column for flexible metadata
- Admin-only read access via RLS

### Foreign Key Pattern

Always reference profiles, not auth.users:

```sql
-- ✅ Correct
author_id UUID REFERENCES profiles(id)

-- ❌ Wrong (auth.users is internal to Supabase)
author_id UUID REFERENCES auth.users(id)
```

### RLS Security Model

**Public Read, Authenticated Write**
- SELECT: Open to everyone (for public content)
- INSERT/UPDATE/DELETE: Only authenticated users
- Author-only: Users can only modify their own content

**Admin Override**
- Admins bypass normal restrictions
- Can manage any user's content
- Implemented via role check in USING clause

### Trigger Functions

**SECURITY DEFINER**: Required for triggers that insert into tables the trigger user doesn't own. Without this, the profile creation trigger fails.

### Index Strategy

**Primary Indexes**:
- created_at DESC: Fast recent posts/comments queries
- author_id: Fast user content lookups
- role: Fast role-based queries

**Composite Indexes** (add as needed):
```sql
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC);
```

## Role System Details

### Role Hierarchy

Roles have implicit hierarchy for permission checks:

```
admin (4) > main_user (3) > vip_user (2) > user (1)
```

Implemented in TypeScript, not in database. Database only stores role as text.

### Role Check Pattern

In RLS policies:

```sql
-- Check if user is admin
(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'

-- Check if user has minimum role (implement in application layer)
-- RLS policies are binary, use app logic for hierarchical checks
```

### Default Role

All new users get 'user' role automatically via trigger. Promote manually using setup-admin.sql or admin panel.

## Common Schema Modifications

### Add New Table with Author

```sql
CREATE TABLE your_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  -- your columns
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view"
  ON your_table FOR SELECT
  USING (true);

CREATE POLICY "Authors can create"
  ON your_table FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own"
  ON your_table FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own"
  ON your_table FOR DELETE
  USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all"
  ON your_table FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
```

### Add Profile Field

```sql
ALTER TABLE profiles
ADD COLUMN your_field TEXT;

-- Update Profile type in src/lib/types.ts
-- Add form field to profile edit page
-- Ensure RLS allows user updates (already configured)
```

## Troubleshooting

### Trigger Not Firing

Check trigger exists:
```sql
SELECT * FROM information_schema.triggers
WHERE event_object_table = 'users'
AND trigger_schema = 'auth';
```

### RLS Blocking Queries

Temporarily disable to test (never in production):
```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

Check which policy is blocking:
```sql
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

### Performance Issues

Add indexes for common queries:
```sql
CREATE INDEX idx_name ON table_name(column_name);
```

Use EXPLAIN ANALYZE to diagnose:
```sql
EXPLAIN ANALYZE SELECT * FROM posts WHERE author_id = 'some-uuid';
```
