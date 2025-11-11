// =========================================
// Protected Pages Examples
// =========================================
// Common patterns for protected routes with different access levels

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, isSystemAdmin, hasMinimumRole } from '@/lib/permissions';
import { redirect } from 'next/navigation';

// =========================================
// Example 1: Authentication Required
// =========================================

export async function AuthRequiredPage() {
  const profile = await getCurrentUserProfile();

  // Redirect to login if not authenticated
  if (!profile) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Protected Page</h1>
      <p>Welcome, {profile.email}!</p>
      <p>Your role: {profile.role}</p>
    </div>
  );
}

// =========================================
// Example 2: Admin Only
// =========================================

export async function AdminOnlyPage() {
  const profile = await getCurrentUserProfile();

  // Redirect if not admin
  if (!profile || !isSystemAdmin(profile)) {
    redirect('/');
  }

  const supabase = await createClient();

  // Fetch admin-only data
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Total users: {users?.length || 0}</p>
      {/* Admin UI here */}
    </div>
  );
}

// =========================================
// Example 3: VIP or Higher
// =========================================

export async function VIPFeaturePage() {
  const profile = await getCurrentUserProfile();

  // Redirect if not VIP or higher
  if (!profile || !hasMinimumRole(profile, 'vip_user')) {
    redirect('/upgrade');
  }

  return (
    <div>
      <h1>VIP Feature</h1>
      <p>This feature is only available to VIP users and above.</p>
    </div>
  );
}

// =========================================
// Example 4: Optional Authentication
// =========================================

export async function OptionalAuthPage() {
  const profile = await getCurrentUserProfile();

  // Show different content based on auth status
  if (!profile) {
    return (
      <div>
        <h1>Public Page</h1>
        <p>You are viewing as a guest.</p>
        <a href="/login">Log in for more features</a>
      </div>
    );
  }

  return (
    <div>
      <h1>Public Page</h1>
      <p>Welcome back, {profile.email}!</p>
      <p>You have access to additional features.</p>
    </div>
  );
}

// =========================================
// Example 5: Owner or Admin
// =========================================

interface PostEditPageProps {
  params: Promise<{ id: string }>;
}

export async function PostEditPage({ params }: PostEditPageProps) {
  const { id } = await params;
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/login');
  }

  const supabase = await createClient();

  // Fetch post
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !post) {
    redirect('/posts');
  }

  // Check if user is owner or admin
  const isOwner = post.author_id === profile.id;
  const isAdmin = isSystemAdmin(profile);

  if (!isOwner && !isAdmin) {
    redirect('/posts');
  }

  return (
    <div>
      <h1>Edit Post</h1>
      <form>
        <input defaultValue={post.title} name="title" />
        <textarea defaultValue={post.content} name="content" />
        <button type="submit">Save</button>
      </form>
    </div>
  );
}

// =========================================
// Example 6: Conditional Features by Role
// =========================================

export async function DashboardPage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/login');
  }

  const supabase = await createClient();

  // Fetch user's own posts
  const { data: myPosts } = await supabase
    .from('posts')
    .select('*')
    .eq('author_id', profile.id)
    .order('created_at', { ascending: false });

  // Admin can see all posts
  const { data: allPosts } = isSystemAdmin(profile)
    ? await supabase.from('posts').select('*').order('created_at', { ascending: false })
    : { data: null };

  return (
    <div>
      <h1>Dashboard</h1>

      <section>
        <h2>My Posts ({myPosts?.length || 0})</h2>
        {/* Render myPosts */}
      </section>

      {isSystemAdmin(profile) && allPosts && (
        <section>
          <h2>All Posts (Admin) ({allPosts.length})</h2>
          {/* Render allPosts */}
        </section>
      )}

      {hasMinimumRole(profile, 'vip_user') && (
        <section>
          <h2>VIP Analytics</h2>
          {/* VIP-only content */}
        </section>
      )}
    </div>
  );
}

// =========================================
// Example 7: Loading State Pattern
// =========================================

export default async function ProtectedPageWithLoading() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect('/login');
  }

  // Parallel data fetching
  const supabase = await createClient();

  const [{ data: posts }, { data: comments }] = await Promise.all([
    supabase.from('posts').select('*').eq('author_id', profile.id),
    supabase.from('comments').select('*').eq('author_id', profile.id),
  ]);

  return (
    <div>
      <h1>My Activity</h1>
      <div>
        <h2>Posts: {posts?.length || 0}</h2>
        <h2>Comments: {comments?.length || 0}</h2>
      </div>
    </div>
  );
}

// Create a loading.tsx file in the same directory:
// export default function Loading() {
//   return <div>Loading...</div>;
// }

// =========================================
// Example 8: Error Handling Pattern
// =========================================

export async function SafeProtectedPage() {
  try {
    const profile = await getCurrentUserProfile();

    if (!profile) {
      redirect('/login');
    }

    const supabase = await createClient();

    const { data, error } = await supabase.from('posts').select('*');

    if (error) {
      throw new Error(error.message);
    }

    return (
      <div>
        <h1>Posts</h1>
        {data && data.length > 0 ? (
          <ul>
            {data.map((post) => (
              <li key={post.id}>{post.title}</li>
            ))}
          </ul>
        ) : (
          <p>No posts found</p>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error:', error);
    return (
      <div>
        <h1>Error</h1>
        <p>Failed to load page. Please try again.</p>
      </div>
    );
  }
}

// Create an error.tsx file in the same directory:
// 'use client';
// export default function Error({ error, reset }: { error: Error; reset: () => void }) {
//   return (
//     <div>
//       <h2>Something went wrong!</h2>
//       <button onClick={reset}>Try again</button>
//     </div>
//   );
// }
