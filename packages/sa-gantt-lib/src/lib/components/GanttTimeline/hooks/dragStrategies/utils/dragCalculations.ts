// ============================================
// 드래그 기본 계산 유틸리티
// ============================================

import type { DragType } from '../../../types';

/**
 * 드래그 방향 계산
 */
export const calculateDragDirection = (deltaX: number): 'left' | 'right' => {
    return deltaX < 0 ? 'left' : 'right';
};

/**
 * Delta Days 계산 (픽셀 → 일수)
 */
export const calculateDeltaDays = (deltaX: number, pixelsPerDay: number): number => {
    return Math.round(deltaX / pixelsPerDay);
};

/**
 * DragType에 따른 커서 스타일 결정
 */
export const getDragCursor = (dragType: DragType): 'grabbing' | 'ew-resize' | 'col-resize' => {
    if (dragType === 'move' || dragType === 'move-net') {
        return 'grabbing';
    }
    if (dragType === 'resize-pre-net' || dragType === 'resize-net-post') {
        return 'col-resize';
    }
    return 'ew-resize';
};

/**
 * 드래그 이벤트 리스너 등록
 * @returns cleanup 함수
 */
export const setupDragListeners = (
    onMove: (e: MouseEvent) => void,
    onUp: () => void,
    cursor: 'grabbing' | 'ew-resize' | 'col-resize' = 'grabbing'
): (() => void) => {
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = cursor;
    document.body.style.userSelect = 'none';

    return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };
};
