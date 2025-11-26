# Project File Structure Guide

Complete file organization for Next.js 16 + Supabase authentication system.

## Directory Tree

```
project-root/
├── .env.local                      # Environment variables (gitignored)
├── middleware.ts                   # Session refresh middleware
├── src/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts          # Browser client (client components)
│   │   │   ├── server.ts          # Server client (server components)
│   │   │   └── middleware.ts      # Middleware client
│   │   ├── permissions.ts          # Server-side permission checks
│   │   ├── permissions-client.ts   # Client-side utilities
│   │   └── types.ts               # TypeScript type definitions
│   ├── app/
│   │   ├── layout.tsx             # Root layout with auth context
│   │   ├── page.tsx               # Home page
│   │   ├── login/
│   │   │   └── page.tsx           # Login page (client component)
│   │   ├── signup/
│   │   │   └── page.tsx           # Signup page (client component)
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts       # OAuth callback handler
│   │   ├── profile/
│   │   │   └── page.tsx           # User profile page
│   │   ├── admin/
│   │   │   └── users/
│   │   │       └── page.tsx       # Admin user management
│   │   └── posts/                 # Example protected feature
│   │       ├── page.tsx           # List posts
│   │       ├── new/
│   │       │   └── page.tsx       # Create post
│   │       └── [id]/
│   │           ├── page.tsx       # View post
│   │           └── edit/
│   │               └── page.tsx   # Edit post
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx      # Login form component
│   │   │   ├── SignupForm.tsx     # Signup form component
│   │   │   └── LogoutButton.tsx   # Logout button component
│   │   ├── admin/
│   │   │   └── UpdateRoleButton.tsx  # Role management component
│   │   ├── profile/
│   │   │   └── ProfileForm.tsx    # Profile edit form
│   │   └── layout/
│   │       ├── Header.tsx         # Navigation header
│   │       └── Footer.tsx         # Site footer
│   └── actions/                    # Server actions (optional organization)
│       ├── auth.ts                # Authentication actions
│       ├── profile.ts             # Profile actions
│       └── admin.ts               # Admin actions
└── package.json
```

## File-by-File Breakdown

### Environment Configuration

**`.env.local`** (gitignored)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
```

- Must start with NEXT_PUBLIC_ to be accessible in browser
- Never commit to git
- Required for all Supabase operations

### Root Middleware

**`middleware.ts`**
- Location: Project root (not inside src/)
- Purpose: Refresh user session on every request
- Prevents unexpected logouts
- Runs before every route

Template: See `assets/templates/middleware.ts`

### Supabase Clients

**`src/lib/supabase/client.ts`**
- For: "use client" components only
- Uses: createBrowserClient from @supabase/ssr
- Access: Client-side JavaScript

**`src/lib/supabase/server.ts`**
- For: Server components, server actions, route handlers
- Uses: createServerClient from @supabase/ssr
- Access: Server-side only, manages cookies

**`src/lib/supabase/middleware.ts`**
- For: Root middleware.ts only
- Exports: updateSession function
- Purpose: Session management

### Permission System

**`src/lib/permissions.ts`** (Server-only)

Functions:
- `getCurrentUserProfile()` - Fetch logged-in user's profile
- `getCurrentUserProfileClient()` - Client version (for client components)
- `isSystemAdmin()` - Check if user is admin
- `isAdmin()` - Check if admin or main_user
- `isVIP()` - Check if VIP tier or above
- `hasMinimumRole()` - Hierarchical role check
- `getRoleDisplayName()` - Get Korean role name
- `getRoleBadgeColor()` - Get Tailwind CSS classes for badge

Import in: Server components, server actions

**`src/lib/permissions-client.ts`** (Client-safe)

Functions:
- `hasRole()` - Check specific role
- `hasMinimumRole()` - Hierarchical check (pure utility)
- `getRoleDisplayName()` - Display name
- `getRoleBadgeColor()` - Badge colors

Import in: Client components

**Why Split?**
- Server functions use async, Supabase calls
- Client functions are pure utilities
- Prevents hydration errors and "server-only" violations

### Type Definitions

**`src/lib/types.ts`**

Exports:
- `UserRole` - 'admin' | 'main_user' | 'vip_user' | 'user'
- `Profile` - User profile shape
- `Post` - Post content shape
- `Comment` - Comment shape
- Pagination types

Import in: All files needing type safety

### App Router Pages

#### Public Pages

**`src/app/login/page.tsx`**
- Displays LoginForm component
- Redirects to /posts if already logged in
- Server component that renders client form

**`src/app/signup/page.tsx`**
- Displays SignupForm component
- Handles email confirmation flow
- Server component that renders client form

#### Protected Pages

**`src/app/profile/page.tsx`**
- Requires authentication
- Shows/edits current user's profile
- Uses getCurrentUserProfile()
- Redirects to /login if not authenticated

**`src/app/admin/users/page.tsx`**
- Requires admin role
- Lists all users with roles
- Allows role changes via UpdateRoleButton
- Uses isSystemAdmin() for access control

**`src/app/posts/page.tsx`**
- Public or authenticated (your choice)
- Lists all posts
- Shows author info from joined profiles

**`src/app/posts/new/page.tsx`**
- Requires authentication
- Create new post form
- Server action to save
- Redirects to post after creation

**`src/app/posts/[id]/page.tsx`**
- Public view of single post
- Shows comments
- Params is Promise (Next.js 16)

**`src/app/posts/[id]/edit/page.tsx`**
- Requires authentication
- Requires author or admin
- Pre-fills form with existing data
- Server action to update

#### Route Handlers

**`src/app/auth/callback/route.ts`**
- GET handler only
- Exchanges OAuth code for session
- Redirects to app after auth
- Required for OAuth and email confirmation

### Components

#### Authentication Components

**`src/components/auth/LoginForm.tsx`**
- "use client" component
- Email/password form
- Uses supabase.auth.signInWithPassword()
- Handles errors, loading states
- Calls router.refresh() after login

**`src/components/auth/SignupForm.tsx`**
- "use client" component
- Email/password/confirm form
- Uses supabase.auth.signUp()
- Sets emailRedirectTo for confirmation
- Handles errors, validation

**`src/components/auth/LogoutButton.tsx`**
- "use client" component
- Calls supabase.auth.signOut()
- Redirects to home
- Shows loading state

#### Admin Components

**`src/components/admin/UpdateRoleButton.tsx`**
- "use client" component
- Dropdown to select new role
- Calls server action to update
- Optimistic UI updates

#### Profile Components

**`src/components/profile/ProfileForm.tsx`**
- "use client" component
- Edit display_name, avatar_url, bio
- Calls server action to save
- Shows current values

#### Layout Components

**`src/components/layout/Header.tsx`**
- Navigation links
- User info if logged in
- Login/Logout buttons
- Role badge display

### Server Actions (Optional Organization)

**`src/actions/auth.ts`**
```typescript
'use server';

export async function loginAction(formData: FormData) {
  // Login logic
}

export async function signupAction(formData: FormData) {
  // Signup logic
}
```

**`src/actions/profile.ts`**
```typescript
'use server';

export async function updateProfileAction(userId: string, data: Partial<Profile>) {
  // Update logic with permission check
}
```

**`src/actions/admin.ts`**
```typescript
'use server';

export async function updateUserRoleAction(userId: string, newRole: UserRole) {
  // Admin-only role update
  // Check isSystemAdmin() first
}
```

**Note**: Server actions can also be colocated with components. Separate files improve organization for large projects.

## Import Patterns

### In Server Components

```typescript
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions';
import type { Profile } from '@/lib/types';

export default async function ServerPage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();
  // ...
}
```

### In Client Components

```typescript
'use client';

import { createClient } from '@/lib/supabase/client';
import { getRoleDisplayName, getRoleBadgeColor } from '@/lib/permissions-client';
import type { Profile } from '@/lib/types';

export default function ClientComponent({ profile }: { profile: Profile }) {
  const supabase = createClient();
  // ...
}
```

### In Server Actions

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';

export async function myAction() {
  const supabase = await createClient();
  const profile = await getCurrentUserProfile();
  // ... do work ...
  revalidatePath('/some-path');
}
```

### In Route Handlers

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  // ...
  return NextResponse.json({ data });
}
```

## File Naming Conventions

### Page Files
- `page.tsx` - Route page
- `layout.tsx` - Route layout
- `loading.tsx` - Loading state
- `error.tsx` - Error boundary
- `not-found.tsx` - 404 page

### Route Handlers
- `route.ts` - API route (GET, POST, etc.)

### Components
- `ComponentName.tsx` - PascalCase
- Suffix "Form", "Button", "List", etc. for clarity

### Server Actions
- `actionName.ts` - camelCase filename
- Export named functions ending in "Action"

## Critical Don'ts

1. **Don't mix client/server imports**
   - Never import server client in client components
   - Never import getCurrentUserProfile in client components

2. **Don't forget "use client"**
   - Required for useState, useEffect, event handlers
   - Required for supabase browser client usage

3. **Don't skip middleware.ts**
   - Users will be logged out randomly without it

4. **Don't commit .env.local**
   - Add to .gitignore
   - Use .env.local.example for template

5. **Don't use auth.users in foreign keys**
   - Always reference profiles(id)

## Scalability Patterns

### Feature Modules

For large apps, group by feature:

```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── actions/
│   │   └── types.ts
│   ├── posts/
│   │   ├── components/
│   │   ├── actions/
│   │   └── types.ts
│   └── admin/
│       ├── components/
│       ├── actions/
│       └── types.ts
```

### Shared Components

```
src/
├── components/
│   ├── ui/              # shadcn/ui, base components
│   ├── forms/           # Reusable form components
│   └── layout/          # Layout components
```

### Multiple Supabase Functions

```
src/lib/supabase/
├── client.ts
├── server.ts
├── middleware.ts
├── queries/
│   ├── posts.ts         # Post-related queries
│   ├── users.ts         # User queries
│   └── comments.ts      # Comment queries
└── mutations/
    ├── posts.ts         # Post mutations
    └── users.ts         # User mutations
```
