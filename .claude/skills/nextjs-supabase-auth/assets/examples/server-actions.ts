// =========================================
// Server Actions Examples
// =========================================
// Production-ready server actions for common operations
// Copy and adapt these patterns to your needs

'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '@/lib/types';

// =========================================
// Profile Actions
// =========================================

/**
 * Update current user's profile
 * Users can only update their own profile (except role)
 */
export async function updateProfileAction(formData: FormData) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return { error: 'Unauthorized' };
  }

  const displayName = formData.get('displayName') as string;
  const bio = formData.get('bio') as string;
  const avatarUrl = formData.get('avatarUrl') as string;

  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName,
      bio,
      avatar_url: avatarUrl,
    })
    .eq('id', profile.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/profile');
  return { success: true };
}

// =========================================
// Post Actions
// =========================================

/**
 * Create a new post
 * Requires authentication
 */
export async function createPostAction(formData: FormData) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return { error: 'Unauthorized' };
  }

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  if (!title || !content) {
    return { error: 'Title and content are required' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts')
    .insert({
      title,
      content,
      author_id: profile.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/posts');
  return { success: true, post: data };
}

/**
 * Update a post
 * Only author or admin can update
 */
export async function updatePostAction(postId: string, formData: FormData) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Check if user is author or admin
  const { data: post } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .single();

  if (!post) {
    return { error: 'Post not found' };
  }

  const isAuthor = post.author_id === profile.id;
  const isAdmin = isSystemAdmin(profile);

  if (!isAuthor && !isAdmin) {
    return { error: 'Forbidden' };
  }

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  const { error } = await supabase
    .from('posts')
    .update({ title, content })
    .eq('id', postId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/posts');
  revalidatePath(`/posts/${postId}`);
  return { success: true };
}

/**
 * Delete a post
 * Only author or admin can delete
 */
export async function deletePostAction(postId: string) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Check if user is author or admin
  const { data: post } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .single();

  if (!post) {
    return { error: 'Post not found' };
  }

  const isAuthor = post.author_id === profile.id;
  const isAdmin = isSystemAdmin(profile);

  if (!isAuthor && !isAdmin) {
    return { error: 'Forbidden' };
  }

  const { error } = await supabase.from('posts').delete().eq('id', postId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/posts');
  return { success: true };
}

// =========================================
// Comment Actions
// =========================================

/**
 * Create a comment on a post
 * Requires authentication
 */
export async function createCommentAction(postId: string, formData: FormData) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return { error: 'Unauthorized' };
  }

  const content = formData.get('content') as string;

  if (!content) {
    return { error: 'Content is required' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      content,
      author_id: profile.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/posts/${postId}`);
  return { success: true, comment: data };
}

/**
 * Delete a comment
 * Only author or admin can delete
 */
export async function deleteCommentAction(commentId: string, postId: string) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return { error: 'Unauthorized' };
  }

  const supabase = await createClient();

  // Check if user is author or admin
  const { data: comment } = await supabase
    .from('comments')
    .select('author_id')
    .eq('id', commentId)
    .single();

  if (!comment) {
    return { error: 'Comment not found' };
  }

  const isAuthor = comment.author_id === profile.id;
  const isAdmin = isSystemAdmin(profile);

  if (!isAuthor && !isAdmin) {
    return { error: 'Forbidden' };
  }

  const { error } = await supabase.from('comments').delete().eq('id', commentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/posts/${postId}`);
  return { success: true };
}

// =========================================
// Admin Actions
// =========================================

/**
 * Update user role (Admin only)
 */
export async function updateUserRoleAction(userId: string, newRole: UserRole) {
  const profile = await getCurrentUserProfile();

  if (!profile || !isSystemAdmin(profile)) {
    return { error: 'Unauthorized - Admin only' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * Delete user (Admin only)
 * WARNING: This deletes the user from auth.users, cascading to profiles
 */
export async function deleteUserAction(userId: string) {
  const profile = await getCurrentUserProfile();

  if (!profile || !isSystemAdmin(profile)) {
    return { error: 'Unauthorized - Admin only' };
  }

  // Prevent self-deletion
  if (userId === profile.id) {
    return { error: 'Cannot delete yourself' };
  }

  const supabase = await createClient();

  // Use Supabase Admin API to delete user
  // Note: This requires service_role key, not anon key
  // For anon key, just delete from profiles and let RLS handle it
  const { error } = await supabase.from('profiles').delete().eq('id', userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/users');
  return { success: true };
}

// =========================================
// Authentication Actions
// =========================================

/**
 * Logout action
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  return { success: true };
}
