import { createClient } from '@/shared/lib/supabase/server';
import { getRoleDisplayName, getRoleBadgeVariant } from '@/shared/lib/permissions/server';
import { Badge } from '@/shared/components/ui/Badge';
import { requireAuth } from '@/shared/lib/auth/requireAuth';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';
import ProfileEditForm from '@/features/profile/view/ProfileEditForm';

export default async function ProfilePage() {
  // 인증 체크 - 비로그인 시 랜딩 페이지로 리다이렉트
  const { user, profile } = await requireAuth();

  const supabase = await createClient();

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

  // 표시 이름: DB에 가입 시 이름이 자동 저장됨
  const displayName = profile.display_name || '이름 없음';

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 왼쪽: 프로필 정보 카드 */}
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 border border-slate-200 dark:border-zinc-800">
            {/* 프로필 이미지 */}
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {displayName !== '이름 없음'
                  ? displayName.charAt(0).toUpperCase()
                  : profile.email.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* 기본 정보 */}
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold mb-1 text-slate-900 dark:text-white">
                {displayName}
              </h2>
              {(profile.position || profile.affiliation || profile.department) && (
                <p className="text-sm text-slate-500 dark:text-gray-400 mb-1">
                  {[profile.affiliation, profile.department, profile.position].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="text-sm text-slate-600 dark:text-primary-400 mb-2">{profile.email}</p>
              <Badge variant={getRoleBadgeVariant(profile.role)} className="text-xs">
                {getRoleDisplayName(profile.role)}
              </Badge>
            </div>

            {/* 통계 */}
            <div className="border-t border-slate-200 dark:border-zinc-800 pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-primary-400">게시글</span>
                <span className="text-lg font-semibold text-slate-900 dark:text-white">{postCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-primary-400">댓글</span>
                <span className="text-lg font-semibold text-slate-900 dark:text-white">{commentCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-primary-400">가입일</span>
                <span className="text-sm font-medium text-slate-700 dark:text-primary-300">
                  {formatDistanceToNow(new Date(profile.created_at), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <p className="text-sm text-slate-600 dark:text-primary-400 italic">{profile.bio}</p>
              </div>
            )}
          </div>

          {/* 계정 정보 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm">계정 정보</h3>
            <div className="space-y-2 text-xs text-blue-800 dark:text-blue-200">
              <div>
                <span className="font-medium">User ID:</span>
                <p className="break-all mt-1 opacity-80">{profile.id}</p>
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
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 border border-slate-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">프로필 편집</h2>
            <ProfileEditForm profile={profile} />
          </div>
        </div>
      </div>

      {/* 내가 작성한 게시글 링크 */}
      <div className="mt-6 bg-white dark:bg-primary-900/50 rounded-lg shadow-md p-6 border border-slate-200 dark:border-zinc-800">
        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">빠른 링크</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/posts"
            className="flex items-center justify-between p-4 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-slate-50 dark:hover:bg-primary-800 transition"
          >
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">내가 작성한 게시글</h3>
              <p className="text-sm text-slate-600 dark:text-primary-400">게시판으로 이동</p>
            </div>
            <svg
              className="w-5 h-5 text-slate-400 dark:text-primary-500"
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
            className="flex items-center justify-between p-4 border border-slate-200 dark:border-zinc-700 rounded-lg hover:bg-slate-50 dark:hover:bg-primary-800 transition"
          >
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">새 글 작성</h3>
              <p className="text-sm text-slate-600 dark:text-primary-400">게시글 작성하기</p>
            </div>
            <svg
              className="w-5 h-5 text-slate-400 dark:text-primary-500"
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
