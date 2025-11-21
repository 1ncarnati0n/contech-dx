import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function TestConnectionPage() {
  // Admin만 접근 가능
  const profile = await getCurrentUserProfile();
  if (!profile || !isSystemAdmin(profile)) {
    redirect('/');
  }

  const supabase = await createClient();

  // 환경변수 확인 (보안상 일부만 표시)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const anonKeyPrefix = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(
    0,
    20
  );

  // 연결 테스트
  let connectionTest = {
    success: false,
    message: '',
    error: null as any,
  };

  try {
    const { data, error } = await supabase.from('posts').select('count');

    if (error) {
      connectionTest = {
        success: false,
        message: 'Supabase 연결 실패',
        error: error,
      };
    } else {
      connectionTest = {
        success: true,
        message: 'Supabase 연결 성공!',
        error: null,
      };
    }
  } catch (err: any) {
    connectionTest = {
      success: false,
      message: '연결 시도 중 에러 발생',
      error: err,
    };
  }

  // 테이블 존재 확인
  const tableTests = [];

  // posts 테이블 확인
  const { error: postsError } = await supabase
    .from('posts')
    .select('id')
    .limit(1);
  tableTests.push({
    name: 'posts',
    exists: !postsError,
    error: postsError,
  });

  // comments 테이블 확인
  const { error: commentsError } = await supabase
    .from('comments')
    .select('id')
    .limit(1);
  tableTests.push({
    name: 'comments',
    exists: !commentsError,
    error: commentsError,
  });

  // profiles 테이블 확인
  const { error: profilesError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);
  tableTests.push({
    name: 'profiles',
    exists: !profilesError,
    error: profilesError,
  });

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Supabase 연결 테스트</h1>

      {/* 환경변수 확인 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">환경변수 상태</h2>
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="font-medium w-48">SUPABASE_URL:</span>
            <span className="text-gray-700">{supabaseUrl || '❌ 없음'}</span>
          </div>
          <div className="flex items-center">
            <span className="font-medium w-48">SUPABASE_ANON_KEY:</span>
            <span className="text-gray-700">
              {hasAnonKey ? `✅ 설정됨 (${anonKeyPrefix}...)` : '❌ 없음'}
            </span>
          </div>
        </div>
      </div>

      {/* 연결 테스트 결과 */}
      <div
        className={`rounded-lg shadow-md p-6 mb-6 ${
          connectionTest.success
            ? 'bg-green-50 border-2 border-green-200'
            : 'bg-red-50 border-2 border-red-200'
        }`}
      >
        <h2 className="text-xl font-semibold mb-4">
          {connectionTest.success ? '✅ 연결 상태' : '❌ 연결 상태'}
        </h2>
        <p
          className={`text-lg mb-2 ${
            connectionTest.success ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {connectionTest.message}
        </p>
        {connectionTest.error && (
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold text-sm">
              에러 상세 정보
            </summary>
            <pre className="mt-2 bg-gray-100 p-3 rounded text-xs overflow-auto">
              {JSON.stringify(connectionTest.error, null, 2)}
            </pre>
          </details>
        )}
      </div>

      {/* 테이블 존재 확인 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">데이터베이스 테이블</h2>
        <div className="space-y-3">
          {tableTests.map((test) => (
            <div
              key={test.name}
              className={`p-4 rounded-lg ${
                test.exists ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {test.exists ? '✅' : '❌'} {test.name} 테이블
                </span>
                <span className="text-sm text-gray-600">
                  {test.exists ? '존재함' : '존재하지 않음'}
                </span>
              </div>
              {!test.exists && test.error && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-red-600">
                    에러 보기
                  </summary>
                  <pre className="mt-2 bg-red-100 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(test.error, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 해결 방법 안내 */}
      {!connectionTest.success && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">해결 방법</h2>
          <ol className="list-decimal ml-5 space-y-2">
            <li>
              Supabase Dashboard (
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                className="text-blue-600 hover:underline"
              >
                supabase.com/dashboard
              </a>
              )에 접속
            </li>
            <li>
              프로젝트 선택 → Project Settings → API 탭에서 URL과 anon key
              복사
            </li>
            <li>.env.local 파일에 올바른 값 입력 (따옴표 없이)</li>
            <li>
              SQL Editor에서 schema.sql 실행 (테이블이 없는 경우)
            </li>
            <li>개발 서버 재시작 (npm run dev)</li>
          </ol>
        </div>
      )}

      {connectionTest.success &&
        tableTests.some((t) => !t.exists) && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">
              ⚠️ 테이블 생성 필요
            </h2>
            <p className="mb-4">
              Supabase 연결은 성공했지만 일부 테이블이 존재하지 않습니다.
            </p>
            <ol className="list-decimal ml-5 space-y-2">
              <li>Supabase Dashboard → SQL Editor 접속</li>
              <li>프로젝트의 schema.sql 파일 내용 복사</li>
              <li>SQL Editor에 붙여넣고 Run 실행</li>
              <li>이 페이지 새로고침하여 재확인</li>
            </ol>
          </div>
        )}

      {connectionTest.success &&
        tableTests.every((t) => t.exists) && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mt-6 text-center">
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              🎉 모든 설정 완료!
            </h2>
            <p className="text-green-600 mb-4">
              Supabase 연결과 데이터베이스가 정상적으로 설정되었습니다.
            </p>
            <Link
              href="/posts"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              게시판으로 이동
            </Link>
          </div>
        )}
    </div>
  );
}
