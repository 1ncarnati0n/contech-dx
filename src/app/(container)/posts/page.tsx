import { createClient } from '@/lib/supabase/server';
import { getPosts } from '@/lib/services/posts.server';
import Link from 'next/link';
import {
  PenSquare,
  FileText,
  AlertCircle,
  FileWarning,
  Search,
} from 'lucide-react';
import { Card, CardContent, Button } from '@/components/ui';
import PostsList from '@/components/posts/PostsList';

export default async function PostsPage() {
  // 서비스 레이어를 통해 게시글 목록 가져오기
  const { posts, error } = await getPosts(20);

  // 현재 사용자 확인
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Error fetching posts:', error);
    return (
      <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <CardContent className="p-8">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-red-800 dark:text-red-200 font-bold text-lg mb-2">
                데이터 조회 오류
              </h2>
              <p className="text-red-600 dark:text-red-400 mb-4">
                게시글을 불러오는 중 오류가 발생했습니다.
              </p>
            </div>
          </div>
          <details className="text-sm text-red-700 dark:text-red-300">
            <summary className="cursor-pointer font-semibold hover:text-red-800 dark:hover:text-red-200">
              에러 상세 정보
            </summary>
            <pre className="mt-2 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg overflow-auto text-xs">
              {JSON.stringify(error, null, 2)}
            </pre>
          </details>
          <div className="mt-6 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-red-200 dark:border-red-800">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">해결 방법:</p>
            <ol className="list-decimal ml-5 space-y-2 text-zinc-700 dark:text-zinc-300 text-sm">
              <li>Supabase 프로젝트가 생성되었는지 확인</li>
              <li>.env.local 파일의 SUPABASE_URL과 ANON_KEY 확인</li>
              <li>schema.sql을 Supabase SQL Editor에서 실행했는지 확인</li>
              <li>서버를 재시작 (npm run dev)</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
            <FileText className="w-8 h-8 text-zinc-700 dark:text-zinc-300" />
            게시판
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            팀원들과 정보를 공유하고 소통하세요
          </p>
        </div>
        {user ? (
          <Button variant="primary" size="md" asChild>
            <Link href="/posts/new" className="flex items-center gap-2">
              <PenSquare className="w-4 h-4" />
              글쓰기
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="md" asChild>
            <Link href="/login">로그인 후 글쓰기</Link>
          </Button>
        )}
      </div>

      {/* 검색/필터 영역 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="게시글 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-sm"
          />
        </div>

        <select
          className="px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        >
          <option>최신순</option>
          <option>오래된 순</option>
        </select>
      </div>

      {/* Posts List */}
      {!posts || posts.length === 0 ? (
        <Card className="text-center">
          <CardContent className="py-16">
            <FileWarning className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              아직 게시글이 없습니다
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              첫 번째 게시글을 작성해보세요!
            </p>
            {user && (
              <Button variant="primary" size="lg" asChild>
                <Link href="/posts/new" className="flex items-center gap-2">
                  <PenSquare className="w-4 h-4" />
                  글 작성하기
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <PostsList posts={posts} />
      )}
    </div>
  );
}
