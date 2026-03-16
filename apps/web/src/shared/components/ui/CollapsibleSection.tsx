'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/utils';

export interface CollapsibleSectionProps {
  /** 섹션 제목 */
  title: string;
  /** 제목 옆에 표시할 배지 (선택사항) */
  badge?: React.ReactNode;
  /** 초기 열림 상태 (기본값: true) */
  defaultOpen?: boolean;
  /** 열림 상태 외부 제어 */
  open?: boolean;
  /** 열림 상태 변경 콜백 */
  onOpenChange?: (open: boolean) => void;
  /** 자식 요소 */
  children: React.ReactNode;
  /** 추가 클래스명 */
  className?: string;
  /** 헤더 추가 클래스명 */
  headerClassName?: string;
  /** 컨텐츠 추가 클래스명 */
  contentClassName?: string;
  /** 헤더 우측 액션 버튼들 */
  headerActions?: React.ReactNode;
}

export function CollapsibleSection({
  title,
  badge,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
  headerClassName,
  contentClassName,
  headerActions,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);

  // controlled vs uncontrolled 처리
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleToggle = () => {
    const newValue = !isOpen;
    if (!isControlled) {
      setInternalOpen(newValue);
    }
    onOpenChange?.(newValue);
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden',
        className
      )}
    >
      {/* 헤더 */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3',
          'bg-slate-50 dark:bg-slate-800/50',
          'hover:bg-slate-100 dark:hover:bg-slate-800',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset',
          headerClassName
        )}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {/* 접기/펼치기 아이콘 */}
          <span className="text-slate-500 dark:text-slate-400">
            {isOpen ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </span>

          {/* 제목 */}
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>

          {/* 배지 */}
          {badge && <span className="ml-2">{badge}</span>}
        </div>

        {/* 헤더 액션 버튼 (클릭 이벤트 전파 방지) */}
        {headerActions && (
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {headerActions}
          </div>
        )}
      </button>

      {/* 컨텐츠 - CSS 트랜지션으로 애니메이션 */}
      <div
        className={cn(
          'grid transition-all duration-200 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className={cn('px-4 py-4', contentClassName)}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

CollapsibleSection.displayName = 'CollapsibleSection';
