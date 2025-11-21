import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Building2, FileText, FileSearch, Shield, TestTube, User } from 'lucide-react';
import LogoutButton from '@/components/auth/LogoutButton';
import ThemeToggle from '@/components/layout/ThemeToggle';
import MobileMenu from '@/components/layout/MobileMenu';
import { getCurrentUserProfile, getRoleDisplayName, getRoleBadgeColor, isSystemAdmin } from '@/lib/permissions/server';

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 사용자 프로필 가져오기
  const profile = user ? await getCurrentUserProfile() : null;
  const isAdmin = profile ? isSystemAdmin(profile) : false;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-sm border-b border-slate-200 dark:border-slate-700 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Main Navigation */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <span className="hidden sm:inline">Contech DX</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/posts"
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <FileText className="w-4 h-4" />
                게시판
              </Link>
              <Link
                href="/file-search"
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg text-sm font-medium transition-all"
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
                    User Admin
                  </Link>
                  <Link
                    href="/test-connection"
                    className="flex items-center gap-2 text-cyan-700 hover:text-cyan-900 hover:bg-cyan-50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    <TestTube className="w-4 h-4" />
                    DB Checker
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Mobile Menu */}
            <MobileMenu user={user} profile={profile} isAdmin={isAdmin} />
            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center gap-3">
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
                  <span className="hidden lg:inline text-sm text-slate-600 dark:text-slate-400 max-w-[150px] truncate">
                    {user.email}
                  </span>

                  {/* 프로필 관리 링크 */}
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg text-sm font-medium transition-all"
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
                    className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-slate-700 dark:bg-slate-600 text-white hover:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
