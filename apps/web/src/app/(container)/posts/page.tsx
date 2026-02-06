import { getPosts } from '@/lib/services/posts.server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { logger } from '@/lib/utils/logger';
import Link from 'next/link';
import {
  PenSquare,
  FileText,
  FileWarning,
} from 'lucide-react';
import { Card, CardContent, Button } from '@/components/ui';
import PostsTable from '@/components/posts/PostsTable';

export default async function PostsPage() {
  // 인증 체크 - 비로그인 시 랜딩 페이지로 리다이렉트
  const { user } = await requireAuth();

  // 서비스 레이어를 통해 게시글 목록 가져오기
  const { posts, error } = await getPosts(20);

  if (error) {
    logger.error('Error fetching posts:', error);
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8 text-center">
            <h2 className="text-red-800 font-bold mb-2 text-lg">데이터 조회 오류</h2>
            <p className="text-red-600 mb-4">게시글을 불러오는 중 오류가 발생했습니다.</p>
            <pre className="text-xs bg-red-100 p-4 rounded-lg overflow-auto text-left inline-block max-w-full">
              {JSON.stringify(error, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
            <FileText className="w-6 h-6 text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">게시판</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">팀원들과 정보를 공유하고 소통하세요</p>
          </div>
        </div>
        <Button variant="primary" size="md" asChild>
          <Link href="/posts/new" className="flex items-center gap-2">
            <PenSquare className="w-4 h-4" />
            글쓰기
          </Link>
        </Button>
      </div>

      {/* Posts Table */}
      {!posts || posts.length === 0 ? (
        <Card className="overflow-hidden border-0 shadow-md">
          <CardContent className="py-16 text-center">
            <FileWarning className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              아직 게시글이 없습니다
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              첫 번째 게시글을 작성해보세요!
            </p>
            <Button variant="primary" size="lg" asChild>
              <Link href="/posts/new" className="flex items-center gap-2">
                <PenSquare className="w-4 h-4" />
                글 작성하기
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <PostsTable posts={posts} />
      )}
    </div>
  );
}
