# Code Templates

Copy-paste ready implementations for Next.js 16 + Supabase authentication.

## File Locations

When copying these templates to your project, use these paths:

### Core Supabase Files

- `supabase/client.ts` → `src/lib/supabase/client.ts`
- `supabase/server.ts` → `src/lib/supabase/server.ts`
- `supabase/middleware.ts` → `src/lib/supabase/middleware.ts`

### Permission System

- `permissions.ts` → `src/lib/permissions.ts`
- `permissions-client.ts` → `src/lib/permissions-client.ts`
- `types.ts` → `src/lib/types.ts`

### Root Files

- `middleware.ts` → `middleware.ts` (project root, NOT in src/)
- `env.local.example` → `.env.local` (project root, add your credentials)

### Authentication Components

- `auth/LoginForm.tsx` → `src/components/auth/LoginForm.tsx`
- `auth/SignupForm.tsx` → `src/components/auth/SignupForm.tsx`

## Quick Setup

1. Copy all template files to corresponding locations
2. Update `.env.local` with your Supabase credentials
3. Run database schema from `references/database-schema.md`
4. Promote first user to admin using `scripts/setup-admin.sql`
5. Start building!

## Customization

These templates use:
- Tailwind CSS for styling
- TypeScript for type safety
- Next.js 16 App Router
- Supabase SSR package (@supabase/ssr)

Modify as needed for your UI framework, styling preferences, and business logic.
