/**
 * Posts Service - Client Side
 * 클라이언트 컴포넌트에서 사용 가능한 함수들
 *
 * withClientAuth 래퍼를 사용하여 인증 로직을 추상화합니다.
 */

import { withClientAuth, type ServiceResult } from '@/lib/supabase/withAuth';
import type { Post } from '@/lib/types';

/**
 * 게시글 생성 (클라이언트 사이드)
 * @param title 제목
 * @param content 내용
 * @returns 생성된 게시글과 에러
 */
export async function createPost(
  title: string,
  content: string
): Promise<ServiceResult<Post>> {
  return withClientAuth(async (supabase, user) => {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        author_id: user.id,
      })
      .select()
      .single();

    return { data, error: error ? { message: error.message } : null };
  });
}

/**
 * 게시글 수정 (클라이언트 사이드)
 * @param id 게시글 ID
 * @param title 제목
 * @param content 내용
 * @returns 수정된 게시글과 에러
 */
export async function updatePost(
  id: string,
  title: string,
  content: string
): Promise<ServiceResult<Post>> {
  return withClientAuth(async (supabase) => {
    const { data, error } = await supabase
      .from('posts')
      .update({
        title,
        content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error: error ? { message: error.message } : null };
  });
}

/**
 * 게시글 삭제 (클라이언트 사이드)
 * @param id 게시글 ID
 * @returns 에러
 */
export async function deletePost(id: string): Promise<ServiceResult<null>> {
  return withClientAuth(async (supabase) => {
    const { error } = await supabase.from('posts').delete().eq('id', id);

    return { data: null, error: error ? { message: error.message } : null };
  });
}
