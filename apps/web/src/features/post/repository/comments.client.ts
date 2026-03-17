/**
 * Comments Service - Client Side
 * 클라이언트 컴포넌트에서 사용 가능한 함수들
 *
 * withClientAuth 래퍼를 사용하여 인증 로직을 추상화합니다.
 */

import { withClientAuth, type ServiceResult } from '@/shared/lib/supabase/withAuth';
import type { Comment } from '@/shared/types';

/**
 * 댓글 생성 (클라이언트 사이드)
 * @param postId 게시글 ID
 * @param content 댓글 내용
 * @returns 생성된 댓글과 에러
 */
export async function createComment(
  postId: string,
  content: string
): Promise<ServiceResult<Comment>> {
  return withClientAuth(async (supabase, user) => {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        content,
        author_id: user.id,
      })
      .select()
      .single();

    return { data, error: error ? { message: error.message } : null };
  });
}

/**
 * 댓글 삭제 (클라이언트 사이드)
 * @param commentId 댓글 ID
 * @returns 에러
 */
export async function deleteComment(
  commentId: string
): Promise<ServiceResult<null>> {
  return withClientAuth(async (supabase) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);

    return { data: null, error: error ? { message: error.message } : null };
  });
}
