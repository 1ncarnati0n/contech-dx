# Code Examples

Real-world implementation patterns for Next.js 16 + Supabase authentication.

## Files

### server-actions.ts
Production-ready server actions for:
- Profile updates
- Post CRUD operations
- Comment management
- Admin user management
- Authentication actions

Copy and adapt these patterns to your `src/actions/` directory or inline in your components.

### protected-pages.tsx
Common page protection patterns:
- Authentication required
- Admin-only pages
- Role-based access
- Owner or admin access
- Optional authentication
- Conditional features by role
- Error handling

Use these patterns in your `src/app/**/page.tsx` files.

### client-components.tsx
Client-side authentication patterns:
- User profile display
- Logout functionality
- Real-time auth state
- Protected client components
- Forms with server actions
- Real-time data subscriptions
- Optimistic UI updates
- Role-based conditional rendering

Use these in your `src/components/` directory.

## Usage

These are reference implementations. Copy the patterns you need and customize:
- Update types to match your schema
- Modify styling (Tailwind classes provided)
- Add validation logic
- Implement error handling
- Add loading states

## Key Patterns

### Server Actions
```typescript
'use server';
export async function myAction() {
  const profile = await getCurrentUserProfile();
  if (!profile) return { error: 'Unauthorized' };
  // ... action logic
  revalidatePath('/path');
  return { success: true };
}
```

### Protected Pages
```typescript
export default async function Page() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect('/login');
  // ... page content
}
```

### Client Components
```typescript
'use client';
export function Component({ profile }: { profile: Profile }) {
  const supabase = createClient();
  // ... component logic
}
```

## Best Practices

1. **Always check authentication** before data operations
2. **Verify permissions** (owner or admin) before updates/deletes
3. **Revalidate paths** after mutations
4. **Handle errors gracefully** with user feedback
5. **Use optimistic updates** for better UX
6. **Implement loading states** for async operations
7. **Leverage RLS** for database-level security (don't rely on app logic alone)

## Integration

These examples assume:
- You've run the database schema
- You have the Supabase clients set up
- You have the permission system in place
- You have the type definitions

If not, refer to the main SKILL.md for setup instructions.
