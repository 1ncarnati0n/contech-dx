import { createClient } from '@/lib/supabase/server';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MessageSquare } from 'lucide-react';
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
      <div className="text-center py-12">
        <MessageSquare className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-500 dark:text-zinc-400">아직 댓글이 없습니다.</p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
          첫 번째 댓글을 남겨보세요!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* 댓글 수 표시 */}
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        <MessageSquare className="w-4 h-4" />
        <span>{comments.length}개의 댓글</span>
      </div>

      <div className="space-y-4">
        {comments.map((comment) => {
          const authorInitial = comment.author?.email?.[0]?.toUpperCase() || 'A';

          return (
            <div key={comment.id} className="group flex gap-4">
              {/* 아바타 */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  {authorInitial}
                </div>
              </div>

              {/* 내용 */}
              <div className="flex-1 min-w-0">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                        {comment.author?.email}
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </span>
                    </div>

                    {user?.id === comment.author_id && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <DeleteCommentButton commentId={comment.id} />
                      </div>
                    )}
                  </div>

                  <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap text-sm leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
