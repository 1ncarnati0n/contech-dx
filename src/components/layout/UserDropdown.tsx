'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  User,
  LogOut,
  Shield,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { getRoleBadgeColor, getRoleDisplayName } from '@/lib/permissions/client';
import type { Profile } from '@/lib/types';

interface UserDropdownProps {
  user: { email?: string };
  profile: Profile;
  isAdmin?: boolean;
}

export default function UserDropdown({ user, profile, isAdmin }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout failed', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 pl-1 pr-2 py-1.5 rounded-full transition-all group border ${isOpen
            ? 'bg-primary-100 border-primary-200 dark:bg-primary-800 dark:border-primary-700'
            : 'border-transparent hover:bg-primary-100 dark:hover:bg-primary-800 hover:border-primary-200 dark:hover:border-primary-700'
          }`}
      >
        {/* 등급 뱃지 */}
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getRoleBadgeColor(
            profile.role
          )}`}
        >
          {getRoleDisplayName(profile.role)}
        </span>

        {/* 사용자 이름 */}
        <span className="text-sm font-medium text-primary-600 dark:text-primary-300 group-hover:text-primary-900 dark:group-hover:text-primary-100 max-w-[120px] truncate">
          {profile.display_name || user.email?.split('@')[0]}
        </span>

        <ChevronDown className={`w-4 h-4 text-primary-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-background dark:bg-primary-900 rounded-xl shadow-lg border border-primary-200 dark:border-primary-700 py-2 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* 사용자 정보 헤더 */}
          <div className="px-4 py-3 border-b border-primary-100 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/50">
            <p className="text-sm font-bold text-primary-900 dark:text-white truncate">
              {profile.display_name || '사용자'}
            </p>
            <p className="text-xs text-primary-500 dark:text-primary-400 truncate mt-0.5 font-mono">
              {user.email}
            </p>
          </div>

          <div className="p-1 space-y-0.5">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg transition-colors"
            >
              <User className="w-4 h-4 text-primary-500" />
              프로필 설정
            </Link>

            {isAdmin && (
              <Link
                href="/admin/users"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-admin-700 dark:text-admin-400 hover:bg-admin-50 dark:hover:bg-admin-900/20 rounded-lg transition-colors"
              >
                <Shield className="w-4 h-4" />
                관리자 페이지
              </Link>
            )}
          </div>

          <div className="border-t border-primary-100 dark:border-primary-800 my-1 mx-1" />

          <div className="p-1">
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
