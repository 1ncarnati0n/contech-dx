import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Building2, FileText, FileSearch, Shield, TestTube, User } from 'lucide-react';
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
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Main Navigation */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold text-slate-900 hover:text-slate-700 transition-colors"
            >
              <Building2 className="w-6 h-6 text-orange-600" />
              <span className="hidden sm:inline">Contech DX</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/posts"
                className="flex items-center gap-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <FileText className="w-4 h-4" />
                게시판
              </Link>
              <Link
                href="/file-search"
                className="flex items-center gap-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <FileSearch className="w-4 h-4" />
                파일검색
              </Link>

              {/* Admin 전용 메뉴 */}
              {profile && isSystemAdmin(profile) && (
                <>
                  <Link
                    href="/admin/users"
                    className="flex items-center gap-2 text-orange-700 hover:text-orange-900 hover:bg-orange-50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    <Shield className="w-4 h-4" />
                    회원 관리
                  </Link>
                  <Link
                    href="/test-connection"
                    className="flex items-center gap-2 text-cyan-700 hover:text-cyan-900 hover:bg-cyan-50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    <TestTube className="w-4 h-4" />
                    시스템 테스트
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {user && profile ? (
              <>
                {/* 회원 등급 뱃지 */}
                <span
                  className={`hidden sm:inline text-xs px-3 py-1 rounded-full border font-medium ${getRoleBadgeColor(
                    profile.role
                  )}`}
                >
                  {getRoleDisplayName(profile.role)}
                </span>

                {/* 이메일 */}
                <span className="hidden lg:inline text-sm text-slate-600 max-w-[150px] truncate">
                  {user.email}
                </span>

                {/* 프로필 관리 링크 */}
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">프로필</span>
                </Link>

                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="bg-slate-700 text-white hover:bg-slate-800 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all active:scale-95"
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
