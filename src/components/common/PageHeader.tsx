'use client';

import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * 페이지 헤더 컴포넌트
 * 아이콘 + 제목 + 설명 레이아웃을 통일된 스타일로 제공
 */
export function PageHeader({ icon: Icon, title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{title}</h2>
      </div>
      <p className="text-zinc-600 dark:text-zinc-400">{description}</p>
    </div>
  );
}
