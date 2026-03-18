import { getCommentsByPostId } from '../repository/comments.server';
import { createClient } from '@/shared/lib/supabase/server';

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
