import { createPost, updatePost } from '../repository/posts.client';

export type PostSubmitResult =
  | { success: true; postId: string }
  | { success: false; error: string };

export async function submitPost(
  mode: 'create' | 'edit',
  title: string,
  content: string,
  existingPostId?: string,
): Promise<PostSubmitResult> {
  try {
    if (mode === 'create') {
      const { data, error } = await createPost(title, content);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, postId: data!.id };
    } else {
      const { error } = await updatePost(existingPostId!, title, content);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, postId: existingPostId! };
    }
  } catch {
    return { success: false, error: '게시글 저장 중 오류가 발생했습니다.' };
  }
}
