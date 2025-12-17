/**
 * Comments Service - Server Side
 * 서버 컴포넌트에서만 사용 가능한 함수들
 */

import { createClient as createServerClient } from '@/lib/supabase/server';

/**
 * 특정 게시글의 댓글 목록 조회 (서버 사이드)
 * @param postId 게시글 ID
 * @returns 댓글 배열과 에러
 */
export async function getCommentsByPostId(postId: string) {
  const supabase = await createServerClient();

  const { data: comments, error } = await supabase
    .from('comments')
    .select(
      `
      *,
      author:profiles(email, role)
    `
    )
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  return { comments, error };
}

/**
 * 특정 사용자의 댓글 목록 조회 (서버 사이드)
 * @param userId 사용자 ID
 * @param limit 가져올 댓글 수 (기본값: 20)
 * @returns 댓글 배열과 에러
 */
export async function getCommentsByUserId(userId: string, limit: number = 20) {
  const supabase = await createServerClient();

  const { data: comments, error } = await supabase
    .from('comments')
    .select(
      `
      *,
      author:profiles(email, role),
      post:posts(id, title)
    `
    )
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { comments, error };
}
