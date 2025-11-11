import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import LogoutButton from '@/components/auth/LogoutButton';
import { getCurrentUserProfile, getRoleDisplayName, getRoleBadgeColor, isSystemAdmin } from '@/lib/permissions';

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 사용자 프로필 가져오기
  const profile = user ? await getCurrentUserProfile() : null;

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Contech DX
            </Link>
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                href="/posts"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                게시판
              </Link>

              {/* Admin 전용 메뉴 */}
              {profile && isSystemAdmin(profile) && (
                <>
                  <Link
                    href="/admin/users"
                    className="text-purple-700 hover:text-purple-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    회원 관리
                  </Link>
                  <Link
                    href="/test-connection"
                    className="text-purple-700 hover:text-purple-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    시스템 테스트
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user && profile ? (
              <>
                {/* 회원 등급 뱃지 */}
                <span
                  className={`text-xs px-2 py-1 rounded-full border font-medium ${getRoleBadgeColor(
                    profile.role
                  )}`}
                >
                  {getRoleDisplayName(profile.role)}
                </span>

                {/* 이메일 */}
                <span className="text-sm text-gray-600">{user.email}</span>

                {/* 프로필 관리 링크 */}
                <Link
                  href="/profile"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  내 프로필
                </Link>

                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
