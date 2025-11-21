import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, getRoleDisplayName, getRoleBadgeColor } from '@/lib/permissions/server';
import { redirect } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';
import ProfileEditForm from '@/components/profile/ProfileEditForm';

export default async function ProfilePage() {
  const profile = await getCurrentUserProfile();

  // 로그인 확인
  if (!profile) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 사용자가 작성한 게시글 수
  const { count: postCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', profile.id);

  // 사용자가 작성한 댓글 수
  const { count: commentCount } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', profile.id);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">내 프로필</h1>
        <p className="text-gray-600">계정 정보를 관리합니다</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 왼쪽: 프로필 정보 카드 */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* 프로필 이미지 */}
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
                {profile.display_name
                  ? profile.display_name.charAt(0).toUpperCase()
                  : profile.email.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* 기본 정보 */}
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold mb-1">
                {profile.display_name || '이름 없음'}
              </h2>
              <p className="text-sm text-gray-600 mb-2">{profile.email}</p>
              <span
                className={`inline-flex text-xs px-3 py-1 rounded-full border font-medium ${getRoleBadgeColor(
                  profile.role
                )}`}
              >
                {getRoleDisplayName(profile.role)}
              </span>
            </div>

            {/* 통계 */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">게시글</span>
                <span className="text-lg font-semibold text-gray-900">{postCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">댓글</span>
                <span className="text-lg font-semibold text-gray-900">{commentCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">가입일</span>
                <span className="text-sm font-medium text-gray-700">
                  {formatDistanceToNow(new Date(profile.created_at), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 italic">{profile.bio}</p>
              </div>
            )}
          </div>

          {/* 계정 정보 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm">계정 정보</h3>
            <div className="space-y-2 text-xs text-blue-800">
              <div>
                <span className="font-medium">User ID:</span>
                <p className="break-all mt-1">{profile.id}</p>
              </div>
              <div>
                <span className="font-medium">이메일 인증:</span>
                <span className="ml-2">
                  {user?.email_confirmed_at ? '✅ 인증됨' : '⚠️ 미인증'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 프로필 편집 폼 */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-6">프로필 편집</h2>
            <ProfileEditForm profile={profile} />
          </div>
        </div>
      </div>

      {/* 내가 작성한 게시글 링크 */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">빠른 링크</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/posts"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <div>
              <h3 className="font-medium text-gray-900">내가 작성한 게시글</h3>
              <p className="text-sm text-gray-600">게시판으로 이동</p>
            </div>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
          <Link
            href="/posts/new"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <div>
              <h3 className="font-medium text-gray-900">새 글 작성</h3>
              <p className="text-sm text-gray-600">게시글 작성하기</p>
            </div>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
