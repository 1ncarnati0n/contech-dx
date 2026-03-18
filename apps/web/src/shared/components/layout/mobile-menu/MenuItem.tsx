'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import type { MenuItem as MenuItemType } from './menuData';

interface MenuItemProps {
  item: MenuItemType;
  index: number;
  onClose: () => void;
}

export default function MenuItem({ item, index, onClose }: MenuItemProps) {
  const pathname = usePathname();

  // 현재 경로와 메뉴 아이템의 href 비교하여 활성 상태 판단
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const isAdmin = item.isAdmin;

  const Icon = item.icon;

  // 활성 상태에 따른 스타일
  const baseStyles = 'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors';

  const activeStyles = isAdmin
    ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
    : 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300';

  const inactiveStyles = isAdmin
    ? 'text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20'
    : 'text-zinc-700 dark:text-zinc-300 hover:bg-accent-50 dark:hover:bg-accent-900/20 hover:text-accent-700 dark:hover:text-accent-300';

  // 좌측 인디케이터 바 색상
  const indicatorColor = isAdmin
    ? 'bg-orange-500 dark:bg-orange-400'
    : 'bg-accent-500 dark:bg-accent-400';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.2,
        delay: index * 0.05,
        ease: 'easeOut'
      }}
    >
      <Link
        href={item.href}
        onClick={onClose}
        className={`${baseStyles} ${isActive ? activeStyles : inactiveStyles}`}
      >
        {/* 활성 상태 인디케이터 바 */}
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full ${indicatorColor}`}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}

        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="font-medium">{item.label}</span>

        {/* 활성 상태 점 표시 */}
        {isActive && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`ml-auto w-2 h-2 rounded-full ${indicatorColor}`}
          />
        )}
      </Link>
    </motion.div>
  );
}
