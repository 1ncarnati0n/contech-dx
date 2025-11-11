import { createClient } from '@/lib/supabase/server';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import CommentList from '@/components/comments/CommentList';
import CommentForm from '@/components/comments/CommentForm';
import DeletePostButton from '@/components/posts/DeletePostButton';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PostDetailPage({ params }: PageProps) {
  const supabase = await createClient();
  const { id } = await params;

  // 게시글 가져오기
  const { data: post, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles(email)
    `
    )
    .eq('id', id)
    .single();

  if (error || !post) {
    notFound();
  }

  // 현재 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthor = user?.id === post.author_id;

  return (
    <div className="max-w-4xl mx-auto">
      {/* 게시글 내용 */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <span>{post.author?.email || '익명'}</span>
              <span className="mx-2">·</span>
              <span>
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
            </div>
            {isAuthor && (
              <div className="flex gap-2">
                <Link
                  href={`/posts/${post.id}/edit`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  수정
                </Link>
                <DeletePostButton postId={post.id} />
              </div>
            )}
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap">{post.content}</p>
        </div>
      </div>

      {/* 댓글 섹션 */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6">댓글</h2>

        {user ? (
          <div className="mb-8">
            <CommentForm postId={post.id} />
          </div>
        ) : (
          <div className="mb-8 p-4 bg-gray-50 rounded-md text-center">
            <p className="text-gray-600">
              <Link href="/login" className="text-blue-600 hover:text-blue-800">
                로그인
              </Link>
              하여 댓글을 작성하세요.
            </p>
          </div>
        )}

        <CommentList postId={post.id} />
      </div>

      <div className="mt-6">
        <Link
          href="/posts"
          className="text-blue-600 hover:text-blue-800 inline-flex items-center"
        >
          ← 목록으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
