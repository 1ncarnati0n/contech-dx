import { createClient } from '@/lib/supabase/server';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Edit, Share2, Bookmark } from 'lucide-react';
import CommentList from '@/components/comments/CommentList';
import CommentForm from '@/components/comments/CommentForm';
import DeletePostButton from '@/components/posts/DeletePostButton';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button, Badge } from '@/components/ui';

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

  // 작성자 이니셜
  const authorInitial = post.author?.email?.[0]?.toUpperCase() || 'A';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* 뒤로가기 */}
      <Link
        href={`/posts#post-${post.id}`}
        className="inline-flex items-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        목록으로
      </Link>

      {/* 메인 카드 */}
      <Card className="overflow-hidden mb-6">
        {/* 게시글 헤더 */}
        <div className="p-6 sm:p-8 border-b border-zinc-100 dark:border-zinc-800">
          {/* 배지 + 액션 버튼 */}
          <div className="flex items-start justify-between mb-4">
            <Badge variant="secondary">일반</Badge>

            {isAuthor && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/posts/${post.id}/edit`} className="gap-2">
                    <Edit className="w-4 h-4" />
                    수정
                  </Link>
                </Button>
                <DeletePostButton postId={post.id} />
              </div>
            )}
          </div>

          {/* 제목 */}
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
            {post.title}
          </h1>

          {/* 작성자 정보 영역 */}
          <div className="flex items-center gap-4">
            {/* 아바타 */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-semibold text-lg shadow-md">
              {authorInitial}
            </div>

            <div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                {post.author?.email || '익명'}
              </div>
              <div className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <CardContent className="p-6 sm:p-8">
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <MarkdownRenderer content={post.content} />
          </div>
        </CardContent>

        {/* 하단 액션 바 */}
        <div className="px-6 sm:px-8 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-2">
              <Share2 className="w-4 h-4" />
              공유
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Bookmark className="w-4 h-4" />
              북마크
            </Button>
          </div>
        </div>
      </Card>

      {/* 댓글 섹션 */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
            댓글
          </h2>

          {user ? (
            <div className="mb-8">
              <CommentForm postId={post.id} />
            </div>
          ) : (
            <div className="mb-8 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-center border border-zinc-100 dark:border-zinc-800">
              <p className="text-zinc-600 dark:text-zinc-400">
                <Link
                  href="/login"
                  className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
                >
                  로그인
                </Link>
                하여 댓글을 작성하세요.
              </p>
            </div>
          )}

          <CommentList postId={post.id} />
        </CardContent>
      </Card>
    </div>
  );
}
