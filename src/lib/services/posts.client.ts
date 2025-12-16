/**
 * Posts Service - Client Side
 * 클라이언트 컴포넌트에서 사용 가능한 함수들
 */

import { createClient as createBrowserClient } from '@/lib/supabase/client';

/**
 * 게시글 생성 (클라이언트 사이드)
 * @param title 제목
 * @param content 내용
 * @returns 생성된 게시글과 에러
 */
export async function createPost(title: string, content: string) {
  const supabase = createBrowserClient();

  // 현재 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { post: null, error: { message: '로그인이 필요합니다.' } };
  }

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      title,
      content,
      author_id: user.id,
    })
    .select()
    .single();

  return { post, error };
}

/**
 * 게시글 수정 (클라이언트 사이드)
 * @param id 게시글 ID
 * @param title 제목
 * @param content 내용
 * @returns 수정된 게시글과 에러
 */
export async function updatePost(id: string, title: string, content: string) {
  const supabase = createBrowserClient();

  const { data: post, error } = await supabase
    .from('posts')
    .update({
      title,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  return { post, error };
}

/**
 * 게시글 삭제 (클라이언트 사이드)
 * @param id 게시글 ID
 * @returns 에러
 */
export async function deletePost(id: string) {
  const supabase = createBrowserClient();

  const { error } = await supabase.from('posts').delete().eq('id', id);

  return { error };
}
