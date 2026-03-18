'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import type { HighlightTarget } from './ProcessPlanChatbotTypes';

interface VisualGuideOverlayProps {
  targets: HighlightTarget[];
  onComplete?: () => void;
  autoAdvance?: boolean;
  autoAdvanceDelay?: number;
}

/**
 * 시각적 안내 오버레이 컴포넌트
 * UI 요소를 하이라이트하고 설명 툴팁을 표시합니다.
 */
export function VisualGuideOverlay({
  targets,
  onComplete,
  autoAdvance = false,
  autoAdvanceDelay = 3000,
}: VisualGuideOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 현재 타겟
  const currentTarget = targets[currentIndex];
  const hasMultipleTargets = targets.length > 1;

  // 요소 하이라이트 적용
  useEffect(() => {
    if (targets.length === 0) {
      removeAllHighlights();
      return;
    }

    // 기존 하이라이트 제거
    removeAllHighlights();

    // 모든 타겟 요소에 하이라이트 적용
    const elements: HTMLElement[] = [];
    targets.forEach((target, index) => {
      const element = document.querySelector(target.selector) as HTMLElement;
      if (element) {
        element.classList.add('process-plan-highlight');
        if (index === currentIndex) {
          element.classList.add('process-plan-highlight-active');
          // 현재 타겟으로 스크롤
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        elements.push(element);
      }
    });

    return () => {
      removeAllHighlights();
    };
  }, [targets, currentIndex]);

  // 자동 진행
  useEffect(() => {
    if (!autoAdvance || targets.length <= 1) return;

    const timer = setTimeout(() => {
      if (currentIndex < targets.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onComplete?.();
      }
    }, autoAdvanceDelay);

    return () => clearTimeout(timer);
  }, [autoAdvance, autoAdvanceDelay, currentIndex, targets.length, onComplete]);

  // 다음 타겟
  const handleNext = useCallback(() => {
    if (currentIndex < targets.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete?.();
    }
  }, [currentIndex, targets.length, onComplete]);

  // 이전 타겟
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // 닫기
  const handleClose = useCallback(() => {
    removeAllHighlights();
    onComplete?.();
  }, [onComplete]);

  if (targets.length === 0 || !currentTarget) {
    return null;
  }

  // 현재 타겟 요소의 위치 계산
  const element = document.querySelector(currentTarget.selector) as HTMLElement;
  const rect = element?.getBoundingClientRect();

  return (
    <>
      {/* 오버레이 배경 */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-30 bg-black/30 dark:bg-black/50 pointer-events-none"
        onClick={handleClose}
      />

      {/* 툴팁 - 요소를 찾지 못해도 fallback 툴팁 표시 */}
      {rect ? (
        <Tooltip
          target={currentTarget}
          rect={rect}
          currentIndex={currentIndex}
          totalCount={targets.length}
          hasMultipleTargets={hasMultipleTargets}
          onPrev={handlePrev}
          onNext={handleNext}
          onClose={handleClose}
        />
      ) : (
        <FallbackTooltip
          target={currentTarget}
          currentIndex={currentIndex}
          totalCount={targets.length}
          hasMultipleTargets={hasMultipleTargets}
          onPrev={handlePrev}
          onNext={handleNext}
          onClose={handleClose}
        />
      )}

      {/* 하이라이트 스타일 */}
      <style jsx global>{`
        .process-plan-highlight {
          position: relative;
          z-index: 35 !important;
          box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.3);
          border-radius: 4px;
          transition: box-shadow 0.3s ease;
        }

        .process-plan-highlight-active {
          box-shadow:
            0 0 0 4px rgba(6, 182, 212, 0.5),
            0 0 20px rgba(6, 182, 212, 0.3);
          animation: pulse-highlight 2s infinite;
        }

        @keyframes pulse-highlight {
          0%,
          100% {
            box-shadow:
              0 0 0 4px rgba(6, 182, 212, 0.5),
              0 0 20px rgba(6, 182, 212, 0.3);
          }
          50% {
            box-shadow:
              0 0 0 6px rgba(6, 182, 212, 0.4),
              0 0 30px rgba(6, 182, 212, 0.4);
          }
        }
      `}</style>
    </>
  );
}

/**
 * 툴팁 컴포넌트
 */
interface TooltipProps {
  target: HighlightTarget;
  rect: DOMRect;
  currentIndex: number;
  totalCount: number;
  hasMultipleTargets: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

function Tooltip({
  target,
  rect,
  currentIndex,
  totalCount,
  hasMultipleTargets,
  onPrev,
  onNext,
  onClose,
}: TooltipProps) {
  const position = target.position || 'top';

  // 툴팁 위치 계산
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 45,
    pointerEvents: 'auto',
  };

  const TOOLTIP_OFFSET = 12;
  const ARROW_SIZE = 8;

  switch (position) {
    case 'top':
      tooltipStyle.bottom = window.innerHeight - rect.top + TOOLTIP_OFFSET;
      tooltipStyle.left = rect.left + rect.width / 2;
      tooltipStyle.transform = 'translateX(-50%)';
      break;
    case 'bottom':
      tooltipStyle.top = rect.bottom + TOOLTIP_OFFSET;
      tooltipStyle.left = rect.left + rect.width / 2;
      tooltipStyle.transform = 'translateX(-50%)';
      break;
    case 'left':
      tooltipStyle.top = rect.top + rect.height / 2;
      tooltipStyle.right = window.innerWidth - rect.left + TOOLTIP_OFFSET;
      tooltipStyle.transform = 'translateY(-50%)';
      break;
    case 'right':
      tooltipStyle.top = rect.top + rect.height / 2;
      tooltipStyle.left = rect.right + TOOLTIP_OFFSET;
      tooltipStyle.transform = 'translateY(-50%)';
      break;
  }

  return (
    <div
      className="bg-cyan-600 dark:bg-cyan-700 text-white px-4 py-3 rounded-lg shadow-xl max-w-xs"
      style={tooltipStyle}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">{target.label}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6 text-white hover:bg-cyan-700 dark:hover:bg-cyan-800 -mr-1"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 설명 */}
      {target.description && <p className="text-sm opacity-90 mb-3">{target.description}</p>}

      {/* 네비게이션 (여러 타겟인 경우) */}
      {hasMultipleTargets && (
        <div className="flex items-center justify-between pt-2 border-t border-cyan-500/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="h-7 px-2 text-white hover:bg-cyan-700 dark:hover:bg-cyan-800 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs">이전</span>
          </Button>

          <span className="text-xs opacity-75">
            {currentIndex + 1} / {totalCount}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            className="h-7 px-2 text-white hover:bg-cyan-700 dark:hover:bg-cyan-800"
          >
            <span className="text-xs">{currentIndex === totalCount - 1 ? '완료' : '다음'}</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 화살표 */}
      <div
        className={`absolute w-0 h-0 border-[${ARROW_SIZE}px] border-transparent ${
          position === 'top'
            ? 'bottom-[-8px] left-1/2 -translate-x-1/2 border-t-cyan-600 dark:border-t-cyan-700'
            : position === 'bottom'
              ? 'top-[-8px] left-1/2 -translate-x-1/2 border-b-cyan-600 dark:border-b-cyan-700'
              : position === 'left'
                ? 'right-[-8px] top-1/2 -translate-y-1/2 border-l-cyan-600 dark:border-l-cyan-700'
                : 'left-[-8px] top-1/2 -translate-y-1/2 border-r-cyan-600 dark:border-r-cyan-700'
        }`}
        style={{
          borderWidth: ARROW_SIZE,
        }}
      />
    </div>
  );
}

/**
 * Fallback 툴팁 컴포넌트 (요소를 찾지 못한 경우)
 */
interface FallbackTooltipProps {
  target: HighlightTarget;
  currentIndex: number;
  totalCount: number;
  hasMultipleTargets: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

function FallbackTooltip({
  target,
  currentIndex,
  totalCount,
  hasMultipleTargets,
  onPrev,
  onNext,
  onClose,
}: FallbackTooltipProps) {
  return (
    <div
      className="bg-amber-600 dark:bg-amber-700 text-white px-4 py-3 rounded-lg shadow-xl max-w-xs"
      style={{
        position: 'fixed',
        zIndex: 45,
        pointerEvents: 'auto',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">{target.label}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6 text-white hover:bg-amber-700 dark:hover:bg-amber-800 -mr-1"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 설명 */}
      <p className="text-sm opacity-90 mb-2">{target.description}</p>
      <p className="text-xs opacity-75 mb-3">
        (현재 화면에서 해당 요소를 찾을 수 없습니다)
      </p>

      {/* 네비게이션 (여러 타겟인 경우) */}
      {hasMultipleTargets && (
        <div className="flex items-center justify-between pt-2 border-t border-amber-500/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="h-7 px-2 text-white hover:bg-amber-700 dark:hover:bg-amber-800 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs">이전</span>
          </Button>

          <span className="text-xs opacity-75">
            {currentIndex + 1} / {totalCount}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            className="h-7 px-2 text-white hover:bg-amber-700 dark:hover:bg-amber-800"
          >
            <span className="text-xs">{currentIndex === totalCount - 1 ? '완료' : '다음'}</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 단일 타겟인 경우 닫기 버튼 */}
      {!hasMultipleTargets && (
        <div className="flex justify-end pt-2 border-t border-amber-500/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 px-3 text-white hover:bg-amber-700 dark:hover:bg-amber-800"
          >
            <span className="text-xs">확인</span>
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * 모든 하이라이트 제거
 */
function removeAllHighlights(): void {
  const highlightedElements = document.querySelectorAll('.process-plan-highlight');
  highlightedElements.forEach(element => {
    element.classList.remove('process-plan-highlight');
    element.classList.remove('process-plan-highlight-active');
  });
}

/**
 * 단일 요소 하이라이트 (외부 사용)
 */
export function highlightElement(selector: string): HTMLElement | null {
  const element = document.querySelector(selector) as HTMLElement;
  if (!element) return null;

  element.classList.add('process-plan-highlight', 'process-plan-highlight-active');
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return element;
}

/**
 * 하이라이트 제거 (외부 사용)
 */
export function clearHighlights(): void {
  removeAllHighlights();
}
