// =========================================
// Client Component Examples
// =========================================
// Patterns for authentication in client components

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getRoleDisplayName, getRoleBadgeColor } from '@/lib/permissions-client';
import type { Profile } from '@/lib/types';

// =========================================
// Example 1: User Profile Display
// =========================================

export function UserProfile({ profile }: { profile: Profile }) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        {profile.avatar_url && (
          <img
            src={profile.avatar_url}
            alt={profile.display_name || profile.email}
            className="w-12 h-12 rounded-full"
          />
        )}
        <div>
          <h3 className="font-bold">{profile.display_name || profile.email}</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${getRoleBadgeColor(profile.role)}`}>
            {getRoleDisplayName(profile.role)}
          </span>
        </div>
      </div>
      {profile.bio && <p className="mt-2 text-gray-600">{profile.bio}</p>}
    </div>
  );
}

// =========================================
// Example 2: Logout Button
// =========================================

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  );
}

// =========================================
// Example 3: Real-time Authentication State
// =========================================

export function AuthStatus() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <div>
      <p>Logged in as: {user.email}</p>
    </div>
  );
}

// =========================================
// Example 4: Protected Client Component
// =========================================

export function ProtectedClientComponent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    }

    loadProfile();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!profile) {
    return null; // Will redirect
  }

  return (
    <div>
      <h1>Protected Content</h1>
      <UserProfile profile={profile} />
    </div>
  );
}

// =========================================
// Example 5: Form with Server Action
// =========================================

export function ProfileEditForm({ profile }: { profile: Profile }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Call server action (import from your actions file)
    // const result = await updateProfileAction(formData);

    // Mock example:
    const result = await fetch('/api/profile', {
      method: 'POST',
      body: formData,
    }).then((res) => res.json());

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }

    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium">
          Display Name
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={profile.display_name || ''}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={profile.bio || ''}
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}
      {success && <div className="text-green-600 text-sm">Profile updated!</div>}

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}

// =========================================
// Example 6: Real-time Data Subscription
// =========================================

export function RealtimePosts() {
  const [posts, setPosts] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Fetch initial posts
    supabase
      .from('posts')
      .select('*, author:profiles(*)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setPosts(data);
      });

    // Subscribe to new posts
    const channel = supabase
      .channel('posts-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        setPosts((current) => [payload.new, ...current]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts((current) => current.filter((post) => post.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div>
      <h2>Posts (Real-time)</h2>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.author?.email}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// =========================================
// Example 7: Optimistic UI Update
// =========================================

export function OptimisticPostList({ initialPosts }: { initialPosts: any[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [creating, setCreating] = useState(false);
  const supabase = createClient();

  async function createPost(formData: FormData) {
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;

    // Optimistic update
    const tempPost = {
      id: 'temp-' + Date.now(),
      title,
      content,
      created_at: new Date().toISOString(),
      author: { email: 'You' },
    };

    setPosts([tempPost, ...posts]);
    setCreating(true);

    // Actual API call
    const { data, error } = await supabase
      .from('posts')
      .insert({ title, content })
      .select('*, author:profiles(*)')
      .single();

    if (error) {
      // Revert on error
      setPosts(posts);
      alert('Failed to create post');
    } else {
      // Replace temp with real
      setPosts((current) => current.map((p) => (p.id === tempPost.id ? data : p)));
    }

    setCreating(false);
  }

  return (
    <div>
      <form action={createPost} className="mb-4">
        <input name="title" placeholder="Title" required />
        <textarea name="content" placeholder="Content" required />
        <button type="submit" disabled={creating}>
          Create Post
        </button>
      </form>

      <ul>
        {posts.map((post) => (
          <li key={post.id} className={post.id.startsWith('temp-') ? 'opacity-50' : ''}>
            <h3>{post.title}</h3>
            <p>{post.author?.email}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// =========================================
// Example 8: Role-Based Conditional Rendering
// =========================================

export function ConditionalFeatures({ profile }: { profile: Profile }) {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Everyone sees this */}
      <section>
        <h2>Your Posts</h2>
      </section>

      {/* VIP and above */}
      {(profile.role === 'admin' || profile.role === 'main_user' || profile.role === 'vip_user') && (
        <section>
          <h2>VIP Analytics</h2>
        </section>
      )}

      {/* Admin only */}
      {profile.role === 'admin' && (
        <section>
          <h2>Admin Panel</h2>
          <a href="/admin/users">Manage Users</a>
        </section>
      )}
    </div>
  );
}
