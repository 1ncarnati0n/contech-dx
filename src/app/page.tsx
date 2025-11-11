import Link from 'next/link';

export default function Home() {
  return (
    <div className="text-center py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Contech DX 게시판 테스트
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Next.js 16 + Supabase Auth를 활용한 게시판 시스템
      </p>
      <div className="flex justify-center gap-4">
        <Link
          href="/posts"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          게시판 보기
        </Link>
        <Link
          href="/signup"
          className="bg-gray-200 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition"
        >
          회원가입
        </Link>
      </div>

      <div className="mt-12 bg-white rounded-lg shadow-sm p-6 max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">시작하기</h2>
        <ol className="text-left space-y-2 text-gray-700">
          <li>1. Supabase 프로젝트 생성</li>
          <li>2. SQL Editor에서 schema.sql 실행</li>
          <li>3. .env.local 파일에 Supabase URL과 Key 설정</li>
          <li>4. 서버 재시작 후 회원가입/로그인 테스트</li>
        </ol>
      </div>
    </div>
  );
}
