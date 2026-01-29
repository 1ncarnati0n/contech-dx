'use client';

import Link from 'next/link';
import { User, LogOut, UserPlus, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Profile } from '@/lib/types';

interface UserSectionProps {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  onLogout: () => void;
  onClose: () => void;
}

export default function UserSection({ user, profile, onLogout, onClose }: UserSectionProps) {
  if (user && profile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        {/* 사용자 프로필 카드 */}
        <div className="flex items-center gap-3 px-3 py-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 dark:from-accent-500 dark:to-accent-700 flex items-center justify-center flex-shrink-0 shadow-sm">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
              {profile.display_name || user.email}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate capitalize">
              {profile.role}
            </p>
          </div>
        </div>

        {/* 프로필 링크 */}
        <Link
          href="/profile"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg
            text-zinc-700 dark:text-zinc-300
            hover:bg-zinc-100 dark:hover:bg-zinc-800
            transition-all group"
        >
          <User className="w-5 h-5 group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors" />
          <span className="font-medium">프로필</span>
        </Link>

        {/* 로그아웃 버튼 */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
            text-red-600 dark:text-red-400
            hover:bg-red-50 dark:hover:bg-red-900/20
            transition-all group"
        >
          <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          <span className="font-medium">로그아웃</span>
        </button>
      </motion.div>
    );
  }

  // 비로그인 상태
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-2"
    >
      <Link
        href="/login"
        onClick={onClose}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg
          text-zinc-700 dark:text-zinc-300
          hover:bg-zinc-100 dark:hover:bg-zinc-800
          border border-zinc-200 dark:border-zinc-700
          transition-all font-medium"
      >
        <LogIn className="w-4 h-4" />
        로그인
      </Link>
      <Link
        href="/signup"
        onClick={onClose}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg
          bg-zinc-900 dark:bg-white
          text-white dark:text-zinc-900
          hover:bg-zinc-800 dark:hover:bg-zinc-100
          transition-all font-medium shadow-sm"
      >
        <UserPlus className="w-4 h-4" />
        회원가입
      </Link>
    </motion.div>
  );
}
