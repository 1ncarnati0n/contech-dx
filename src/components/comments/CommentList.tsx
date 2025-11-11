import { createClient } from '@/lib/supabase/server';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import DeleteCommentButton from './DeleteCommentButton';

interface CommentListProps {
  postId: string;
}

export default async function CommentList({ postId }: CommentListProps) {
  const supabase = await createClient();

  // 현재 사용자 가져오기
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 댓글 가져오기
  const { data: comments } = await supabase
    .from('comments')
    .select(
      `
      *,
      author:profiles(email)
    `
    )
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (!comments || comments.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        아직 댓글이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-medium">{comment.author?.email}</span>
              <span className="text-sm text-gray-500 ml-2">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
            </div>
            {user?.id === comment.author_id && (
              <DeleteCommentButton commentId={comment.id} />
            )}
          </div>
          <p className="whitespace-pre-wrap">{comment.content}</p>
        </div>
      ))}
    </div>
  );
}
