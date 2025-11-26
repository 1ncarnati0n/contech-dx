# Troubleshooting Guide

Common issues and solutions for Next.js 16 + Supabase authentication.

## Authentication Issues

### Random Logouts / "Failed to fetch user"

**Symptoms**:
- User is logged out after navigating pages
- Session expires unexpectedly
- `supabase.auth.getUser()` returns null randomly

**Cause**: Missing or misconfigured middleware

**Solution**:

1. Verify middleware.ts exists in project root:
```typescript
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

2. Check matcher pattern excludes static files
3. Verify updateSession() is actually called
4. Check Supabase logs for auth errors

### "Cookies can only be modified in Server Actions"

**Symptoms**:
- Error when trying to log in/out
- Cookie modification fails

**Cause**: Using server client in client component

**Solution**:

Check your imports:
```typescript
// ❌ Wrong - server client in client component
'use client';
import { createClient } from '@/lib/supabase/server';

// ✅ Correct - browser client in client component
'use client';
import { createClient } from '@/lib/supabase/client';
```

Or: Not awaiting cookies() in server client:
```typescript
// ❌ Wrong
export function createClient() {
  const cookieStore = cookies(); // Missing await

// ✅ Correct
export async function createClient() {
  const cookieStore = await cookies();
```

### Login Succeeds but Profile is Null

**Symptoms**:
- User can log in
- `supabase.auth.getUser()` returns user
- `getCurrentUserProfile()` returns null

**Cause**: Profile not created automatically

**Solution**:

1. Check trigger exists:
```sql
SELECT * FROM information_schema.triggers
WHERE event_object_table = 'users'
AND trigger_schema = 'auth';
```

2. Verify trigger function:
```sql
SELECT routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';
```

3. Manually create missing profiles:
```sql
INSERT INTO profiles (id, email, role)
SELECT id, email, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles);
```

4. Check Supabase logs for trigger errors

### Email Confirmation Not Working

**Symptoms**:
- Signup succeeds but no email sent
- User can't log in after signup
- "Email not confirmed" error

**Cause**: Email confirmation required but not configured

**Solution**:

1. Check Supabase Dashboard > Authentication > Email Templates
2. Verify SMTP settings or use Supabase built-in email
3. Set emailRedirectTo in signup:
```typescript
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${location.origin}/auth/callback`,
  },
});
```

4. Or disable email confirmation:
   - Dashboard > Authentication > Settings
   - Uncheck "Enable email confirmations"

## Permission & RLS Issues

### RLS Policy Blocking Legitimate Access

**Symptoms**:
- User can't read/write own content
- Admin can't access admin features
- Queries return empty unexpectedly

**Cause**: Incorrect RLS policy or missing policy

**Solution**:

1. Check which policies exist:
```sql
SELECT * FROM pg_policies
WHERE tablename = 'your_table_name';
```

2. Temporarily disable RLS to test (development only!):
```sql
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;
-- Test your query
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

3. Verify auth.uid() returns correct value:
```sql
SELECT auth.uid();
```

4. Check role column is populated:
```sql
SELECT id, email, role FROM profiles;
```

5. Test policy logic manually:
```sql
SELECT *
FROM posts
WHERE auth.uid() = author_id; -- Should match policy USING clause
```

### Admin Can't Access Admin Pages

**Symptoms**:
- isSystemAdmin() returns false
- Admin redirected from admin pages
- Role is 'admin' in database

**Cause**: Profile not fetched correctly or role check fails

**Solution**:

1. Verify role in database:
```sql
SELECT id, email, role FROM profiles WHERE email = 'your-admin@example.com';
```

2. Check getCurrentUserProfile() returns data:
```typescript
const profile = await getCurrentUserProfile();
console.log(profile); // Should show role: 'admin'
```

3. Verify isSystemAdmin logic:
```typescript
export function isSystemAdmin(profile: Profile | null): boolean {
  return profile?.role === 'admin'; // Exact match required
}
```

4. Check for typos in role value

### User Can Modify Other Users' Content

**Symptoms**:
- RLS policy not enforcing ownership
- Any user can edit any post

**Cause**: Missing or incorrect RLS policy

**Solution**:

1. Ensure RLS is enabled:
```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
```

2. Create ownership policy:
```sql
CREATE POLICY "Authors can update their own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = author_id);
```

3. Test policy:
```sql
-- As user A, try to update user B's post (should fail)
UPDATE posts SET title = 'hacked' WHERE author_id = '<user_b_id>';
```

## Next.js 16 Compatibility Issues

### "params is not iterable" or "params.id is undefined"

**Symptoms**:
- Error in dynamic routes
- Can't access route params

**Cause**: Next.js 16 made params a Promise

**Solution**:

```typescript
// ❌ Next.js 15 pattern (breaks in 16)
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params;
}

// ✅ Next.js 16 pattern
export default async function Page({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
}
```

### "cookies() is not a function" or "cookies is not async"

**Symptoms**:
- Error calling cookies()
- Server client creation fails

**Cause**: Next.js 16 made cookies() async

**Solution**:

```typescript
// ❌ Old pattern
export function createClient() {
  const cookieStore = cookies();

// ✅ Next.js 16
export async function createClient() {
  const cookieStore = await cookies();
```

### Hydration Mismatch

**Symptoms**:
- "Hydration failed" error
- UI differs between server and client render
- Flash of wrong content

**Cause**: Using server data directly in client component

**Solution**:

1. Pass data as props instead:
```typescript
// ✅ Server component
export default async function Page() {
  const profile = await getCurrentUserProfile();
  return <ClientComponent profile={profile} />;
}

// ✅ Client component
'use client';
export default function ClientComponent({ profile }: { profile: Profile | null }) {
  // Use profile here
}
```

2. Or fetch on client side:
```typescript
'use client';
export default function ClientComponent() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(/* ... */);
  }, []);
}
```

## Database Issues

### Foreign Key Constraint Violation

**Symptoms**:
- Can't create posts/comments
- "violates foreign key constraint" error

**Cause**: author_id doesn't exist in profiles table

**Solution**:

1. Verify user has profile:
```sql
SELECT * FROM profiles WHERE id = '<user_id>';
```

2. Create missing profile:
```sql
INSERT INTO profiles (id, email, role)
SELECT id, email, 'user'
FROM auth.users
WHERE id = '<user_id>';
```

3. Ensure trigger is working for new users

### "relation does not exist"

**Symptoms**:
- Table not found error
- Query fails immediately

**Cause**: Schema not executed or wrong schema

**Solution**:

1. Verify table exists:
```sql
SELECT * FROM information_schema.tables
WHERE table_schema = 'public';
```

2. Re-run schema SQL in Supabase SQL Editor

3. Check you're querying correct table name (case-sensitive)

### Slow Queries

**Symptoms**:
- Page load times > 1 second
- Database timeouts

**Cause**: Missing indexes or inefficient queries

**Solution**:

1. Use EXPLAIN ANALYZE:
```sql
EXPLAIN ANALYZE
SELECT * FROM posts
WHERE author_id = '<uuid>'
ORDER BY created_at DESC;
```

2. Add indexes for filtered/sorted columns:
```sql
CREATE INDEX idx_posts_author_created
ON posts(author_id, created_at DESC);
```

3. Optimize joins:
```typescript
// ❌ Slow - separate queries
const posts = await supabase.from('posts').select('*');
const profiles = await supabase.from('profiles').select('*');

// ✅ Fast - single query with join
const { data } = await supabase
  .from('posts')
  .select('*, author:profiles(*)')
  .order('created_at', { ascending: false });
```

## Build & Deployment Issues

### "Module not found" in Production

**Symptoms**:
- Build succeeds
- Production runtime error
- Module can't be resolved

**Cause**: Wrong import paths or missing dependencies

**Solution**:

1. Use @ alias consistently:
```typescript
import { createClient } from '@/lib/supabase/client'; // ✅
import { createClient } from '../../../lib/supabase/client'; // ❌
```

2. Check tsconfig.json paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

3. Verify all dependencies installed:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Environment Variables Not Working

**Symptoms**:
- Supabase client fails to initialize
- "Invalid API key" error

**Cause**: Environment variables not set in production

**Solution**:

1. Check variables are prefixed:
```bash
NEXT_PUBLIC_SUPABASE_URL=...  # ✅ Accessible in browser
SUPABASE_URL=...               # ❌ Server-only, not available in client
```

2. Set in deployment platform:
   - Vercel: Project Settings > Environment Variables
   - Netlify: Site Settings > Build & Deploy > Environment
   - Railway: Project > Variables

3. Restart deployment after adding variables

### Build Fails with TypeScript Errors

**Symptoms**:
- `npm run build` fails
- Type errors in production only

**Cause**: Strict type checking in production

**Solution**:

1. Fix type errors:
```typescript
// ❌ Implicit any
const profile = await getCurrentUserProfile();
if (profile) {
  console.log(profile.role);
}

// ✅ Explicit typing
const profile: Profile | null = await getCurrentUserProfile();
if (profile) {
  console.log(profile.role);
}
```

2. Or temporarily disable (not recommended):
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": false
  }
}
```

## Common Error Messages

### "Error: NEXT_REDIRECT"

**Symptom**: Error stack trace shows NEXT_REDIRECT

**Cause**: This is normal! redirect() throws internally

**Solution**: No action needed. Catch if needed:
```typescript
try {
  redirect('/login');
} catch (error) {
  if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
    throw error; // Re-throw redirects
  }
  // Handle other errors
}
```

### "Error: Invariant: static generation store missing"

**Cause**: Calling dynamic functions in static generation

**Solution**: Mark route as dynamic:
```typescript
export const dynamic = 'force-dynamic';
```

### "AuthApiError: invalid_grant"

**Cause**: OAuth code already used or expired

**Solution**: Don't reuse auth callback. Redirect after first use.

## Debugging Tools

### Check User Session

```typescript
const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
```

### Check Current User ID

```sql
SELECT auth.uid();
```

### Check RLS Policies

```sql
SELECT * FROM pg_policies;
```

### Check Triggers

```sql
SELECT * FROM information_schema.triggers;
```

### Enable Supabase Logs

Dashboard > Settings > API > Logs

Filter by:
- Auth events
- Database queries
- RLS policy violations

### Next.js Debugging

```typescript
// Add to components
console.log('Server?', typeof window === 'undefined');
```

## Getting Help

If stuck after trying above solutions:

1. Check Supabase logs (Dashboard > Logs)
2. Verify schema with verify-setup.sql
3. Test with RLS disabled (development only!)
4. Check Next.js console for client errors
5. Check terminal for server errors
6. Search Supabase Discord/GitHub issues
7. Provide: error message, relevant code, schema
