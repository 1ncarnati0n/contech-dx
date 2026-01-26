'use client';

import type { ReactNode } from 'react';

interface ProcessPlanInputSectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * 공정계획 입력 섹션 컨테이너 컴포넌트
 * 입력 필드 그룹에 통일된 스타일 적용
 * - 배경: bg-zinc-50 (라이트) / bg-zinc-900 (다크)
 * - 테두리: 하단 border-b border-zinc-200 / border-zinc-800
 */
export function ProcessPlanInputSection({ children, className = '' }: ProcessPlanInputSectionProps) {
  return (
    <div
      className={`
        bg-zinc-50 dark:bg-zinc-900
        border-b border-zinc-200 dark:border-zinc-800
        rounded-t-lg
        p-4 mb-0
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {children}
    </div>
  );
}
