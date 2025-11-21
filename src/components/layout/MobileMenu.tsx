'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, FileText, FileSearch, Shield, TestTube, User, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Profile } from '@/lib/types';

interface MobileMenuProps {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  isAdmin: boolean;
}

export default function MobileMenu({ user, profile, isAdmin }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
    setIsOpen(false);
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* 햄버거 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        aria-label="메뉴 열기"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* 모바일 메뉴 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* 모바일 메뉴 사이드바 */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">메뉴</h2>
            <button
              onClick={closeMenu}
              className="p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              aria-label="메뉴 닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 메뉴 아이템들 */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {/* 메인 메뉴 */}
              <Link
                href="/posts"
                onClick={closeMenu}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">게시판</span>
              </Link>

              <Link
                href="/file-search"
                onClick={closeMenu}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <FileSearch className="w-5 h-5" />
                <span className="font-medium">파일검색</span>
              </Link>

              {/* 관리자 메뉴 */}
              {isAdmin && (
                <>
                  <div className="pt-4 pb-2">
                    <p className="px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      관리자 메뉴
                    </p>
                  </div>

                  <Link
                    href="/admin/users"
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
                  >
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">User Admin</span>
                  </Link>

                  <Link
                    href="/test-connection"
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all"
                  >
                    <TestTube className="w-5 h-5" />
                    <span className="font-medium">DB Checker</span>
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* 하단 사용자 정보 */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4">
            {user && profile ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {profile.display_name || user.email}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {user.email} • {profile.role}
                    </p>
                  </div>
                </div>

                <Link
                  href="/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">프로필</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">로그아웃</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="block w-full text-center px-4 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-medium"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  onClick={closeMenu}
                  className="block w-full text-center px-4 py-2 rounded-lg bg-slate-700 dark:bg-slate-600 text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-all font-medium"
                >
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
