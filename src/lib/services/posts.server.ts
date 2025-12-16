/**
 * Posts Service - Server Side
 * 서버 컴포넌트에서만 사용 가능한 함수들
 */

import { createClient as createServerClient } from '@/lib/supabase/server';

/**
 * 게시글 목록 조회 (서버 사이드)
 * @param limit 가져올 게시글 수 (기본값: 20)
 * @returns 게시글 배열과 에러
 */
export async function getPosts(limit: number = 20) {
  const supabase = await createServerClient();

  const { data: posts, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles(email, role)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  return { posts, error };
}

/**
 * 특정 게시글 조회 (서버 사이드)
 * @param id 게시글 ID
 * @returns 게시글 데이터와 에러
 */
export async function getPostById(id: string) {
  const supabase = await createServerClient();

  const { data: post, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles(email, role)
    `
    )
    .eq('id', id)
    .single();

  return { post, error };
}

/**
 * 특정 사용자의 게시글 목록 조회 (서버 사이드)
 * @param userId 사용자 ID
 * @param limit 가져올 게시글 수 (기본값: 20)
 * @returns 게시글 배열과 에러
 */
export async function getPostsByUserId(userId: string, limit: number = 20) {
  const supabase = await createServerClient();

  const { data: posts, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles(email, role)
    `
    )
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { posts, error };
}
