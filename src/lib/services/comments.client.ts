/**
 * Comments Service - Client Side
 * 클라이언트 컴포넌트에서 사용 가능한 함수들
 */

import { createClient as createBrowserClient } from '@/lib/supabase/client';

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
