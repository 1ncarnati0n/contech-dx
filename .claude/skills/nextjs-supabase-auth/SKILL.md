---
name: nextjs-supabase-auth
description: Build production-ready Next.js 16 + Supabase authentication and role-based access control systems with 4-tier user roles (admin, main_user, vip_user, user). Use this skill when implementing authentication, user management, role-based permissions, or RLS policies in Next.js projects.
---

# Next.js 16 + Supabase Authentication & Role-Based Access Control

Build production-ready authentication and authorization systems for Next.js 16 applications using Supabase. This skill provides battle-tested patterns for user authentication, 4-tier role systems, and Row Level Security (RLS) policies.

## When to Use This Skill

Invoke this skill when:
- Setting up authentication in a Next.js 16 project with Supabase
- Implementing role-based access control (RBAC) with multiple user tiers
- Creating admin panels with user management capabilities
- Building systems that require authentication and authorization
- Migrating from Next.js 15 to 16 with Supabase authentication
- Troubleshooting Supabase SSR issues in Next.js

## Core Architecture

### Three-Client Pattern

Supabase in Next.js requires three separate client configurations:

1. **Browser Client** (`lib/supabase/client.ts`) - For client components
2. **Server Client** (`lib/supabase/server.ts`) - For server components and server actions
3. **Middleware Client** (`lib/supabase/middleware.ts`) - For session refresh in middleware

**Critical**: Never use the browser client in server components or vice versa. This causes hydration errors and authentication failures.

### Role Hierarchy System

Four-tier role system with numerical hierarchy:

```
admin (4)       - Full system access, user management
main_user (3)   - Extended privileges (project-specific)
vip_user (2)    - Premium features (project-specific)
user (1)        - Basic access
```

Permission checks use `hasMinimumRole()` to verify hierarchical access.

## Implementation Workflow

### Step 1: Initialize Supabase Project

1. Create a new Supabase project at https://supabase.com
2. Navigate to Project Settings > API
3. Copy the Project URL and anon/public key
4. Create `.env.local` with credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

5. Install dependencies:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Step 2: Database Schema Setup

Execute SQL schemas in Supabase SQL Editor in this exact order:

1. **Base Schema** (`references/database-schema.md` section "Base Schema")
   - Creates `profiles`, `posts`, `comments` tables
   - Sets up RLS policies for basic operations
   - Configures automatic profile creation trigger

2. **Role System** (`references/database-schema.md` section "Role System Extension")
   - Adds `role` column to profiles
   - Creates role-based RLS policies
   - Sets up admin permissions

3. **Promote First Admin** (`scripts/setup-admin.sql`)
   - Update with your email address
   - Execute to grant yourself admin access

### Step 3: Create Supabase Clients

**Reference Implementation**: See `assets/templates/` directory for complete code.

**Browser Client** (`src/lib/supabase/client.ts`):
- Use `createBrowserClient` from `@supabase/ssr`
- Access public environment variables only
- Import in "use client" components

**Server Client** (`src/lib/supabase/server.ts`):
- Use `createServerClient` from `@supabase/ssr`
- Await `cookies()` for Next.js 16 compatibility
- Handle cookie operations with try/catch
- Import in server components and server actions

**Middleware Client** (`src/lib/supabase/middleware.ts`):
- Implement `updateSession()` function
- Call `supabase.auth.getUser()` to refresh session
- Return modified NextResponse with updated cookies

### Step 4: Configure Middleware

Create `middleware.ts` in project root:

```typescript
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

**Critical**: This refreshes user sessions on every request. Without it, users will be logged out unexpectedly.

### Step 5: Create Permission System

**Two-File Pattern**: Separate server and client permissions to avoid hydration errors.

**Server Permissions** (`src/lib/permissions.ts`):
- `getCurrentUserProfile()` - Fetch authenticated user's profile
- `isSystemAdmin()`, `isAdmin()`, `isVIP()` - Role checks
- `hasMinimumRole()` - Hierarchical permission verification
- Import in server components only

**Client Permissions** (`src/lib/permissions-client.ts`):
- Pure utility functions only (no async, no Supabase calls)
- `hasRole()`, `getRoleDisplayName()`, `getRoleBadgeColor()`
- Import in client components

**Reference**: See `assets/templates/permissions.ts` and `assets/templates/permissions-client.ts`

### Step 6: Build Authentication UI

**Login Flow**:
1. Create `src/app/login/page.tsx` with LoginForm component
2. Use `supabase.auth.signInWithPassword()`
3. Redirect to protected route on success
4. Call `router.refresh()` to update server components

**Signup Flow**:
1. Create `src/app/signup/page.tsx` with SignupForm component
2. Use `supabase.auth.signUp()` with `emailRedirectTo` option
3. Handle email confirmation if required
4. Profile is auto-created via database trigger

**Callback Handler**:
1. Create `src/app/auth/callback/route.ts`
2. Exchange code for session using `exchangeCodeForSession()`
3. Redirect to application

**Reference**: See `assets/templates/auth/` directory

### Step 7: Protect Routes with RLS

Apply RLS policies at the database level for security:

**Read Operations**: Use `USING` clause
```sql
CREATE POLICY "Users can view their own posts"
  ON posts FOR SELECT
  USING (auth.uid() = author_id);
```

**Write Operations**: Use `WITH CHECK` clause
```sql
CREATE POLICY "Users can create posts as themselves"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);
```

**Admin Override**: Role-based policies
```sql
CREATE POLICY "Admins can manage all posts"
  ON posts FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
```

### Step 8: Implement Protected Pages

**Pattern for Admin-Only Pages**:

```typescript
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const profile = await getCurrentUserProfile();

  if (!profile || !isSystemAdmin(profile)) {
    redirect('/');
  }

  // Admin-only content
}
```

**Pattern for Role-Based Access**:

```typescript
const profile = await getCurrentUserProfile();

if (!profile || !hasMinimumRole(profile, 'vip_user')) {
  return <AccessDenied />;
}
```

## Critical Next.js 16 Compatibility Issues

### Issue 1: Params are Now Promises

**Problem**: In Next.js 16, `params` in dynamic routes are Promises.

**Solution**:
```typescript
// ❌ Next.js 15 (breaks in 16)
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;
}

// ✅ Next.js 16
export default async function Page({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
}
```

### Issue 2: Server Client Must Await cookies()

**Problem**: `cookies()` is now async in Next.js 16.

**Solution**: Always await `cookies()` in server client creation:

```typescript
// ✅ Correct
export async function createClient() {
  const cookieStore = await cookies();
  // ...
}
```

### Issue 3: Client/Server Boundary Violations

**Problem**: Using server-only code in client components causes errors.

**Solution**:
- Keep `getCurrentUserProfile()` in server-only `permissions.ts`
- Use pure utilities in `permissions-client.ts` for client components
- Pass profile data from server to client components as props

## Common Patterns and Solutions

### Pattern: Fetch Current User in Server Component

```typescript
import { getCurrentUserProfile } from '@/lib/permissions';

export default async function ServerComponent() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    // User not logged in
  }

  // Use profile.role, profile.email, etc.
}
```

### Pattern: Display User Info in Client Component

```typescript
'use client';

import { getRoleDisplayName, getRoleBadgeColor } from '@/lib/permissions-client';

export default function UserBadge({ profile }: { profile: Profile }) {
  return (
    <span className={getRoleBadgeColor(profile.role)}>
      {getRoleDisplayName(profile.role)}
    </span>
  );
}
```

### Pattern: Server Action for Role Update

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';

export async function updateUserRole(userId: string, newRole: UserRole) {
  const profile = await getCurrentUserProfile();

  if (!profile || !isSystemAdmin(profile)) {
    throw new Error('Unauthorized');
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) throw error;

  revalidatePath('/admin/users');
}
```

## Bundled Resources

### Scripts Directory

- `setup-admin.sql` - SQL to promote first user to admin role
- `verify-setup.sql` - Diagnostic queries to verify configuration

### References Directory

- `database-schema.md` - Complete SQL schema with explanations
- `file-structure.md` - Detailed project structure guide
- `troubleshooting.md` - Common issues and solutions

### Assets Directory

- `templates/` - Copy-paste ready code templates
  - `supabase/client.ts` - Browser client implementation
  - `supabase/server.ts` - Server client implementation
  - `supabase/middleware.ts` - Middleware implementation
  - `permissions.ts` - Server permissions
  - `permissions-client.ts` - Client permissions
  - `types.ts` - TypeScript definitions
  - `auth/` - Authentication components

## Extending the System

### Add New Role Tier

1. Update `UserRole` type in `src/lib/types.ts`
2. Add role to CHECK constraint in database
3. Update `roleHierarchy` in both permission files
4. Add display name and color mappings
5. Create role-specific RLS policies if needed

### Add OAuth Providers

1. Configure provider in Supabase Dashboard > Authentication > Providers
2. Use `supabase.auth.signInWithOAuth()`:

```typescript
await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: `${location.origin}/auth/callback`,
  },
});
```

3. Callback route remains the same

### Add Profile Fields

1. Add column to `profiles` table
2. Update `Profile` type in `src/lib/types.ts`
3. Create form for editing (ensure RLS allows user updates)
4. Use server action to save changes

## Troubleshooting

### "Failed to fetch user" or Random Logouts

**Cause**: Missing or incorrect middleware configuration.

**Fix**: Verify middleware.ts exists and calls `updateSession()`. Check matcher pattern excludes static files.

### "Cookies can only be modified in Server Actions"

**Cause**: Using server client in client component, or not awaiting cookies().

**Fix**: Ensure `createClient()` from correct import. Verify `await cookies()` in server client.

### RLS Policy Not Working

**Cause**: Policy order, missing policy, or incorrect role check.

**Fix**:
- Verify RLS is enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY`
- Check policy applies to correct operation (SELECT, INSERT, UPDATE, DELETE)
- Test auth.uid() returns expected value
- Verify role column populated correctly

### Profile Not Created on Signup

**Cause**: Trigger not configured or failed.

**Fix**:
- Verify trigger exists in database
- Check trigger function has SECURITY DEFINER
- Look for errors in Supabase logs
- Manually verify profiles table has matching user

## Quick Reference

**Get current user in server component**:
```typescript
const profile = await getCurrentUserProfile();
```

**Check admin access**:
```typescript
if (!isSystemAdmin(profile)) redirect('/');
```

**Check minimum role**:
```typescript
if (!hasMinimumRole(profile, 'vip_user')) return <AccessDenied />;
```

**Foreign key to user**:
```sql
author_id UUID REFERENCES profiles(id)
```

**Server action pattern**:
```typescript
'use server';
const supabase = await createClient();
```

**Client component pattern**:
```typescript
'use client';
const supabase = createClient();
```

