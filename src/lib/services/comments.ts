import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type { Comment } from '@/lib/types';

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
 * 댓글 생성 (클라이언트 사이드)
 * @param postId 게시글 ID
 * @param content 댓글 내용
 * @returns 생성된 댓글과 에러
 */
export async function createComment(postId: string, content: string) {
  const supabase = createBrowserClient();

  // 현재 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { comment: null, error: { message: '로그인이 필요합니다.' } };
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      content,
      author_id: user.id,
    })
    .select()
    .single();

  return { comment, error };
}

/**
 * 댓글 삭제 (클라이언트 사이드)
 * @param commentId 댓글 ID
 * @returns 에러
 */
export async function deleteComment(commentId: string) {
  const supabase = createBrowserClient();

  const { error } = await supabase.from('comments').delete().eq('id', commentId);

  return { error };
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
