import { createComment } from '../repository/comments.client';
import { getCommentsByPostId } from '../repository/comments.server';
import { createClient } from '@/shared/lib/supabase/server';

export type CommentSubmitResult =
  | { success: true }
  | { success: false; error: string };

export async function submitComment(
  postId: string,
  content: string,
): Promise<CommentSubmitResult> {
  try {
    const { error } = await createComment(postId, content);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch {
    return { success: false, error: '댓글 작성 중 오류가 발생했습니다.' };
  }
}

export async function fetchCommentsForPost(postId: string) {
  return getCommentsByPostId(postId);
}

/**
 * 현재 로그인 사용자 ID를 반환한다 (서버 컴포넌트용).
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
