import { createComment } from '../repository/comments.client';

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
