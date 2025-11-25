import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

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
