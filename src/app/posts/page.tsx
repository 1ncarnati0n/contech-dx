import { createClient } from '@/lib/supabase/server';
import type { Post } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';

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
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-red-800 font-bold mb-2">데이터 조회 오류</h2>
        <p className="text-red-600 mb-4">게시글을 불러오는 중 오류가 발생했습니다.</p>
        <details className="text-sm text-red-700">
          <summary className="cursor-pointer font-semibold">에러 상세 정보</summary>
          <pre className="mt-2 bg-red-100 p-2 rounded overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        </details>
        <div className="mt-4 text-sm text-gray-700">
          <p className="font-semibold">해결 방법:</p>
          <ol className="list-decimal ml-5 mt-2 space-y-1">
            <li>Supabase 프로젝트가 생성되었는지 확인</li>
            <li>.env.local 파일의 SUPABASE_URL과 ANON_KEY 확인</li>
            <li>schema.sql을 Supabase SQL Editor에서 실행했는지 확인</li>
            <li>서버를 재시작 (npm run dev)</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">게시판</h1>
        {user ? (
          <Link
            href="/posts/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            글쓰기
          </Link>
        ) : (
          <Link
            href="/login"
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            로그인 후 글쓰기
          </Link>
        )}
      </div>

      {!posts || posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500">아직 게시글이 없습니다.</p>
          <p className="text-sm text-gray-400 mt-2">
            첫 번째 게시글을 작성해보세요!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post: Post & { author: { email: string } | null }) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition"
            >
              <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
              <p className="text-gray-600 mb-4 line-clamp-2">{post.content}</p>
              <div className="flex items-center text-sm text-gray-500">
                <span>{post.author?.email || '익명'}</span>
                <span className="mx-2">·</span>
                <span>
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
