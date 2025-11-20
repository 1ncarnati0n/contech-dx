import { createClient } from '@/lib/supabase/server';
import type { Post } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';
import {
  PenSquare,
  FileText,
  User,
  Clock,
  AlertCircle,
  FileWarning,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export default async function PostsPage() {
  const supabase = await createClient();

  // 게시글 목록 가져오기
  const { data: posts, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:profiles(email)
    `
    )
    .order('created_at', { ascending: false })
    .limit(20);

  // 현재 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Error fetching posts:', error);
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-8">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-red-800 font-bold text-lg mb-2">데이터 조회 오류</h2>
              <p className="text-red-600 mb-4">게시글을 불러오는 중 오류가 발생했습니다.</p>
            </div>
          </div>
          <details className="text-sm text-red-700">
            <summary className="cursor-pointer font-semibold hover:text-red-800">
              에러 상세 정보
            </summary>
            <pre className="mt-2 bg-red-100 p-3 rounded-lg overflow-auto text-xs">
              {JSON.stringify(error, null, 2)}
            </pre>
          </details>
          <div className="mt-6 p-4 bg-white rounded-lg border border-red-200">
            <p className="font-semibold text-slate-900 mb-2">해결 방법:</p>
            <ol className="list-decimal ml-5 space-y-2 text-slate-700 text-sm">
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
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-slate-700" />
            게시판
          </h1>
          <p className="text-slate-600 mt-2">팀원들과 정보를 공유하고 소통하세요</p>
        </div>
        {user ? (
          <Link
            href="/posts/new"
            className="inline-flex items-center justify-center gap-2 bg-slate-700 text-white px-5 py-2.5 rounded-lg hover:bg-slate-800 font-medium shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <PenSquare className="w-4 h-4" />
            글쓰기
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg hover:bg-slate-300 font-medium transition-all"
          >
            로그인 후 글쓰기
          </Link>
        )}
      </div>

      {/* Posts List */}
      {!posts || posts.length === 0 ? (
        <Card className="text-center">
          <CardContent className="py-16">
            <FileWarning className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              아직 게시글이 없습니다
            </h3>
            <p className="text-slate-600 mb-6">첫 번째 게시글을 작성해보세요!</p>
            {user && (
              <Link
                href="/posts/new"
                className="inline-flex items-center gap-2 bg-slate-700 text-white px-6 py-3 rounded-lg hover:bg-slate-800 font-medium shadow-sm hover:shadow-md transition-all"
              >
                <PenSquare className="w-4 h-4" />
                글 작성하기
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post: Post & { author: { email: string } | null }) => (
            <Link key={post.id} href={`/posts/${post.id}`}>
              <Card hover className="group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h2 className="text-xl font-semibold text-slate-900 group-hover:text-slate-700 transition-colors line-clamp-1">
                      {post.title}
                    </h2>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                  <p className="text-slate-600 mb-4 line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      <span>{post.author?.email || '익명'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>
                        {formatDistanceToNow(new Date(post.created_at), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
