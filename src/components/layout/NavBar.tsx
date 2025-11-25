import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FileText, FileSearch, GanttChart, FolderKanban } from 'lucide-react';
import ThemeToggle from '@/components/layout/ThemeToggle';
import MobileMenu from '@/components/layout/MobileMenu';
import UserDropdown from '@/components/layout/UserDropdown';
import AdminDropdown from '@/components/layout/AdminDropdown';
import { getCurrentUserProfile, isSystemAdmin } from '@/lib/permissions/server';

export default async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 사용자 프로필 가져오기
  const profile = user ? await getCurrentUserProfile() : null;
  const isAdmin = profile ? isSystemAdmin(profile) : false;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-black/90 backdrop-blur-lg shadow-sm border-b border-primary-200 dark:border-primary-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Main Navigation */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold text-primary-900 dark:text-white hover:text-primary-700 dark:hover:text-primary-200 transition-colors"
            >
              <span className="hidden sm:inline">Contech DX</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/posts"
                className="flex items-center gap-2 text-primary-600 dark:text-primary-300 hover:text-primary-900 dark:hover:text-white hover:bg-primary-50 dark:hover:bg-primary-800/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <FileText className="w-4 h-4" />
                게시판
              </Link>
              <Link
                href="/file-search"
                className="flex items-center gap-2 text-primary-600 dark:text-primary-300 hover:text-primary-900 dark:hover:text-white hover:bg-primary-50 dark:hover:bg-primary-800/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <FileSearch className="w-4 h-4" />
                파일검색
              </Link>
              <Link
                href="/projects"
                className="flex items-center gap-2 text-primary-600 dark:text-primary-300 hover:text-primary-900 dark:hover:text-white hover:bg-primary-50 dark:hover:bg-primary-800/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <FolderKanban className="w-4 h-4" />
                프로젝트
              </Link>
              <Link
                href="/gantt-test"
                className="flex items-center gap-2 text-primary-600 dark:text-primary-300 hover:text-primary-900 dark:hover:text-white hover:bg-primary-50 dark:hover:bg-primary-800/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <GanttChart className="w-4 h-4" />
                Gantt 차트
              </Link>

              {/* Admin 전용 메뉴 */}
              {profile && isSystemAdmin(profile) && (
                <AdminDropdown />
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
                <UserDropdown user={user} profile={profile} isAdmin={isAdmin} />
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-primary-600 dark:text-primary-300 hover:text-primary-900 dark:hover:text-white hover:bg-primary-50 dark:hover:bg-primary-800/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-primary-900 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-primary-200 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all active:scale-95"
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
