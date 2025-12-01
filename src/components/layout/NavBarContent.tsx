'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, FileSearch, FolderKanban } from 'lucide-react';
import ThemeToggle from '@/components/layout/ThemeToggle';
import MobileMenu from '@/components/layout/MobileMenu';
import UserDropdown from '@/components/layout/UserDropdown';
import AdminDropdown from '@/components/layout/AdminDropdown';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types';

interface NavBarContentProps {
    user: User | null;
    profile: Profile | null;
    isAdmin: boolean;
}

export default function NavBarContent({ user, profile, isAdmin }: NavBarContentProps) {
    const pathname = usePathname();
    // Hide main navigation on Landing, Login, and Signup pages
    const isMinimalNav = pathname === '/' || pathname === '/login' || pathname === '/signup';

    return (
        <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg shadow-sm border-b border-zinc-200 dark:border-zinc-800 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo & Main Navigation */}
                    <div className="flex items-center gap-8">
                        <Link
                            href={user ? '/home' : '/'}
                            className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-white hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                        >
                            <span className="hidden sm:inline">Contech DX</span>
                        </Link>

                        {!isMinimalNav && (
                            <div className="hidden md:flex items-center gap-1">
                                <Link
                                    href="/posts"
                                    className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                                >
                                    <FileText className="w-4 h-4" />
                                    게시판
                                </Link>
                                <Link
                                    href="/file-search"
                                    className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                                >
                                    <FileSearch className="w-4 h-4" />
                                    파일검색
                                </Link>
                                <Link
                                    href="/projects"
                                    className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                                >
                                    <FolderKanban className="w-4 h-4" />
                                    프로젝트
                                </Link>

                                {/* Admin 전용 메뉴 */}
                                {profile && isAdmin && (
                                    <AdminDropdown />
                                )}
                            </div>
                        )}
                    </div>

                    {/* User Menu */}
                    <div className="flex items-center gap-3">
                        {/* Theme Toggle */}
                        <ThemeToggle />

                        {/* Mobile Menu */}
                        {!isMinimalNav && (
                            <MobileMenu user={user} profile={profile} isAdmin={isAdmin} />
                        )}

                        {/* Desktop User Menu */}
                        <div className="hidden md:flex items-center gap-3">
                            {user && profile ? (
                                <UserDropdown user={user} profile={profile} isAdmin={isAdmin} />
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                                    >
                                        로그인
                                    </Link>
                                    <Link
                                        href="/signup"
                                        className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-zinc-200 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all active:scale-95"
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
