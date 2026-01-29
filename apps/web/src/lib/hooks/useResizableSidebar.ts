'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface Dimensions {
  width: number;
  height: number;
}

export interface ResizeConstraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

export type ResizeDirection = 'top' | 'left' | 'top-left';

interface UseResizableSidebarOptions {
  /** localStorage에 저장할 키 */
  storageKey?: string;
  /** 기본 크기 */
  defaultDimensions?: Dimensions;
  /** 크기 제약 */
  constraints?: Partial<ResizeConstraints>;
}

interface UseResizableSidebarReturn {
  /** 현재 크기 */
  dimensions: Dimensions;
  /** 리사이즈 중 여부 */
  isResizing: boolean;
  /** 현재 리사이즈 방향 */
  resizeDirection: ResizeDirection | null;
  /** 리사이즈 시작 핸들러 */
  startResize: (direction: ResizeDirection) => (e: React.MouseEvent) => void;
  /** 기본 크기로 복원 */
  resetToDefault: () => void;
}

const DEFAULT_DIMENSIONS: Dimensions = {
  width: 400,
  height: 600,
};

// 헤더 높이(4rem = 64px) + 하단 여백(16px) = 80px
const HEADER_AND_MARGIN = 80;

const DEFAULT_CONSTRAINTS: ResizeConstraints = {
  minWidth: 320,
  maxWidth: 800,
  minHeight: 400,
  maxHeight: typeof window !== 'undefined' ? window.innerHeight - HEADER_AND_MARGIN : 768,
};

/**
 * 사이드바 리사이즈 기능을 제공하는 커스텀 훅
 *
 * @example
 * const { dimensions, isResizing, startResize, resetToDefault } = useResizableSidebar({
 *   storageKey: 'chatbot-dimensions',
 *   defaultDimensions: { width: 400, height: 600 },
 * });
 */
export function useResizableSidebar(
  options: UseResizableSidebarOptions = {}
): UseResizableSidebarReturn {
  const {
    storageKey = 'chatbot-sidebar-dimensions',
    defaultDimensions = DEFAULT_DIMENSIONS,
    constraints: customConstraints = {},
  } = options;

  const constraints: ResizeConstraints = {
    ...DEFAULT_CONSTRAINTS,
    ...customConstraints,
  };

  // 초기 크기를 localStorage에서 불러오기
  const getInitialDimensions = (): Dimensions => {
    if (typeof window === 'undefined') return defaultDimensions;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Dimensions;
        return {
          width: clamp(parsed.width, constraints.minWidth, constraints.maxWidth),
          height: clamp(parsed.height, constraints.minHeight, constraints.maxHeight),
        };
      }
    } catch {
      // localStorage 접근 실패 시 기본값 사용
    }
    return defaultDimensions;
  };

  const [dimensions, setDimensions] = useState<Dimensions>(getInitialDimensions);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null);

  // 리사이즈 시작 시점의 정보 저장
  const resizeStartRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    direction: ResizeDirection;
  } | null>(null);

  // 크기 제약 업데이트 (화면 크기 변경 시)
  useEffect(() => {
    const handleWindowResize = () => {
      constraints.maxHeight = window.innerHeight - HEADER_AND_MARGIN;
      setDimensions(prev => ({
        width: clamp(prev.width, constraints.minWidth, constraints.maxWidth),
        height: clamp(prev.height, constraints.minHeight, constraints.maxHeight),
      }));
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [constraints]);

  // localStorage에 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(dimensions));
    } catch {
      // localStorage 저장 실패 무시
    }
  }, [dimensions, storageKey]);

  // 리사이즈 시작
  const startResize = useCallback(
    (direction: ResizeDirection) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      resizeStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: dimensions.width,
        startHeight: dimensions.height,
        direction,
      };

      setIsResizing(true);
      setResizeDirection(direction);
    },
    [dimensions]
  );

  // 마우스 이동 핸들러
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current) return;

      const { startX, startY, startWidth, startHeight, direction } = resizeStartRef.current;

      let newWidth = startWidth;
      let newHeight = startHeight;

      // 좌측 드래그: 왼쪽으로 이동하면 너비 증가
      if (direction === 'left' || direction === 'top-left') {
        const deltaX = startX - e.clientX;
        newWidth = clamp(startWidth + deltaX, constraints.minWidth, constraints.maxWidth);
      }

      // 상단 드래그: 위로 이동하면 높이 증가
      if (direction === 'top' || direction === 'top-left') {
        const deltaY = startY - e.clientY;
        newHeight = clamp(startHeight + deltaY, constraints.minHeight, constraints.maxHeight);
      }

      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
      resizeStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, constraints]);

  // 기본 크기로 복원
  const resetToDefault = useCallback(() => {
    setDimensions(defaultDimensions);
  }, [defaultDimensions]);

  return {
    dimensions,
    isResizing,
    resizeDirection,
    startResize,
    resetToDefault,
  };
}

/**
 * 값을 min과 max 사이로 제한
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
